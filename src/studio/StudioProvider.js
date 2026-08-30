import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { versionsByLang } from '../data/bible';
import useChapter, { LANGS } from './useChapter';

const StudioContext = createContext(null);

const read = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
};

const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // Quota exceeded — the projector keys matter more than the saved session.
  }
};

const defaultVersions = {
  geo: versionsByLang.geo[0].value,
  eng: versionsByLang.eng[2].value,
  rus: versionsByLang.rus[0].value,
};

const emptyShowData = { geo: [], eng: [], rus: [] };

/** The order the projector has always stacked the languages in. */
const DEFAULT_ORDER = ['eng', 'geo', 'rus'];

const validOrder = value =>
  Array.isArray(value) && value.length === LANGS.length && LANGS.every(lang => value.includes(lang));

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * A block holds an explicit list of verse numbers plus a grouping: each group
 * is one card, and one card is one slide. Grouping is what lets two verses be
 * joined and shown together, and the explicit list is what lets any verse be
 * deleted rather than only the ends of a range.
 *
 * Blocks saved before this shape existed are upgraded on load.
 */
const withGroups = block => {
  if (block.verses && block.groups) {
    return block;
  }

  const verses = block.from
    ? range(block.from, block.to || block.from)
    : (block.data?.[block.adminLang] || []).map(verse => +verse.muxli);

  return { ...block, verses, groups: verses.map(verse => [verse]) };
};

/** The verse objects of one group, in `lang`, skipping any the language lacks. */
export const groupVerses = (block, lang, group) =>
  (group || []).map(number => block.data?.[lang]?.[block.verses.indexOf(number)]).filter(Boolean);

