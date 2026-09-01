import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { versionsByLang } from '../data/bible';
import useChapter, { LANGS } from './useChapter';
import { TRANSITION_KEY, clampTransition, readTransition } from '../lib/transition';
import { pushObs } from '../lib/obsBridge';
import { adoptRelay, ensureRoom, onRelayMessage, publishRelay, startRelay, stopRelay, writeRoom } from '../lib/relay';

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

  // Which workspace the main pane is showing: the passages, or the music library.
  const [tab, setTab] = useState(() => {
    const stored = read('studioTab', 'bible');
    return ['bible', 'audio', 'lyrics'].includes(stored) ? stored : 'bible';
  });

  // Songs imported from ProPresenter. Only the text is kept, so a whole
  // bundle's worth of lyrics is a few tens of kilobytes.
  const [songs, setSongs] = useState(() => read('studioSongs', []));
  const [activeSongId, setActiveSongId] = useState(() => read('studioActiveSong', null));

  // The songs picked for this service, in the order they will be sung. Held as
  // ids so a re-import updates the playlist's contents without rebuilding it.
  const [setlist, setSetlist] = useState(() => read('studioSetlist', []));

  // The projector typeface, shared so the verse cards preview in it too.
  // Stored raw (not JSON) because the legacy console reads the same key.
  const [projectorFont, setProjectorFont] = useState(() => localStorage.getItem('font') || 'font-banner');
  const [theme, setTheme] = useState(() => localStorage.getItem('themeNumber') || '1');
  const [dynamicImage, setDynamicImage] = useState(() => localStorage.getItem('dynamicImage') || '');
  const [textAlign, setTextAlign] = useState(() => localStorage.getItem('projectorAlign') || 'left');

  // Songs get their own typeface and alignment: a verse reads as a paragraph,
  // a lyric slide as centred lines. Seeded from the verse settings the first
  // time, so nothing changes on screen until the operator touches them.
  const [lyricsFont, setLyricsFont] = useState(
    () => localStorage.getItem('lyricsFont') || localStorage.getItem('font') || 'font-banner',
  );
  const [lyricsAlign, setLyricsAlign] = useState(
    () => localStorage.getItem('lyricsAlign') || localStorage.getItem('projectorAlign') || 'left',
  );

  // Slide-change crossfade in milliseconds, 0 for a hard cut. Stored raw so
  // `/show` reads it with a plain getItem.
  const [transitionMs, setTransitionMsState] = useState(readTransition);
  const setTransitionMs = useCallback(value => setTransitionMsState(clampTransition(Number(value) || 0)), []);

  // Which language sits above which on screen.
  const [langOrder, setLangOrder] = useState(() => {
    const stored = read('projectorOrder', null);
    return validOrder(stored) ? stored : DEFAULT_ORDER;
  });
  const [cardSize, setCardSize] = useState(() => read('studioCardSize', 190));
  const [lowerThirdPosition, setLowerThirdPosition] = useState(
    () => localStorage.getItem('lowerThirdPosition') || 'bottom',
  );
  const [lowerThirdVariant, setLowerThirdVariant] = useState(
    () => localStorage.getItem('lowerThirdVariant') || 'scrim',
  );
  // Song slides and scripture want different graphics: a verse carries a
  // reference worth setting, a lyric is one line of text and usually wants less
  // furniture around it. Mirrors the projector's own verses/lyrics split.
  const [lyricsVariant, setLyricsVariant] = useState(() => localStorage.getItem('lyricsVariant') || 'scrim');
  // Blanks the overlay without dropping the OBS connection, so the operator can
  // take verses off the stream while leaving them on the projector.
  const [obsHidden, setObsHidden] = useState(() => localStorage.getItem('obsHidden') === '1');
  /** The one language that reaches the stream. A lower third is read at a
   *  glance over someone's shoulder, so stacking two or three translations in
   *  it defeats the point — the projector is where the full stack belongs. */
  const [streamLang, setStreamLang] = useState(() => localStorage.getItem('lowerThirdLanguage') || 'geo');
  const [loading, setLoading] = useState(false);
  const [draggingId, setDraggingId] = useState(null);

  useEffect(() => write('studioAdmin', admin), [admin]);
  useEffect(() => write('projectorLanguages', enabled), [enabled]);
  useEffect(() => write('versions', versions), [versions]);
  useEffect(() => write('studioBlocks', blocks), [blocks]);
  useEffect(() => write('studioLive', live), [live]);
  useEffect(() => write('studioPreviewOpen', previewOpen), [previewOpen]);
  useEffect(() => write('studioTab', tab), [tab]);
  useEffect(() => write('studioSongs', songs), [songs]);
  useEffect(() => write('studioActiveSong', activeSongId), [activeSongId]);
  useEffect(() => write('studioSetlist', setlist), [setlist]);
  useEffect(() => localStorage.setItem('font', projectorFont), [projectorFont]);
  useEffect(() => localStorage.setItem('themeNumber', theme), [theme]);
  useEffect(() => localStorage.setItem('dynamicImage', dynamicImage), [dynamicImage]);
  useEffect(() => localStorage.setItem('projectorAlign', textAlign), [textAlign]);
  useEffect(() => localStorage.setItem('lyricsFont', lyricsFont), [lyricsFont]);
  useEffect(() => localStorage.setItem('lyricsAlign', lyricsAlign), [lyricsAlign]);
  useEffect(() => localStorage.setItem(TRANSITION_KEY, String(transitionMs)), [transitionMs]);
  useEffect(() => write('projectorOrder', langOrder), [langOrder]);
  useEffect(() => write('studioCardSize', cardSize), [cardSize]);
  useEffect(() => localStorage.setItem('lowerThirdPosition', lowerThirdPosition), [lowerThirdPosition]);
  useEffect(() => localStorage.setItem('lowerThirdVariant', lowerThirdVariant), [lowerThirdVariant]);
  useEffect(() => localStorage.setItem('lyricsVariant', lyricsVariant), [lyricsVariant]);
  useEffect(() => localStorage.setItem('obsHidden', obsHidden ? '1' : '0'), [obsHidden]);
  useEffect(() => {
    streamLangRef.current = streamLang;
    localStorage.setItem('lowerThirdLanguage', streamLang);
  }, [streamLang]);

  /**
   * Everything `/lower3rd` needs to draw a slide. The OBS Browser Source has
   * no access to this origin's `localStorage`, so the style travels with the
   * content instead of being read off the projector keys.
   */
  const obsStyle = useMemo(
    () => ({
      font: projectorFont,
      align: textAlign,
      lyricsFont,
      lyricsAlign,
      order: langOrder,
      // Falling back to the first armed language rather than to nothing: only
      // armed languages are fetched, so a chosen language that is later
      // disarmed would otherwise blank the stream with no obvious cause.
      enabled: (() => {
        const armed = LANGS.filter(lang => enabled[lang]);
        const chosen = armed.includes(streamLang) ? streamLang : armed[0];

        return LANGS.reduce((acc, lang) => ({ ...acc, [lang]: lang === chosen }), {});
      })(),
      transitionMs,
      position: lowerThirdPosition,
      variant: lowerThirdVariant,
      lyricsVariant,
      hidden: obsHidden,
    }),
    [
      projectorFont,
      textAlign,
      lyricsFont,
      lyricsAlign,
      langOrder,
      enabled,
      transitionMs,
      lowerThirdPosition,
      lowerThirdVariant,
      lyricsVariant,
      obsHidden,
      streamLang,
    ],
  );

  /**
   * Everything `/show` needs to draw a slide, for the same reason the OBS
   * style travels with the content: a projector on another machine reached
   * through the relay cannot read this browser's projector keys either.
   */
  const projectorStyle = useMemo(
    () => ({
      theme,
      dynamicImage,
      font: projectorFont,
      align: textAlign,
      lyricsFont,
      lyricsAlign,
      order: langOrder,
      enabled,
      transitionMs,
    }),
    [theme, dynamicImage, projectorFont, textAlign, lyricsFont, lyricsAlign, langOrder, enabled, transitionMs],
  );

  // The last slide pushed, kept so a style change can redraw OBS without the
  // operator having to advance a verse. Held in a ref because `showData` lives
  // in `localStorage`, not in state.
  const lastShowRef = useRef(read('showData', emptyShowData));
  const obsStyleRef = useRef(obsStyle);
  const projectorStyleRef = useRef(projectorStyle);

  // Set once this console has taken a slide from the room, which is what makes
  // it stop treating its own last slide as the live one.
  const followingRef = useRef(false);

  // Cleared until the room has had its chance to say what is already live, so
  // that opening or reloading a console cannot announce a stale slide.
  const seededRef = useRef(false);

  /**
   * The last payload seen on the wire, sent or received.
   *
   * Publishing is gated on differing from it, which is what keeps two consoles
   * from arguing. Every publish carries the whole look, so a console that has
   * not caught up re-asserts its own settings the next time it does anything
   * at all — pressing the arrow key was enough to drag the stream language
   * back. Adopting a payload records it here, so applying it cannot echo, and
   * a genuine local change still differs and still goes out.
   */
  const lastWireRef = useRef(null);

  const streamLangRef = useRef(streamLang);

  const publishWire = useCallback(payload => {
    if (JSON.stringify(payload) === JSON.stringify(lastWireRef.current)) {
      return;
    }

    lastWireRef.current = payload;
    publishRelay(payload);
  }, []);

  useEffect(() => {
    obsStyleRef.current = obsStyle;
    projectorStyleRef.current = projectorStyle;

    pushObs({ showData: lastShowRef.current, style: obsStyle });

    // Not before the room has had its say; after that, anything genuinely new.
    if (seededRef.current) {
      publishWire({ showData: lastShowRef.current, style: obsStyle, projector: projectorStyle, streamLang });
    }
  }, [obsStyle, projectorStyle, streamLang, publishWire]);

  // The room this console publishes into. Created on first run so there is
  // nothing to set up; `?room=` carries a phone into an existing one.
  const [room, setRoomState] = useState(ensureRoom);

  useEffect(() => {
    followingRef.current = false;
    seededRef.current = false;

    startRelay(room, 'console');

    // A room that already has a console running replays its slide within a
    // moment of connecting. Only when none comes back is this console the
    // first one in, and only then may it seed the room from its own storage —
    // which is what still lets a lone operator open the console and find the
    // last slide back on the projector.
    const seed = setTimeout(() => {
      seededRef.current = true;

      if (!followingRef.current) {
        publishWire({
          showData: lastShowRef.current,
          style: obsStyleRef.current,
          projector: projectorStyleRef.current,
          streamLang: streamLangRef.current,
        });
      }
    }, 1500);

    return () => {
      clearTimeout(seed);
      stopRelay();
    };
  }, [room, publishWire]);

  /**
   * A room can hold more than one console — a phone and the desk machine —
   * so a console has to follow the room as well as publish into it. Without
   * this it goes on believing its own last slide is live and pushes it back
   * over the other console's, on the next restyle, OBS heartbeat or reconnect.
   *
   * The slide is adopted rather than echoed: sending it on would have the two
   * consoles trading the same payload forever.
   */
  useEffect(() => {
    const off = onRelayMessage(payload => {
      if (!payload?.showData) {
        return;
      }

      followingRef.current = true;
      lastWireRef.current = payload;
      adoptRelay(payload);

      if (JSON.stringify(payload.showData) !== JSON.stringify(lastShowRef.current)) {
        lastShowRef.current = payload.showData;
        write('showData', payload.showData);
      }

      // Keeps a projector tab and an obs-websocket Browser Source on this
      // machine in step, whichever console is actually driving. The incoming
      // style wins, so both routes into OBS agree.
      pushObs({ showData: payload.showData, style: payload.style || obsStyleRef.current });

      // The look belongs to the service, not to the device showing it. Two
      // consoles that disagree about it would take turns overwriting each
      // other, which is what made a language chosen on a phone snap back the
      // moment the other console touched anything.
      const { projector, style, streamLang: incomingLang } = payload;

      if (projector) {
        setTheme(projector.theme || '1');
        setDynamicImage(projector.dynamicImage || '');
        setProjectorFont(projector.font || 'font-banner');
        setTextAlign(projector.align || 'left');
        setLyricsFont(projector.lyricsFont || projector.font || 'font-banner');
        setLyricsAlign(projector.lyricsAlign || projector.align || 'left');
        setTransitionMsState(clampTransition(projector.transitionMs));

        // Objects arrive with a fresh identity every time, so they are only
        // taken when the contents actually moved — otherwise every push would
        // invalidate the memos that decide what to publish next.
        setLangOrder(current =>
          JSON.stringify(current) === JSON.stringify(projector.order) ? current : projector.order,
        );
        setEnabled(current =>
          JSON.stringify(current) === JSON.stringify(projector.enabled) ? current : projector.enabled,
        );
      }

      if (style) {
        setLowerThirdPosition(style.position || 'bottom');
        setLowerThirdVariant(style.variant || 'scrim');
        setLyricsVariant(style.lyricsVariant || 'scrim');
        setObsHidden(Boolean(style.hidden));
      }

      if (incomingLang) {
        setStreamLang(incomingLang);
      }
    });

    return off;
  }, []);

  /** Join another room, or hand this one a fresh code. */
  const setRoom = useCallback(next => {
    writeRoom(next);
    setRoomState(next);
  }, []);

  /**
   * Put a slide on both outputs: `showData` for the `/show` projector tab, and
   * the OBS bridge for the Browser Source. The bridge is a no-op when OBS is
   * not connected, so the projector path behaves exactly as it always has.
   */
  const pushShow = useCallback(
    payload => {
      // An operator acting here means this console is driving, whatever the
      // room was doing a moment ago.
      followingRef.current = false;
      seededRef.current = true;
      lastShowRef.current = payload;
      write('showData', payload);
      pushObs({ showData: payload, style: obsStyleRef.current });
      publishWire({
        showData: payload,
        style: obsStyleRef.current,
        projector: projectorStyleRef.current,
        streamLang: streamLangRef.current,
      });
    },
    [publishWire],
  );

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

      pushShow(payload);
      setLive({ blockId: block.id, verseIndex: groupIndex });
    },
    [enabled, pushShow],
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
  /** Fold or unfold every passage at once. With a dozen chapters imported, the
   *  list is faster to navigate collapsed and the per-block chevrons are a lot
   *  of clicks. */
  const setAllCollapsed = useCallback(collapsed => {
    setBlocks(current => current.map(block => ({ ...block, collapsed })));
  }, []);

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
    pushShow(emptyShowData);
    setLive(null);
  }, [pushShow]);

  /**
   * Put one song slide on the projector. Lyrics ride in `showData` alongside
   * the verse slots rather than in them: they are one block of text with no
   * reference and no language, so `/show` renders them on their own path.
   */
  const publishLyrics = useCallback(
    (song, slideIndex) => {
      const slide = song?.slides?.[slideIndex];

      if (!slide) {
        return;
      }

      pushShow({ ...emptyShowData, lyrics: { title: song.title, text: slide.text } });
      setLive({ kind: 'lyrics', songId: song.id, slideIndex });
    },
    [pushShow],
  );

  /** Clicking the slide that is already live clears the screen, as verses do. */
  const selectLyric = useCallback(
    (song, slideIndex) => {
      if (live?.kind === 'lyrics' && live.songId === song.id && live.slideIndex === slideIndex) {
        clearProjector();
        return;
      }

      publishLyrics(song, slideIndex);
    },
    [clearProjector, live, publishLyrics],
  );

  /** Imported songs replace same-titled ones, so re-importing a bundle updates. */
  const importSongs = useCallback(imported => {
    setSongs(current => {
      const titles = new Set(imported.map(song => song.title));
      const kept = current.filter(song => !titles.has(song.title));

      return [...kept, ...imported].sort((a, b) => a.title.localeCompare(b.title));
    });
  }, []);

  /** A song written here rather than imported. Lands in the same sorted list. */
  const addSong = useCallback(song => {
    setSongs(current => [...current, song].sort((a, b) => a.title.localeCompare(b.title)));
    setActiveSongId(song.id);
  }, []);

  const removeSong = useCallback(id => {
    setSongs(current => current.filter(song => song.id !== id));
    setSetlist(current => current.filter(songId => songId !== id));
    setActiveSongId(current => (current === id ? null : current));
    setLive(current => (current?.kind === 'lyrics' && current.songId === id ? null : current));
  }, []);

  const clearSongs = useCallback(() => {
    setSongs([]);
    setSetlist([]);
    setActiveSongId(null);
    setLive(current => (current?.kind === 'lyrics' ? null : current));
  }, []);

  /**
   * Replace a song with an edited copy. If it is the song on screen, the
   * projector is re-published so a corrected line appears at once; if the live
   * slide was deleted outright, the screen clears rather than showing the
   * wrong verse.
   */
  const updateSong = useCallback(
    edited => {
      setSongs(current => current.map(song => (song.id === edited.id ? edited : song)));

      setLive(current => {
        if (current?.kind !== 'lyrics' || current.songId !== edited.id) {
          return current;
        }

        const slide = edited.slides[current.slideIndex];

        if (!slide) {
          pushShow(emptyShowData);
          return null;
        }

        pushShow({ ...emptyShowData, lyrics: { title: edited.title, text: slide.text } });
        return current;
      });
    },
    [pushShow],
  );

  /**
   * Drop a song into the playlist at `index`, whether it is coming from the
   * library or being moved within the list. Removing it first means the index
   * the operator aimed at is the slot it lands in.
   */
  const placeInSetlist = useCallback((songId, index) => {
    setSetlist(current => {
      const from = current.indexOf(songId);
      const next = current.filter(id => id !== songId);
      const target = from !== -1 && from < index ? index - 1 : index;

      next.splice(Math.max(0, Math.min(target, next.length)), 0, songId);

      return next;
    });
  }, []);

  const removeFromSetlist = useCallback(id => setSetlist(current => current.filter(songId => songId !== id)), []);

  const clearSetlist = useCallback(() => setSetlist([]), []);

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

  // Which settings panel is open, or null. Setup lives behind this dialog so
  // the rail beside the passages only carries controls used during a service.
  const [settingsTab, setSettingsTab] = useState(null);
  const openSettings = useCallback((panel = 'projector') => setSettingsTab(panel), []);
  const closeSettings = useCallback(() => setSettingsTab(null), []);

  const togglePreview = useCallback(() => setPreviewOpen(current => !current), []);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  /** Move the live verse within its own block. */
  const stepLive = useCallback(
    direction => {
      if (!live) {
        return;
      }

      if (live.kind === 'lyrics') {
        const song = songs.find(item => item.id === live.songId);
        const nextSlide = live.slideIndex + direction;

        if (song && nextSlide >= 0 && nextSlide < song.slides.length) {
          publishLyrics(song, nextSlide);
        }

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
    [blocks, goLive, live, publishLyrics, songs],
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
      tab,
      setTab,
      songs,
      activeSongId,
      setActiveSongId,
      importSongs,
      addSong,
      updateSong,
      removeSong,
      clearSongs,
      setlist,
      placeInSetlist,
      removeFromSetlist,
      clearSetlist,
      publishLyrics,
      selectLyric,
      projectorFont,
      setProjectorFont,
      theme,
      setTheme,
      dynamicImage,
      setDynamicImage,
      textAlign,
      setTextAlign,
      lyricsFont,
      setLyricsFont,
      lyricsAlign,
      setLyricsAlign,
      transitionMs,
      setTransitionMs,
      langOrder,
      moveLang,
      cardSize,
      setCardSize,
      lowerThirdPosition,
      setLowerThirdPosition,
      lowerThirdVariant,
      setLowerThirdVariant,
      lyricsVariant,
      setLyricsVariant,
      obsHidden,
      setObsHidden,
      streamLang,
      setStreamLang,
      loading,
      addPassage,
      removeBlock,
      extendBlock,
      removeGroup,
      joinGroup,
      splitGroup,
      toggleBlockCollapsed,
      setAllCollapsed,
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
      settingsTab,
      openSettings,
      closeSettings,
      room,
      setRoom,
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
      tab,
      songs,
      activeSongId,
      importSongs,
      addSong,
      updateSong,
      removeSong,
      clearSongs,
      setlist,
      placeInSetlist,
      removeFromSetlist,
      clearSetlist,
      publishLyrics,
      selectLyric,
      projectorFont,
      theme,
      dynamicImage,
      textAlign,
      lyricsFont,
      lyricsAlign,
      transitionMs,
      setTransitionMs,
      langOrder,
      moveLang,
      cardSize,
      lowerThirdPosition,
      lowerThirdVariant,
      lyricsVariant,
      obsHidden,
      streamLang,
      loading,
      addPassage,
      removeBlock,
      extendBlock,
      removeGroup,
      joinGroup,
      splitGroup,
      toggleBlockCollapsed,
      setAllCollapsed,
      moveBlock,
      moveBlockTo,
      draggingId,
      room,
      setRoom,
      clearBlocks,
      goLive,
      selectVerse,
      stepLive,
      clearProjector,
      togglePreview,
      closePreview,
      settingsTab,
      openSettings,
      closeSettings,
      refreshBlocks,
      loadChapterCount,
      loadVerseCount,
    ],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
};

export const useStudio = () => useContext(StudioContext);

export default StudioProvider;
