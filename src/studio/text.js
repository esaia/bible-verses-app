import { bibleNames } from '../data/bible';

/**
 * Verse text can come back with markup (the API wraps search hits in a
 * highlight span). The console renders plain text rather than injecting HTML.
 */
export const plain = value =>
  (value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Reference label for a verse, e.g. `დაბადება 4:10`.
 *
 * Uses the `wigni` the API returned for that language, which is offset by 3
 * from the index in the name list.
 */
export const verseRef = (item, lang) => {
  if (!item) {
    return '';
  }

  const name = bibleNames[lang]?.[+item.wigni + 2] || '';
  return `${name} ${item.tavi}:${item.muxli}`.trim();
};
