import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import pageMeta from '../data/pageMeta.json';

/**
 * Per-route title, description, canonical and share card.
 *
 * `public/index.html` is served for every path (see `public/_redirects`), so
 * without this every route would share the home page's tags. Crawlers that run
 * JavaScript — Google among them — read what this sets.
 *
 * The ones that do not run JavaScript are exactly the ones that draw link
 * previews, so `scripts/prerender-meta.js` writes a static copy of each route
 * at build time with the same tags baked in. Both read `data/pageMeta.json`,
 * so the two paths cannot drift apart.
 */

const { site, pages } = pageMeta;

export const SITE_URL = site.url;

/** Trailing slashes and unknown paths both fall back to the home page. */
export const metaFor = pathname => {
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/';
  const page = pages[key] || pages['/'];

  return {
    path: key in pages ? key : '/',
    title: page.title,
    shareTitle: page.shareTitle || page.title,
    description: page.description || pages['/'].description,
    image: `${site.url}${page.image || site.image}`,
    imageAlt: page.imageAlt || site.imageAlt,
    robots: page.noindex ? 'noindex, nofollow' : 'index, follow',
  };
};

/** Find (or create) a tag in `head` and set one of its attributes. */
const setTag = (selector, create, attribute, value) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  element.setAttribute(attribute, value);
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
    const meta = metaFor(pathname);
    const url = `${SITE_URL}${meta.path}`;

    document.title = meta.title;
    setMeta('description', meta.description);
    setMeta('robots', meta.robots);
    setTag(
      'link[rel="canonical"]',
      () => Object.assign(document.createElement('link'), { rel: 'canonical' }),
      'href',
      url,
    );

    setProperty('og:title', meta.shareTitle);
    setProperty('og:description', meta.description);
    setProperty('og:url', url);
    setProperty('og:image', meta.image);
    setProperty('og:image:alt', meta.imageAlt);

    setMeta('twitter:title', meta.shareTitle);
    setMeta('twitter:description', meta.description);
    setMeta('twitter:image', meta.image);
  }, [pathname]);
};

export default useSeo;
