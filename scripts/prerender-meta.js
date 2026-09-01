/**
 * Give every route its own head, statically.
 *
 * Netlify serves `index.html` for all paths (`public/_redirects`), which is
 * what makes the SPA work and also what makes every route share one set of
 * tags. `src/lib/useSeo.js` fixes that at runtime, but the crawlers that draw
 * link previews — Facebook, Slack, iMessage, X — do not run JavaScript, so
 * they only ever saw the home page's card.
 *
 * After the CRA build this writes a copy of `index.html` per route, with the
 * title, description, canonical, robots and share tags of that route baked in.
 * Netlify serves a matching file before falling back to the redirect, so
 * `/studio` gets `build/studio/index.html` and its own card. The copies carry
 * the same script tags, so the app still boots normally from any of them.
 *
 * Route metadata comes from `src/data/pageMeta.json`, the same file the
 * runtime hook reads.
 */

const fs = require('fs');
const path = require('path');

const { site, pages } = require('../src/data/pageMeta.json');

const BUILD = path.join(__dirname, '..', 'build');

/** Replace the content of a tag matched by one of its other attributes. */
const setAttr = (html, pattern, value) =>
  html.replace(pattern, (match, before, _old, after) => `${before}${escapeHtml(value)}${after}`);

const escapeHtml = value =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const metaByName = name => new RegExp(`(<meta\\s+name="${name}"\\s+content=")([^"]*)(")`, 'i');
const metaByProperty = property => new RegExp(`(<meta\\s+property="${property}"\\s+content=")([^"]*)(")`, 'i');

const render = (template, route, page) => {
  const url = `${site.url}${route}`;
  const shareTitle = page.shareTitle || page.title;
  const description = page.description || pages['/'].description;
  const image = `${site.url}${page.image || site.image}`;
  const imageAlt = page.imageAlt || site.imageAlt;

  let html = template;

  html = html.replace(
    /(<title>)([^<]*)(<\/title>)/i,
    (m, before, _old, after) => `${before}${escapeHtml(page.title)}${after}`,
  );
  html = html.replace(
    /(<link\s+rel="canonical"\s+href=")([^"]*)(")/i,
    (m, before, _old, after) => `${before}${url}${after}`,
  );

  html = setAttr(html, metaByName('description'), description);
  html = setAttr(html, metaByName('robots'), page.noindex ? 'noindex, nofollow' : 'index, follow');
  html = setAttr(html, metaByName('twitter:title'), shareTitle);
  html = setAttr(html, metaByName('twitter:description'), description);
  html = setAttr(html, metaByName('twitter:image'), image);

  html = setAttr(html, metaByProperty('og:url'), url);
  html = setAttr(html, metaByProperty('og:title'), shareTitle);
  html = setAttr(html, metaByProperty('og:description'), description);
  html = setAttr(html, metaByProperty('og:image'), image);
  html = setAttr(html, metaByProperty('og:image:alt'), imageAlt);

  return html;
};

const main = () => {
  const indexPath = path.join(BUILD, 'index.html');

  if (!fs.existsSync(indexPath)) {
    console.error('prerender-meta: no build/index.html — run the CRA build first.');
    process.exit(1);
  }

  const template = fs.readFileSync(indexPath, 'utf8');
  const written = [];

  Object.entries(pages).forEach(([route, page]) => {
    const html = render(template, route, page);

    if (route === '/') {
      fs.writeFileSync(indexPath, html);
    } else {
      const dir = path.join(BUILD, route.replace(/^\//, ''));

      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), html);
    }

    written.push(route);
  });

  console.log(`prerender-meta: wrote head tags for ${written.join(', ')}`);
};

main();
