/**
 * Peer-to-peer transfer of the operator's own backgrounds.
 *
 * A picture the operator drags in lives in this browser's IndexedDB and
 * nowhere else — there is no server to upload it to, which is the same reason
 * the music library keeps its files locally. That is fine while the projector
 * is a second tab on the same machine, and useless the moment `/show` is a
 * different computer: it has never seen the file and cannot be handed a blob
 * URL, which dies with the document that minted it.
 *
 * So the console serves the file directly. `/show` asks over the relay, the
 * two negotiate a WebRTC data channel, and a few megabytes of JPEG travel
 * across the room's LAN rather than through a Worker sized for a few kB of
 * verse text.
 *
 * The relay is only the switchboard. It carries offers, answers and ICE
 * candidates — which it never stores — and the picture itself never touches
 * it.
 */

import { PEER_ID, onRelayMessage, sendSignal } from './relay';

/**
 * Google's public STUN, for the case where the two machines are on different
 * networks. On one church LAN the host candidates match and it is never
 * needed. There is deliberately no TURN: relaying media through a third party
 * is what this is avoiding, and a projector unreachable even by STUN is a
 * network problem worth seeing rather than papering over.
 */
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

/** SCTP delivers a message whole; 16kB is the size every implementation takes. */
const CHUNK = 16 * 1024;

/** Pause above this much queued, resume at half — keeps memory flat on a big file. */
const BUFFER_HIGH = 512 * 1024;

/** Long enough for a handshake plus a slow first chunk, short enough to retry. */
const TIMEOUT_MS = 25000;

const peerConnection = () => new RTCPeerConnection({ iceServers: ICE_SERVERS });

const drain = channel =>
  new Promise(resolve => {
    channel.bufferedAmountLowThreshold = BUFFER_HIGH / 2;

    const done = () => {
      channel.removeEventListener('bufferedamountlow', done);
      resolve();
    };

    channel.addEventListener('bufferedamountlow', done);
  });

/** Metadata first so the receiver knows what it is assembling, then the bytes. */
const sendFile = async (channel, record) => {
  const buffer = await record.file.arrayBuffer();

  channel.send(
    JSON.stringify({ meta: { id: record.id, name: record.name, type: record.type, size: buffer.byteLength } }),
  );

  for (let offset = 0; offset < buffer.byteLength; offset += CHUNK) {
    if (channel.readyState !== 'open') {
      return;
    }

    if (channel.bufferedAmount > BUFFER_HIGH) {
      // eslint-disable-next-line no-await-in-loop
      await drain(channel);
    }

    channel.send(buffer.slice(offset, offset + CHUNK));
  }

  if (channel.readyState === 'open') {
    channel.send(JSON.stringify({ done: record.id }));
  }
};

/**
 * The console side: answer whoever asks for a file this machine holds.
 *
 * `resolve` is handed an id and returns the stored record, or nothing when
 * this console does not have it — which is the ordinary case when two consoles
 * share a room and only one of them owns the picture.
 */
