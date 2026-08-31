import JSZip from 'jszip';

/**
 * Reads ProPresenter 7 documents well enough to get the lyrics out.
 *
 * A `.pro` file is a protobuf message and a `.proBundle` is a zip of them. We
 * do not decode the protobuf: every text box in the document carries its
 * content as an RTF blob, the blobs appear in slide order, and that is all the
 * lyrics are. Skipping the schema means no generated code to keep in step with
 * ProPresenter's releases — the cost is that we read text, not layout.
 */

/** Pull each `{\rtf ... }` blob out of the raw file, in document order. */
const rtfBlobs = latin1 => {
  const found = [];
  const marker = /\{\\rtf/g;
  let match = marker.exec(latin1);

  while (match) {
    let depth = 0;

    for (let i = match.index; i < latin1.length; i += 1) {
      const char = latin1[i];

      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;

        if (depth === 0) {
          found.push(latin1.slice(match.index, i + 1));
          marker.lastIndex = i + 1;
          break;
        }
      }
    }

    match = marker.exec(latin1);
  }

  return found;
};

const CONTROL_WORD = /^\\([a-zA-Z]+)(-?\d+)? ?/;
const UNICODE_ESCAPE = /^\\u(-?\d+) ?\??/;
const HEX_ESCAPE = /^\\'([0-9a-fA-F]{2})/;

/**
 * RTF to plain text. Georgian arrives as `\uNNNN` escapes, each followed by an
 * ASCII `?` stand-in that has to be dropped, and `\par` is the line break that
 * separates the lines of a slide.
 */
export const rtfToText = rtf => {
  const out = [];
  let i = 0;

  while (i < rtf.length) {
    const char = rtf[i];

    if (char === '\\') {
      const rest = rtf.slice(i, i + 24);
      const unicode = UNICODE_ESCAPE.exec(rest);

      if (unicode) {
        const code = Number(unicode[1]);
        out.push(String.fromCharCode(code < 0 ? code + 65536 : code));
        i += unicode[0].length;
        continue;
      }

      const hex = HEX_ESCAPE.exec(rest);

      if (hex) {
        out.push(String.fromCharCode(parseInt(hex[1], 16)));
        i += hex[0].length;
        continue;
      }

      const word = CONTROL_WORD.exec(rest);

      if (word) {
        if (word[1] === 'par' || word[1] === 'line') {
          out.push('\n');
        }

        i += word[0].length;
        continue;
      }

      // An escaped literal: \{ \} \\
      out.push(rtf[i + 1] || '');
      i += 2;
      continue;
    }

    if (char === '{' || char === '}') {
      i += 1;
      continue;
    }

    out.push(char);
    i += 1;
  }

  return out
    .join('')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** The header tables are all markup; the text starts after the list tables. */
const body = blob => {
  const marker = '{\\*\\listoverridetable}';
  const index = blob.lastIndexOf(marker);
  return index === -1 ? blob : blob.slice(index + marker.length);
};

const decodeLatin1 = buffer => {
  const bytes = new Uint8Array(buffer);
  let out = '';

  // Chunked, because a 100k-argument spread blows the call stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }

  return out;
};

const slug = value =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/(^-|-$)/g, '');

/**
 * One `.pro` document as a song: a title and the slides in presentation order.
 * Empty slides — ProPresenter's blank cues and the second, unused text box on
 * every slide — are dropped, and consecutive duplicates are kept, because a
 * repeated chorus is a real slide.
 */
export const parseProDocument = (buffer, filename) => {
  const title = filename.replace(/\.pro$/i, '');
  const seen = new Set();

  const slides = rtfBlobs(decodeLatin1(buffer))
    .map(blob => rtfToText(body(blob)))
    .filter(text => text.length > 0)
    .map((text, index) => ({ id: `${slug(title) || 'song'}-${index}`, text }));

  // A document can hold several arrangements of the same text; the slide list
  // is what the operator clicks, so identical text at the same position is
  // noise rather than a repeat.
  const unique = slides.filter(slide => {
    const key = `${slide.text}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });

  return {
    id: `${slug(title) || 'song'}-${buffer.byteLength}`,
    title,
    slides: unique,
  };
};

const isPro = name => /\.pro$/i.test(name) && !name.startsWith('__MACOSX');

/**
 * A `.proBundle` (or a `.zip` of documents) as a list of songs. Everything that
 * is not a `.pro` — the bundle's images and videos — is ignored, so a 26 MB
 * bundle imports as a few hundred kilobytes of text.
 */
export const parseProBundle = async file => {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter(entry => !entry.dir && isPro(entry.name));

  const songs = await Promise.all(
    entries.map(async entry => {
      const buffer = await entry.async('arraybuffer');
      return parseProDocument(buffer, entry.name.split('/').pop());
    }),
  );

  return songs.filter(song => song.slides.length > 0).sort((a, b) => a.title.localeCompare(b.title));
};

/** Import whatever the operator picked: bundles, zips, or loose documents. */
export const parseDroppedFiles = async files => {
  const songs = [];

  for (const file of files) {
    if (/\.(proBundle|zip)$/i.test(file.name)) {
      // eslint-disable-next-line no-await-in-loop
      songs.push(...(await parseProBundle(file)));
    } else if (isPro(file.name)) {
      // eslint-disable-next-line no-await-in-loop
      const buffer = await file.arrayBuffer();
      const song = parseProDocument(buffer, file.name);

      if (song.slides.length > 0) {
        songs.push(song);
      }
    }
  }

  return songs;
};
