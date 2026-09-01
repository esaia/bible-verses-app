/**
 * Client half of the slide relay (see `relay/src/index.js`).
 *
 * The console publishes the live slide; `/show` and `/lower3rd` subscribe to
 * it. All three open the same socket to the same room, so which device or
 * network each one is on stops mattering — which is the whole point, since
 * `localStorage` only ever reached another tab in the same browser and
 * obs-websocket only ever reached OBS on the same machine.
 *
 * This is *additive*. The console still writes `showData` and still pushes to
 * the OBS bridge, so a setup that works today keeps working with the relay
 * switched off or unreachable.
 */

/**
 * Where the relay lives. Baked in so a church configures nothing at all; the
 * environment variable is for anyone self-hosting their own Worker.
 */
const CONFIGURED_URL = process.env.REACT_APP_RELAY_URL || '';

/** The relay deployed from `relay/`, so a church configures nothing at all. */
const DEFAULT_URL = 'wss://mybible-relay.esaiagafrindashvili.workers.dev';

export const RELAY_URL = CONFIGURED_URL || DEFAULT_URL;

/** No relay deployed yet: every entry point below turns into a no-op. */
export const relayConfigured = Boolean(RELAY_URL);

const ROOM_KEY = 'relayRoom';
const ROOM_PATTERN = /^[a-z0-9]{8,64}$/;

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const ROOM_LENGTH = 16;

/** Reconnect delay, doubling to a ceiling so a long outage stops hammering. */
const RETRY_MIN_MS = 1000;
const RETRY_MAX_MS = 15000;

/**
 * Keepalive. A tab that navigates away or a Browser Source whose process dies
 * sends no close frame, so the room would go on listing it; this is how it
 * finds out. The relay answers these itself without waking the room, so they
 * are cheap. Comfortably inside the relay's staleness window.
 */
const PING_MS = 25000;

/**
 * 36^16 is about 8e24 codes. Collision between two churches is not a practical
 * concern, but the code does gate access to a room, so it is generated from
 * the CSPRNG rather than from `Math.random`.
 */
export const newRoom = () => {
  const bytes = new Uint8Array(ROOM_LENGTH);
  crypto.getRandomValues(bytes);

  return [...bytes].map(byte => ALPHABET[byte % ALPHABET.length]).join('');
};

export const validRoom = value => typeof value === 'string' && ROOM_PATTERN.test(value);

/**
 * Who this page is, for the length of one document. WebRTC handshakes are
 * broadcast to the whole room — the relay has no notion of addressing — so
 * both ends need something to tell "mine" from "someone else's" by.
 */
export const PEER_ID = `${Math.random().toString(36).slice(2, 10)}`;

/**
 * The room this page belongs to. `?room=` wins, so one link carries a phone,
 * a projector window or a Browser Source into the right room without anything
 * being typed; otherwise it is whatever this browser saved.
 */
export const readRoom = () => {
  const fromUrl = new URLSearchParams(window.location.search).get('room');

  if (validRoom(fromUrl)) {
    return fromUrl;
  }

  try {
    const saved = localStorage.getItem(ROOM_KEY);
    return validRoom(saved) ? saved : null;
  } catch (e) {
    return null;
  }
};

export const writeRoom = room => {
  try {
    localStorage.setItem(ROOM_KEY, room);
  } catch (e) {
    // Quota or private mode; the room still works for this session.
  }
};

/** The console's room, created on first use so nothing has to be set up. */
export const ensureRoom = () => {
  const existing = readRoom();

  if (existing) {
    return existing;
  }

  const room = newRoom();
  writeRoom(room);

  return room;
};

let socket = null;
let room = null;
let role = 'console';
let retryTimer = null;
let retryMs = RETRY_MIN_MS;
let pingTimer = null;

// The last thing the console asked to publish. Held so a push that happens
// while the socket is down is not simply lost: it is sent on connect, which is
// also what makes a relay that comes back mid-service catch up on its own.
let pending = null;

let status = 'idle';
let error = '';

