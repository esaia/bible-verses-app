import { useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { fetchData } from '../lib/axios';
import { toLangBook } from '../lib/passage';
import { fromCanonicalRef, toCanonicalRef } from '../data/psalms';

export const LANGS = ['geo', 'eng', 'rus'];

/** UI chrome is English regardless of which language is being browsed. */
export const LANG_LABELS = { geo: 'Georgian', eng: 'English', rus: 'Russian' };

/** `language` values the API expects. Russian is `ru`, not `rus`. */
const API_LANG = { geo: 'geo', eng: 'eng', rus: 'ru' };

const chapterParams = ({ book, chapter, lang, version }) => ({
  w: toLangBook(book, lang),
  t: chapter,
  m: '',
  s: '',
  mv: version || '',
  language: API_LANG[lang],
  page: 1,
});

/**
 * Loading a whole chapter is one request per language, and the API hands back
 * every verse of it. Once a chapter is cached, going live on any verse in it
 * costs no network at all.
 */
const useChapter = () => {
  const queryClient = useQueryClient();

  const loadChapter = useCallback(
    ({ book, chapter, lang, version }) =>
      queryClient.fetchQuery({
        queryKey: ['studio-chapter', lang, book, chapter, version],
        queryFn: () => fetchData(chapterParams({ book, chapter, lang, version })),
        staleTime: Infinity,
      }),
    [queryClient],
  );

  /**
   * Load one passage in every armed language, aligned verse by verse.
   *
   * The admin language defines the passage; each verse is translated into the
   * shared Septuagint numbering and back out into the target language's own
   * numbering. For everything except Psalms that is the identity, but a
   * Georgian psalm can land on a different English chapter — and occasionally
   * on two of them — so the chapters are resolved per verse rather than
   * assumed to match. Missing verses stay as null to keep the arrays aligned.
   */
  const loadPassage = useCallback(
    async ({ book, chapter, verses, adminLang, targets }) => {
      const adminTarget = targets.find(target => target.lang === adminLang);
      const adminChapter = await loadChapter({ book, chapter, lang: adminLang, version: adminTarget?.version });

      const allVerses = adminChapter?.bibleData || [];
      const byNumber = new Map(allVerses.map(verse => [+verse.muxli, verse]));

      // No explicit list means the whole chapter.
      const wanted = (verses?.length ? verses : allVerses.map(verse => +verse.muxli)).filter(number =>
        byNumber.has(number),
      );

      const adminVerses = wanted.map(number => byNumber.get(number));
      const chapterLength = allVerses.length;
      const canonical = wanted.map(number => toCanonicalRef(book, adminLang, chapter, number));

      const results = await Promise.all(
        targets.map(async ({ lang, version }) => {
          if (lang === adminLang) {
            return [lang, adminVerses];
          }

          const wanted = canonical.map(ref => fromCanonicalRef(book, lang, ref.chapter, ref.verse));
          const chapters = [...new Set(wanted.map(ref => ref.chapter))];
          const loaded = {};

          await Promise.all(
            chapters.map(async target => {
              try {
                const data = await loadChapter({ book, chapter: target, lang, version });
                loaded[target] = data?.bibleData || [];
              } catch (e) {
                loaded[target] = [];
              }
            }),
          );

          const verses = wanted.map(ref => (loaded[ref.chapter] || []).find(item => +item.muxli === ref.verse) || null);

          return [lang, verses];
        }),
      );

      return { data: Object.fromEntries(results), chapterLength, verses: wanted };
    },
    [loadChapter],
  );

  /** How many chapters a book has — the API reports it on any chapter fetch. */
  const loadChapterCount = useCallback(
    async ({ book, lang, version }) => {
      const data = await loadChapter({ book, chapter: 1, lang, version });
      return Number(data?.tavi?.[0]?.cc) || 0;
    },
    [loadChapter],
  );

  /** How many verses a chapter has. */
  const loadVerseCount = useCallback(
    async ({ book, chapter, lang, version }) => {
      const data = await loadChapter({ book, chapter, lang, version });
      return data?.bibleData?.length || 0;
    },
    [loadChapter],
  );

  return { loadChapter, loadPassage, loadChapterCount, loadVerseCount };
};

export default useChapter;