const StudioProvider = ({ children }) => {
  const { loadPassage, loadChapterCount, loadVerseCount } = useChapter();

  // Admin scope: the single language/version used to browse and to print the
  // verse cards. Independent of what the projector shows.
  const [admin, setAdmin] = useState(() => read('studioAdmin', { lang: 'geo', version: defaultVersions.geo }));

  // Projector scope: which languages are armed, and in which translation.
  // Shares `projectorLanguages` and `versions` with the legacy console so both
  // consoles stay in agreement.
  const [enabled, setEnabled] = useState(() => read('projectorLanguages', { geo: true, eng: false, rus: false }));
  const [versions, setVersions] = useState(() => read('versions', defaultVersions));

  const [blocks, setBlocks] = useState(() => read('studioBlocks', []).map(withGroups));
  const [live, setLive] = useState(() => read('studioLive', null));
  const [previewOpen, setPreviewOpen] = useState(() => read('studioPreviewOpen', false));

  // The projector typeface, shared so the verse cards preview in it too.
  // Stored raw (not JSON) because the legacy console reads the same key.
  const [projectorFont, setProjectorFont] = useState(() => localStorage.getItem('font') || 'font-banner');
  const [theme, setTheme] = useState(() => localStorage.getItem('themeNumber') || '1');
  const [dynamicImage, setDynamicImage] = useState(() => localStorage.getItem('dynamicImage') || '');
  const [textAlign, setTextAlign] = useState(() => localStorage.getItem('projectorAlign') || 'left');

  // Which language sits above which on screen.
  const [langOrder, setLangOrder] = useState(() => {
    const stored = read('projectorOrder', null);
    return validOrder(stored) ? stored : DEFAULT_ORDER;
  });
  const [cardSize, setCardSize] = useState(() => read('studioCardSize', 190));
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => write('studioAdmin', admin), [admin]);
  useEffect(() => write('projectorLanguages', enabled), [enabled]);
  useEffect(() => write('versions', versions), [versions]);
  useEffect(() => write('studioBlocks', blocks), [blocks]);
  useEffect(() => write('studioLive', live), [live]);
  useEffect(() => write('studioPreviewOpen', previewOpen), [previewOpen]);
  useEffect(() => localStorage.setItem('font', projectorFont), [projectorFont]);
  useEffect(() => localStorage.setItem('themeNumber', theme), [theme]);
  useEffect(() => localStorage.setItem('dynamicImage', dynamicImage), [dynamicImage]);
  useEffect(() => localStorage.setItem('projectorAlign', textAlign), [textAlign]);
  useEffect(() => write('projectorOrder', langOrder), [langOrder]);
  useEffect(() => write('studioCardSize', cardSize), [cardSize]);

  /** Languages to fetch: everything armed for the projector, plus the admin
   *  language, whose text the verse cards are printed from. */
  const fetchTargets = useCallback(() => {
    const langs = new Set(LANGS.filter(lang => enabled[lang]));
    langs.add(admin.lang);

    return [...langs].map(lang => ({
      lang,
      version: lang === admin.lang ? admin.version : versions[lang],
    }));
  }, [admin, enabled, versions]);

  /**
   * Push one verse of a block to the projector. Writes `showData` in exactly
   * the shape `/show` already reads, so the projector needs no knowledge of
   * this page. Takes the block itself rather than an id so a freshly added
   * passage — which is not in `blocks` state yet — can go live immediately.
   */
  const publish = useCallback(
    (block, groupIndex) => {
      const group = block.groups?.[groupIndex] || [];

      const payload = LANGS.reduce((acc, lang) => {
        acc[lang] = enabled[lang] ? groupVerses(block, lang, group) : [];
        return acc;
      }, {});

      write('showData', payload);
      setLive({ blockId: block.id, verseIndex: groupIndex });
    },
    [enabled],
  );

  /**
   * Add a passage. With no `from`, the whole chapter is imported; with a range,
   * only those verses become cards (the chapter itself is still cached, so
   * widening the range later costs nothing).
   */
  const addPassage = useCallback(
    async ({ book, chapter, from = null, to = null }) => {
      setLoading(true);

      try {
        const targets = fetchTargets();
        const { data, chapterLength, verses } = await loadPassage({
          book,
          chapter,
          verses: from ? range(from, to || from) : null,
          adminLang: admin.lang,
          targets,
        });

        const block = {
          id: `${book}-${chapter}-${Date.now()}`,
          book,
          chapter,
          from,
          to: from ? to || from : null,
          adminLang: admin.lang,
          versions: Object.fromEntries(targets.map(t => [t.lang, t.version])),
          chapterLength,
          verses,
          groups: verses.map(verse => [verse]),
          data,
        };

        setBlocks(current => [...current, block]);

        return block;
      } finally {
        setLoading(false);
      }
    },
    [admin.lang, fetchTargets, loadPassage],
  );

  /**
   * Grow a passage by one verse at either end. The chapter is already cached,
   * so this normally costs no network. Extending at the start shifts every
   * verse index up by one, so the live pointer moves with it.
   */
  /** Reload a block for a new set of verse numbers, keeping its grouping. */
  const reloadBlock = useCallback(
    async (block, nextVerses, nextGroups) => {
      setLoading(true);

      try {
        const targets = fetchTargets();
        const { data, chapterLength, verses } = await loadPassage({
          book: block.book,
          chapter: block.chapter,
          verses: nextVerses,
          adminLang: admin.lang,
          targets,
        });

        const groups = (nextGroups || verses.map(verse => [verse]))
          .map(group => group.filter(verse => verses.includes(verse)))
          .filter(group => group.length > 0);

        setBlocks(current =>
          current.map(item =>
            item.id === block.id
              ? {
                  ...item,
                  from: verses[0] ?? null,
                  to: verses[verses.length - 1] ?? null,
                  chapterLength,
                  verses,
                  groups,
                  data,
                }
              : item,
          ),
        );

        return groups;
      } finally {
        setLoading(false);
      }
    },
    [admin.lang, fetchTargets, loadPassage],
  );

  /**
   * Grow a passage by one verse at either end. The chapter is already cached,
   * so this normally costs no network.
   */
  const extendBlock = useCallback(
    async (id, side) => {
      const block = blocks.find(item => item.id === id);

      if (!block?.verses?.length) {
        return;
      }

      const first = block.verses[0];
      const last = block.verses[block.verses.length - 1];
      const added = side === 'start' ? first - 1 : last + 1;

      if (added < 1 || (block.chapterLength && added > block.chapterLength)) {
        return;
      }

      const verses = side === 'start' ? [added, ...block.verses] : [...block.verses, added];
      const groups = side === 'start' ? [[added], ...block.groups] : [...block.groups, [added]];

      await reloadBlock(block, verses, groups);

      // Prepending shifts every card along, so the live pointer moves with it.
      if (side === 'start') {
        setLive(current => (current?.blockId === id ? { ...current, verseIndex: current.verseIndex + 1 } : current));
      }
    },
    [blocks, reloadBlock],
  );

  /**
   * Trim the passage at this card: it and everything after it are dropped, so
   * the passage always stays a contiguous run rather than growing holes.
   */
  const removeGroup = useCallback(
    async (id, groupIndex) => {
      const block = blocks.find(item => item.id === id);

      if (!block?.groups?.[groupIndex]) {
        return;
      }

      const groups = block.groups.slice(0, groupIndex);
      const kept = groups.flat();
      const verses = block.verses.filter(verse => kept.includes(verse));

      if (verses.length === 0) {
        setBlocks(current => current.filter(item => item.id !== id));
        setLive(current => (current?.blockId === id ? null : current));
        return;
      }

      await reloadBlock(block, verses, groups);

      // Anything from the cut point on is gone, so a live pointer there clears.
      setLive(current => (current?.blockId === id && current.verseIndex >= groupIndex ? null : current));
    },
    [blocks, reloadBlock],
  );

  /** Merge a card with the one after it, so both verses show together. */
  const joinGroup = useCallback((id, groupIndex) => {
    setBlocks(current =>
      current.map(block => {
        if (block.id !== id || groupIndex >= block.groups.length - 1) {
          return block;
        }

        const groups = [...block.groups];
        groups.splice(groupIndex, 2, [...groups[groupIndex], ...groups[groupIndex + 1]]);
        return { ...block, groups };
      }),
    );

    setLive(current =>
      current?.blockId === id && current.verseIndex > groupIndex
        ? { ...current, verseIndex: current.verseIndex - 1 }
        : current,
    );
  }, []);

  /** Break a joined card back into one card per verse. */
  const splitGroup = useCallback((id, groupIndex) => {
    setBlocks(current =>
      current.map(block => {
        if (block.id !== id || (block.groups[groupIndex] || []).length < 2) {
          return block;
        }

        const groups = [...block.groups];
        groups.splice(groupIndex, 1, ...groups[groupIndex].map(verse => [verse]));
        return { ...block, groups };
      }),
    );
  }, []);

  const removeBlock = useCallback(id => {
    setBlocks(current => current.filter(block => block.id !== id));
    setLive(current => (current?.blockId === id ? null : current));
  }, []);

  /** Reorder by dropping: `insertIndex` is the slot the block should land in. */
  const moveBlockTo = useCallback((id, insertIndex) => {
    setBlocks(current => {
      const from = current.findIndex(block => block.id === id);

      if (from === -1) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(from, 1);
      // Removing the block first shifts every later slot down by one.
      const target = from < insertIndex ? insertIndex - 1 : insertIndex;

      next.splice(Math.max(0, Math.min(target, next.length)), 0, moved);
      return next;
    });
  }, []);

  const moveBlock = useCallback((id, direction) => {
    setBlocks(current => {
      const index = current.findIndex(block => block.id === id);
      const target = index + direction;

      if (index === -1 || target < 0 || target >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  /** Fold a passage down to its title, so long lists stay manageable. */
  const toggleBlockCollapsed = useCallback(id => {
    setBlocks(current => current.map(block => (block.id === id ? { ...block, collapsed: !block.collapsed } : block)));
  }, []);

  const clearBlocks = useCallback(() => {
    setBlocks([]);
    setLive(null);
  }, []);

  const goLive = useCallback(
    (blockId, verseIndex) => {
      const block = blocks.find(item => item.id === blockId);

      if (block) {
        publish(block, verseIndex);
      }
    },
    [blocks, publish],
  );

  const clearProjector = useCallback(() => {
    write('showData', emptyShowData);
    setLive(null);
  }, []);

  /**
   * Clicking a verse sends it live; clicking the verse that is already live
   * clears the screen, so the operator can drop the text without reaching for
   * the Clear button.
   */
  const selectVerse = useCallback(
    (blockId, verseIndex) => {
      if (live?.blockId === blockId && live?.verseIndex === verseIndex) {
        clearProjector();
        return;
      }

      goLive(blockId, verseIndex);
    },
    [clearProjector, goLive, live],
  );

  /** Drop a language into a new slot in the projector stack. */
  const moveLang = useCallback((lang, insertIndex) => {
    setLangOrder(current => {
      const from = current.indexOf(lang);

      if (from === -1) {
        return current;
      }

      const next = [...current];
      next.splice(from, 1);
      const target = from < insertIndex ? insertIndex - 1 : insertIndex;

      next.splice(Math.max(0, Math.min(target, next.length)), 0, lang);
      return next;
    });
  }, []);

  const togglePreview = useCallback(() => setPreviewOpen(current => !current), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  /** Move the live verse within its own block. */
  const stepLive = useCallback(
    direction => {
      if (!live) {
        return;
      }

      const block = blocks.find(item => item.id === live.blockId);
      const total = block?.groups?.length || 0;
      const next = live.verseIndex + direction;

      if (!block || next < 0 || next >= total) {
        return;
      }

      goLive(block.id, next);
    },
    [blocks, goLive, live],
  );

  /** Re-fetch every open passage — used when a translation setting changes. */
  const refreshBlocks = useCallback(async () => {
    if (blocks.length === 0) {
      return;
    }

    setLoading(true);

    try {
      const targets = fetchTargets();
      const refreshed = await Promise.all(
        blocks.map(async block => {
          const { data, chapterLength, verses } = await loadPassage({
            book: block.book,
            chapter: block.chapter,
            verses: block.verses,
            adminLang: admin.lang,
            targets,
          });

          return {
            ...block,
            chapterLength,
            verses,
            groups: (block.groups || verses.map(verse => [verse]))
              .map(group => group.filter(verse => verses.includes(verse)))
              .filter(group => group.length > 0),
            adminLang: admin.lang,
            versions: Object.fromEntries(targets.map(t => [t.lang, t.version])),
            data,
          };
        }),
      );

      setBlocks(refreshed);
    } finally {
      setLoading(false);
    }
  }, [admin.lang, blocks, fetchTargets, loadPassage]);

  // When a translation setting changes, every open passage is refetched so the
  // cards and the projector stay in step. Keyed on a signature so the refresh
  // itself (which replaces `blocks`) cannot retrigger it.
  const settingsKey = `${admin.lang}|${admin.version}|${LANGS.map(
    lang => `${lang}:${enabled[lang] ? 1 : 0}:${versions[lang]}`,
  ).join('|')}`;
  const lastSettings = useRef(settingsKey);

  useEffect(() => {
    if (lastSettings.current === settingsKey) {
      return;
    }

    lastSettings.current = settingsKey;
    refreshBlocks();
  }, [settingsKey, refreshBlocks]);

  const value = useMemo(
    () => ({
      admin,
      setAdmin,
      enabled,
      setEnabled,
      versions,
      setVersions,
      blocks,
      live,
      previewOpen,
      projectorFont,
      setProjectorFont,
      theme,
      setTheme,
      dynamicImage,
      setDynamicImage,
      textAlign,
      setTextAlign,
      langOrder,
      moveLang,
      cardSize,
      setCardSize,
      loading,
      addPassage,
      removeBlock,
      extendBlock,
      removeGroup,
      joinGroup,
      splitGroup,
      toggleBlockCollapsed,
      moveBlock,
      moveBlockTo,
      draggingId,
      setDraggingId,
      clearBlocks,
      goLive,
      selectVerse,
      stepLive,
      clearProjector,
      togglePreview,
      closePreview,
      refreshBlocks,
      loadChapterCount,
      loadVerseCount,
    }),
    [
      admin,
      enabled,
      versions,
      blocks,
      live,
      previewOpen,
      projectorFont,
      theme,
      dynamicImage,
      textAlign,
      langOrder,
      moveLang,
      cardSize,
      loading,
      addPassage,
      removeBlock,
      extendBlock,
      removeGroup,
      joinGroup,
      splitGroup,
      toggleBlockCollapsed,
      moveBlock,
      moveBlockTo,
      draggingId,
      clearBlocks,
      goLive,
      selectVerse,
      stepLive,
      clearProjector,
      togglePreview,
      closePreview,
      refreshBlocks,
      loadChapterCount,
      loadVerseCount,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudio = () => useContext(StudioContext);

export default StudioProvider;
