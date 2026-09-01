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
let retryTimer = null;
let retryMs = RETRY_MIN_MS;

// The last thing the console asked to publish. Held so a push that happens
// while the socket is down is not simply lost: it is sent on connect, which is
// also what makes a relay that comes back mid-service catch up on its own.
let pending = null;

let status = 'idle';
let error = '';

const messageListeners = new Set();
const stateListeners = new Set();

let state = { status, error, room: null, configured: relayConfigured };

const publishState = () => {
  state = { status, error, room, configured: relayConfigured };
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

  socket = new WebSocket(`${RELAY_URL.replace(/\/+$/, '')}/${room}`);

  socket.onopen = () => {
    status = 'connected';
    error = '';
    retryMs = RETRY_MIN_MS;
    publishState();

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

    messageListeners.forEach(listener => listener(payload));
  };

  socket.onerror = () => {
    error = 'Could not reach the relay';
  };

  socket.onclose = () => {
    socket = null;

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
 * Join a room. Safe to call repeatedly with the same room — the socket is
 * shared, so the console publishing and a `/show` tab subscribing in the same
 * browser use one connection.
 */
export const startRelay = nextRoom => {
  if (!relayConfigured || !validRoom(nextRoom) || nextRoom === room) {
    return;
  }

  stopRelay();
  room = nextRoom;
  open();
};

export const stopRelay = () => {
  clearTimeout(retryTimer);
  retryTimer = null;
  room = null;
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

/** Called by the console. Queued when the socket is down, sent on connect. */
export const publishRelay = payload => {
  pending = payload;

  if (relayConfigured && room) {
    send(payload);
  }
};
