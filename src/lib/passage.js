import { bibleNames } from '../data/bible';
import { englishBooks } from '../data/englishBooks';

/**
 * Book numbering
 * --------------
 * The app uses the Georgian ordering as the shared book id (Genesis = 4,
 * because indices 1-3 are the "Bible / Old Testament / New Testament" group
 * headers the API returns).
 *
 * English is ordered differently for the epistles, so both the request
 * parameter AND `bibleNamesEng` are indexed by the *English* number. The two
 * helpers below convert between the shared id and a language's own id.
 */
const sharedByEnglish = Object.entries(englishBooks).reduce((acc, [shared, english]) => {
  acc[english] = Number(shared);
  return acc;
}, {});

/** Shared book id -> the id `lang` uses (for API requests and name lookups). */
export const toLangBook = (book, lang) => (lang === 'eng' ? englishBooks[book] || book : book);

/** A language's own book id -> the shared book id. */
export const toSharedBook = (book, lang) => (lang === 'eng' ? sharedByEnglish[book] || book : book);

/** Display name of a shared book id in `lang`. */
export const bookName = (book, lang) => bibleNames[lang]?.[toLangBook(book, lang) - 1] || '';

/** The 66 books of `lang`, as `{ book (shared id), name }`, in that language's order. */
export const booksOf = lang =>
  bibleNames[lang].slice(3).map((name, i) => ({
    book: toSharedBook(i + 4, lang),
    name,
  }));

// Georgian (mkhedruli) and Cyrillic to Latin, so a book can be found by typing
// how its name sounds: `luka` -> ლუკას სახარება, `psaltir` -> Псалтирь.
const LATIN = {
  ა: 'a',
  ბ: 'b',
  გ: 'g',
  დ: 'd',
  ე: 'e',
  ვ: 'v',
  ზ: 'z',
  თ: 't',
  ი: 'i',
  კ: 'k',
  ლ: 'l',
  მ: 'm',
  ნ: 'n',
  ო: 'o',
  პ: 'p',
  ჟ: 'zh',
  რ: 'r',
  ს: 's',
  ტ: 't',
  უ: 'u',
  ფ: 'p',
  ქ: 'k',
  ღ: 'gh',
  ყ: 'q',
  შ: 'sh',
  ჩ: 'ch',
  ც: 'ts',
  ძ: 'dz',
  წ: 'ts',
  ჭ: 'ch',
  ხ: 'kh',
  ჯ: 'j',
  ჰ: 'h',
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'i',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
};

export const transliterate = value =>
  [...value].map(character => (character in LATIN ? LATIN[character] : character)).join('');

export const normalizeName = value =>
  value
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,'"`’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Every string a book can be found by: its name in all three languages, plus a
 * Latin transliteration of each.
 */
export const bookSearchKeys = book => {
  const keys = new Set();

  ['geo', 'eng', 'rus'].forEach(lang => {
    const name = bibleNames[lang]?.[toLangBook(book, lang) - 1];

    if (name) {
      const normalized = normalizeName(name);
      keys.add(normalized);
      keys.add(normalizeName(transliterate(normalized)));
    }
  });

  return [...keys];
};

/** 3 = exact, 2 = prefix, 1 = substring, 0 = no match. */
const matchScore = (book, needle) => {
  const probes = [needle, normalizeName(transliterate(needle))];
  const keys = bookSearchKeys(book);

  if (keys.some(key => probes.some(probe => key === probe))) {
    return 3;
  }

  if (keys.some(key => probes.some(probe => key.startsWith(probe)))) {
    return 2;
  }

  return keys.some(key => probes.some(probe => key.includes(probe))) ? 1 : 0;
};

/** Does this book match a (already normalised) search term? */
export const bookMatches = (book, needle) => !needle || matchScore(book, needle) > 0;

/** Best book match for a bare name, with no chapter or verse. */
export const findBook = (input, lang) => {
  const needle = normalizeName(input || '');

  if (!needle) {
    return null;
  }

  const ranked = booksOf(lang)
    .map(entry => ({ entry, score: matchScore(entry.book, needle) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.entry || null;
};

/**
 * Parse a free-text reference such as `John 3:16-18`, `იოანე 3:16` or
 * `1 Петра 2`. Returns shared book ids, or null when nothing matches.
 *
 * The browsing language is tried first, then the others — the placeholder
 * shows an English example, so typing `John 3:16` has to work even when the
 * cards are being printed in Georgian.
 */
export const parseReference = (input, lang) => {
  if (!input) {
    return null;
  }

  const parsed = input.trim().match(/^(.+?)[\s.]*(\d+)(?:\s*[:.\s]\s*(\d+))?(?:\s*[-–—]\s*(\d+))?\s*$/);

  if (!parsed) {
    return null;
  }

  const [, rawName, chapter, verse, verseTo] = parsed;
  const needle = normalizeName(rawName);

  if (!needle) {
    return null;
  }

  // Book names are matched across all three languages and their
  // transliterations, so `John 3:16`, `იოანე 3:16` and `ioane 3:16` all work
  // whichever language is being browsed.
  const ranked = booksOf(lang)
    .map(entry => ({ entry, score: matchScore(entry.book, needle) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return null;
  }

  const found = ranked[0].entry;

  return {
    book: found.book,
    name: found.name,
    chapter: Number(chapter),
    verse: verse ? Number(verse) : null,
    verseTo: verseTo ? Number(verseTo) : null,
  };
};
