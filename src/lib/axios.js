import axios from 'axios';

/**
 * Verse text used to come straight from holybible.ge to the browser, which
 * made a slow or unreachable third party a slow or unreachable service, live,
 * with nothing to be done about it. It now comes through the Worker in
 * `relay/`, which caches at Cloudflare's edge — the same chapter is served in
 * roughly a fifth of the time, and keeps being served if the origin stops
 * answering.
 *
 * The proxy is an optimisation, not a dependency. Anything wrong with it — a
 * bad deploy, an outage, the daily free-plan limit — falls straight back to
 * the original URL rather than taking verse lookup down with it.
 */
const PROXY_URL = process.env.REACT_APP_BIBLE_PROXY || 'https://mybible-relay.esaiagafrindashvili.workers.dev/bible';

const DIRECT_URL = process.env.REACT_APP_BASE_URL;

/** Long enough for a cold cache miss, short enough not to stall a service. */
const PROXY_TIMEOUT_MS = 8000;

export const fetchData = async params => {
  if (PROXY_URL) {
    try {
      const { data } = await axios.get(PROXY_URL, { params, timeout: PROXY_TIMEOUT_MS });

      return data;
    } catch (e) {
      // Fall through to the origin.
    }
  }

  const { data } = await axios.get(DIRECT_URL, { params });

  return data;
};
