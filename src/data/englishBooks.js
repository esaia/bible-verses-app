/**
 * The API numbers books in Georgian canonical order, but the English corpus
 * orders the catholic epistles and Pauline letters differently. These are the
 * books whose English id differs from the shared id.
 *
 * Moved out of `src/context/BibleSettingProvider.js` so every fetch path can
 * apply the same remap.
 */
export const englishBooks = {
  48: 62,
  49: 63,
  50: 64,
  51: 65,
  52: 66,
  53: 67,
  54: 68,
  55: 48,
  56: 49,
  57: 50,
  58: 51,
  59: 52,
  60: 53,
  61: 54,
  62: 55,
  63: 56,
  64: 57,
  65: 58,
  66: 59,
  67: 60,
  68: 61,
};

/** Translate a shared book id into the id the API expects for `lang`. */
export const toApiBook = (book, lang) => (lang === 'eng' ? englishBooks[book] || book : book);