const messageListeners = new Set();
const stateListeners = new Set();

// Who else is in the room, as counts per role. The console shows it, because
// "is the Browser Source actually connected?" was otherwise unanswerable
// without going and looking at OBS.
let peers = {};

let state = { status, error, room: null, configured: relayConfigured, peers };

const publishState = () => {
  state = { status, error, room, configured: relayConfigured, peers };
  stateListeners.forEach(listener => listener());
};

export const getRelayState = () => state;

export const subscribeRelayState = listener => {
  stateListeners.add(listener);
  return () => stateListeners.delete(listener);
};

const send = payload => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    return false;
  }

  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch (e) {
    return false;
  }
};

const open = () => {
  clearTimeout(retryTimer);

  if (!relayConfigured || !room) {
    return;
  }

  status = 'connecting';
  publishState();

  socket = new WebSocket(`${RELAY_URL.replace(/\/+$/, '')}/${room}?role=${role}`);

  socket.onopen = () => {
    status = 'connected';
    error = '';
    retryMs = RETRY_MIN_MS;
    publishState();

    clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        try {
          socket.send('ping');
        } catch (e) {
          // The close handler will pick this up.
        }
      }
    }, PING_MS);

    if (pending) {
      send(pending);
    }
  };

  socket.onmessage = event => {
    let payload;

    try {
      payload = JSON.parse(event.data);
    } catch (e) {
      return;
    }

    // Presence is about the room, not about what is on screen, so it updates
    // state rather than reaching the slide listeners.
    if (payload?.type === 'presence') {
      peers = payload.roles || {};
      publishState();
      return;
    }

    messageListeners.forEach(listener => listener(payload));
  };

  socket.onerror = () => {
    error = 'Could not reach the relay';
  };

  socket.onclose = () => {
    socket = null;
    peers = {};
    clearInterval(pingTimer);
    pingTimer = null;

    if (!room) {
      status = 'idle';
      publishState();
      return;
    }

    status = 'connecting';
    publishState();

    retryTimer = setTimeout(open, retryMs);
    retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
  };
};

/**
 * Join a room as `console`, `show` or `lower3rd`. Safe to call repeatedly with
 * the same room — the socket is shared, so the console publishing and a
 * `/show` tab subscribing in the same browser use one connection.
 */
export const startRelay = (nextRoom, nextRole = 'console') => {
  if (!relayConfigured || !validRoom(nextRoom) || nextRoom === room) {
    return;
  }

  stopRelay();
  room = nextRoom;
  role = nextRole;
  open();
};

export const stopRelay = () => {
  clearTimeout(retryTimer);
  clearInterval(pingTimer);
  retryTimer = null;
  pingTimer = null;
  room = null;
  peers = {};
  retryMs = RETRY_MIN_MS;

  const current = socket;
  socket = null;

  if (current) {
    current.onclose = null;
    current.onmessage = null;
    current.onerror = null;

    try {
      current.close();
    } catch (e) {
      // Already closing.
    }
  }

  status = 'idle';
  publishState();
};

/** Called by `/show` and `/lower3rd`; returns an unsubscribe. */
export const onRelayMessage = listener => {
  messageListeners.add(listener);
  return () => messageListeners.delete(listener);
};

/**
 * Take an incoming payload as the current one without sending it back. A
 * console that has adopted another console's slide must not resend its own
 * stale one when the socket next reconnects.
 */
export const adoptRelay = payload => {
  pending = payload;
};

/**
 * WebRTC signalling: offers, answers and ICE candidates for the data channel
 * that carries the operator's own background images.
 *
 * Unlike a slide this is never queued or stored. A handshake is only
 * meaningful to a peer that is negotiating right now, so one that misses the
 * socket is simply retried by whoever wanted the picture.
 */
export const sendSignal = payload => send({ ...payload, type: 'signal' });

/** Called by the console. Queued when the socket is down, sent on connect. */
export const publishRelay = payload => {
  pending = payload;

  if (relayConfigured && room) {
    send(payload);
  }
};
