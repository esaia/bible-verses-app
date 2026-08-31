import OBSWebSocket from 'obs-websocket-js';

/**
 * Bridge from the studio console to a Browser Source running inside OBS.
 *
 * `/show` reaches the projector through `localStorage` + the `storage` event,
 * which works because both tabs are the same browser profile. OBS is not: its
 * Browser Source is a separate CEF process with its own storage, so it never
 * sees anything the console writes and the projector transport cannot be
 * reused.
 *
 * The way across is OBS itself. obs-websocket ships inside OBS 28+ (no plugin
 * to install), and the `obs-browser` vendor exposes an `emit_event` request
 * that fires a JavaScript CustomEvent into every running Browser Source. So
 * the console connects to OBS and asks OBS to hand the slide to the page:
 *
 *   console --ws--> OBS (localhost:4455) --emit_event--> /lower3rd
 *
 * Nothing is hosted, nothing is polled, and the Browser Source is never
 * reloaded — so the lower third can animate between slides.
 *
 * One constraint shapes the setup: an HTTPS page may not open a `ws://`
 * connection, and obs-websocket speaks only plain `ws://`. The console must
 * therefore be served over http (localhost) to drive OBS. The lower third
 * itself only *receives*, so it can be loaded from the deployed HTTPS site.
 */

/** Name of the CustomEvent `/lower3rd` listens for on `window`. */
export const OBS_EVENT = 'mybibleLowerThird';

const SETTINGS_KEY = 'obsBridge';

export const DEFAULT_OBS_SETTINGS = { enabled: false, url: 'ws://127.0.0.1:4455', password: '' };

/** How long to wait before dialling again after a failed or dropped connect. */
const RETRY_MS = 4000;

/**
 * Re-send the current slide on a timer. A Browser Source that starts, reloads
 * or un-hides after the last push would otherwise stay blank until the
 * operator advanced a verse; re-emitting makes it self-healing. The receiver
 * ignores a payload identical to the one it is already showing, so this costs
 * nothing visually and never restarts a transition.
 */
const HEARTBEAT_MS = 3000;

export const readObsSettings = () => {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw === null ? DEFAULT_OBS_SETTINGS : { ...DEFAULT_OBS_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_OBS_SETTINGS;
  }
};

let settings = readObsSettings();
let obs = null;
let status = settings.enabled ? 'connecting' : 'idle';
let error = '';
let payload = null;
let retryTimer = null;
let heartbeatTimer = null;

// Outcome of the last emit_event. A healthy socket that rejects every vendor
// request looks identical to a working bridge from the outside, so the result
// is surfaced rather than swallowed.
let sent = 0;
let emitError = '';

const listeners = new Set();

let state = { ...settings, status, error, sent, emitError };

const publishState = () => {
  state = { ...settings, status, error, sent, emitError };
  listeners.forEach(listener => listener());
};

export const getObsState = () => state;

export const subscribeObs = listener => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const clearTimers = () => {
  clearTimeout(retryTimer);
  clearInterval(heartbeatTimer);
  retryTimer = null;
  heartbeatTimer = null;
};

/** Hand the current slide to every Browser Source. Silent when not connected. */
const emit = () => {
  if (status !== 'connected' || !obs || !payload) {
    return;
  }

  obs
    .call('CallVendorRequest', {
      vendorName: 'obs-browser',
      requestType: 'emit_event',
      // Sent as one JSON string rather than a nested object. OBS marshals
      // vendor-request data through its own `obs_data_t` structures on the way
      // to the Browser Source, and that round trip does not faithfully carry
      // arrays of objects: the array survives with its length intact while the
      // fields inside the elements are dropped, so the page receives the right
      // number of verses with no text in them. A string passes through whole.
      requestData: { event_name: OBS_EVENT, event_data: { json: JSON.stringify(payload) } },
    })
    .then(() => {
      sent += 1;

      if (emitError) {
        emitError = '';
      }

      publishState();
    })
    .catch(e => {
      // A request can lose the race with a closing socket, but a *persistent*
      // rejection means OBS is refusing the vendor request — usually no
      // Browser Source exists yet — and that is worth showing the operator.
      emitError = e?.message || 'OBS rejected emit_event';
      publishState();
    });
};

const connect = async () => {
  if (!settings.enabled || obs) {
    return;
  }

  obs = new OBSWebSocket();
  status = 'connecting';
  error = '';
  publishState();

  // A drop is not a failure to report: OBS being closed between services is
  // the normal case, so the bridge just keeps dialling until it answers.
  obs.on('ConnectionClosed', () => {
    obs = null;
    clearTimers();

    if (settings.enabled) {
      status = 'connecting';
      publishState();
      retryTimer = setTimeout(connect, RETRY_MS);
    }
  });

  try {
    // An empty field falls back to the default rather than failing: clearing
    // the box by accident should not strand the operator with no way back
    // other than knowing the address by heart.
    await obs.connect(settings.url || DEFAULT_OBS_SETTINGS.url, settings.password || undefined);

    status = 'connected';
    error = '';
    publishState();

    emit();
    heartbeatTimer = setInterval(emit, HEARTBEAT_MS);
  } catch (e) {
    // `connect` rejecting does not always fire ConnectionClosed, so this path
    // schedules its own retry.
    obs = null;
    status = 'error';
    error = e?.message || 'Could not reach OBS';
    publishState();

    retryTimer = setTimeout(() => {
      status = 'connecting';
      publishState();
      connect();
    }, RETRY_MS);
  }
};

const disconnect = () => {
  clearTimers();

  const current = obs;
  obs = null;
  status = 'idle';
  error = '';

  // Detach first: the close handler would otherwise read `enabled` and start
  // dialling again the moment we deliberately hung up.
  current?.removeAllListeners?.();
  current?.disconnect?.().catch(() => {});

  publishState();
};

/** Apply new connection settings, reconnecting only when they actually moved. */
export const configureObs = next => {
  const previous = settings;
  settings = { ...settings, ...next };

  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    // Quota exceeded — the bridge still works for this session.
  }

  const changed =
    previous.url !== settings.url || previous.password !== settings.password || previous.enabled !== settings.enabled;

  if (!changed) {
    publishState();
    return;
  }

  disconnect();

  if (settings.enabled) {
    connect();
  }
};

/** Set the slide OBS should be showing, and send it immediately. */
export const pushObs = next => {
  payload = next;
  emit();
};

if (settings.enabled) {
  connect();
}