export const serveAssets = resolve => {
  const sessions = new Map();

  const close = session => {
    const open = sessions.get(session);

    if (open) {
      try {
        open.pc.close();
      } catch (e) {
        // Already gone.
      }

      sessions.delete(session);
    }
  };

  const wire = channel => {
    channel.binaryType = 'arraybuffer';

    channel.onmessage = async event => {
      let request;

      try {
        request = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (!request?.req) {
        return;
      }

      let record;

      try {
        record = await resolve(request.req);
      } catch (e) {
        record = null;
      }

      if (channel.readyState !== 'open') {
        return;
      }

      if (!record?.file) {
        channel.send(JSON.stringify({ error: 'not here', id: request.req }));
        return;
      }

      try {
        await sendFile(channel, record);
      } catch (e) {
        if (channel.readyState === 'open') {
          channel.send(JSON.stringify({ error: 'could not read the file', id: request.req }));
        }
      }
    };
  };

  const off = onRelayMessage(async payload => {
    if (payload?.type !== 'signal' || payload.from !== 'show' || !payload.session) {
      return;
    }

    const { session } = payload;

    if (payload.offer) {
      if (sessions.has(session)) {
        return;
      }

      const pc = peerConnection();
      sessions.set(session, { pc, pending: [] });

      pc.onicecandidate = event => {
        if (event.candidate) {
          sendSignal({ session, from: 'console', host: PEER_ID, candidate: event.candidate.toJSON() });
        }
      };

      pc.ondatachannel = event => wire(event.channel);

      pc.onconnectionstatechange = () => {
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
          close(session);
        }
      };

      try {
        await pc.setRemoteDescription(payload.offer);
        await pc.setLocalDescription(await pc.createAnswer());

        sendSignal({ session, from: 'console', host: PEER_ID, answer: pc.localDescription });

        const open = sessions.get(session);

        if (open) {
          open.pending.forEach(candidate => pc.addIceCandidate(candidate).catch(() => {}));
          open.pending = [];
        }
      } catch (e) {
        close(session);
      }

      return;
    }

    if (payload.candidate) {
      const open = sessions.get(session);

      if (!open) {
        return;
      }

      // Candidates outrun the answer often enough to matter; one added before
      // the remote description exists is simply thrown away by the browser.
      if (open.pc.remoteDescription && open.pc.localDescription) {
        open.pc.addIceCandidate(payload.candidate).catch(() => {});
      } else {
        open.pending.push(payload.candidate);
      }
    }
  });

  return () => {
    [...sessions.keys()].forEach(close);
    off();
  };
};

/**
 * The projector side: fetch one background by id from whichever console in the
 * room has it. Resolves with a `Blob` and the metadata that came with it.
 *
 * A room can hold two consoles — the desk machine and a phone — and both will
 * answer. The first answer wins and the loser's candidates are ignored, rather
 * than two half-open connections fighting over one channel.
 */
export const requestAsset = (id, { timeout = TIMEOUT_MS } = {}) =>
  new Promise((resolve, reject) => {
    const session = `${PEER_ID}-${Math.random().toString(36).slice(2, 8)}`;
    const pc = peerConnection();
    const channel = pc.createDataChannel('assets');

    channel.binaryType = 'arraybuffer';

    let host = null;
    let meta = null;
    let pending = [];
    const chunks = [];
    let settled = false;

    const finish = (error, value) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      off();

      try {
        pc.close();
      } catch (e) {
        // Already gone.
      }

      if (error) {
        reject(error);
      } else {
        resolve(value);
      }
    };

    const timer = setTimeout(() => finish(new Error('no console answered')), timeout);

    pc.onicecandidate = event => {
      if (event.candidate) {
        sendSignal({ session, from: 'show', candidate: event.candidate.toJSON() });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        finish(new Error('could not reach the console'));
      }
    };

    channel.onopen = () => channel.send(JSON.stringify({ req: id }));

    channel.onmessage = event => {
      if (typeof event.data !== 'string') {
        chunks.push(event.data);
        return;
      }

      let message;

      try {
        message = JSON.parse(event.data);
      } catch (e) {
        return;
      }

      if (message.error) {
        finish(new Error(message.error));
        return;
      }

      if (message.meta) {
        meta = message.meta;
        return;
      }

      if (message.done) {
        finish(null, { ...meta, file: new Blob(chunks, { type: meta?.type || 'image/jpeg' }) });
      }
    };

    const off = onRelayMessage(payload => {
      if (payload?.type !== 'signal' || payload.from !== 'console' || payload.session !== session) {
        return;
      }

      if (payload.answer) {
        if (host) {
          return;
        }

        host = payload.host;

        pc.setRemoteDescription(payload.answer)
          .then(() => {
            pending.forEach(candidate => pc.addIceCandidate(candidate).catch(() => {}));
            pending = [];
          })
          .catch(() => finish(new Error('handshake failed')));

        return;
      }

      if (payload.candidate) {
        if (host && payload.host !== host) {
          return;
        }

        if (pc.remoteDescription) {
          pc.addIceCandidate(payload.candidate).catch(() => {});
        } else {
          pending.push(payload.candidate);
        }
      }
    });

    pc.createOffer()
      .then(offer => pc.setLocalDescription(offer))
      .then(() => sendSignal({ session, from: 'show', offer: pc.localDescription }))
      .catch(() => finish(new Error('could not open a connection')));
  });
