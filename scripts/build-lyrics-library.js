/**
 * Turn a ProPresenter bundle into the library the app ships with.
 *
 *   node scripts/build-lyrics-library.js "~/Downloads/7 სექტემბერი 2025.proBundle"
 *
 * Writes `public/lyrics/library.json`, which the Lyrics tab fetches when the
 * operator asks for the built-in songs. The parsing is the app's own
 * `src/lib/propresenter.js` — compiled here rather than copied, so the shipped
 * library and a file the operator imports can never drift apart.
 */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'lyrics', 'library.json');

// ProPresenter files that are not songs: the stock SALT templates every install
// ships with, and scratch documents.
const SKIP = [
  /^Pro6 SALT/i,
  /^To Delete/i,
  /^announsment$/i,
  /^Discerning the Times$/i,
  // Dropped from the shipped library at the church's request.
  /^Freed from Desire$/i,
  /^აალელუია( 1)+$/,
  /^ჰიმნი$/,
];

const loadParser = () => {
  const source = path.join(ROOT, 'src', 'lib', 'propresenter.js');
  const { code } = babel.transformFileSync(source, {
    presets: [[require.resolve('@babel/preset-env'), { targets: { node: 'current' } }]],
  });

  const module = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function('module', 'exports', 'require', code)(module, module.exports, require);

  return module.exports;
};

const main = async () => {
  const input = process.argv[2];

  if (!input) {
    console.error('Usage: node scripts/build-lyrics-library.js <file.proBundle>');
    process.exit(1);
  }

  const { parseProBundle } = loadParser();
  const songs = (await parseProBundle(fs.readFileSync(input))).filter(
    song => !SKIP.some(pattern => pattern.test(song.title)),
  );

  const library = {
    name: 'Georgian worship songs',
    source: path.basename(input),
    builtAt: new Date().toISOString().slice(0, 10),
    songs,
  };

  fs.writeFileSync(OUT, JSON.stringify(library));

  const slides = songs.reduce((total, song) => total + song.slides.length, 0);
  console.log(`${songs.length} songs, ${slides} slides → ${path.relative(ROOT, OUT)}`);
};

main();
