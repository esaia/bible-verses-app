import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Per-route title, description and canonical URL.
 *
 * `public/index.html` is served for every path (see `public/_redirects`), so
 * without this every route would share the home page's tags — one title in a
 * search result, one preview when a link is shared. Crawlers run the page's
 * JavaScript before reading its head, so rewriting the tags here is enough;
 * the static tags stay as the fallback for anything that does not.
 *
 * The three output surfaces are marked `noindex`: the projector canvas, the
 * OBS browser source and the operator console are all driven by another window
 * and say nothing on their own. `robots.txt` disallows them too — the tag is
 * what removes any of them that were indexed before.
 */

export const SITE_URL = 'https://bibleversesgeo.netlify.app';

const SITE_NAME = 'Bible Presenter';

const HOME = {
  title: `${SITE_NAME} — Georgian, English and Russian verses on the projector`,
  description:
    'Put a Bible verse on the projector in Georgian, English and Russian at once. Pick book, chapter and verse on ' +
    'one screen, press Show, and the second screen follows — plus lyrics, a stream lower third, and 20 backgrounds. ' +
    'Free, no sign-up.',
};

const PAGES = {
  '/': HOME,
  '/bible': {
    title: `Read a chapter — ${SITE_NAME}`,
    description:
      'Read a whole chapter in Georgian, English or Russian, in any of the translations the projector can show.',
  },
  '/doc': {
    title: `How to run a service with it — ${SITE_NAME}`,
    description:
      'Setting up the operator window and the projector window, choosing translations, and what the green and blue ' +
      'checkboxes do. In Georgian and English.',
  },
  '/donation': {
    title: `Support the project — ${SITE_NAME}`,
    description: 'Bible Presenter is free. If it helps your church, here is how to help keep it running.',
  },
  '/show': { title: `Projector — ${SITE_NAME}`, noindex: true },
  '/lower3rd': { title: `Lower third — ${SITE_NAME}`, noindex: true },
  '/studio': { title: `Studio — ${SITE_NAME}`, noindex: true },
};

/** Find (or create) a tag in `head` and set one of its attributes. */
const setTag = (selector, create, attribute, value) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  element.setAttribute(attribute, value);

  return element;
};

const setMeta = (name, content) =>
  setTag(`meta[name="${name}"]`, () => Object.assign(document.createElement('meta'), { name }), 'content', content);

const setProperty = (property, content) =>
  setTag(
    `meta[property="${property}"]`,
    () => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', property);

      return meta;
    },
    'content',
    content,
  );

const useSeo = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Trailing slashes and unknown paths both fall back to the home page's
    // tags rather than leaving whatever the last route set.
    const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
    const page = PAGES[key] || HOME;
    const description = page.description || HOME.description;
    const url = `${SITE_URL}${key === '/' ? '/' : key}`;

    document.title = page.title;
    setMeta('description', description);
    setMeta('robots', page.noindex ? 'noindex, nofollow' : 'index, follow');
    setTag(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      'href',
      url,
    );

    setProperty('og:title', page.title);
    setProperty('og:description', description);
    setProperty('og:url', url);
  }, [pathname]);
};

export default useSeo;
