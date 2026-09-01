import { useEffect, useMemo, useRef, useState } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import { useStudio } from '../StudioProvider';
import { songDragProps } from './Setlist';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');

/** The shortcut as this platform writes it, for the hint in the library header. */
export const SEARCH_HINT = isMac ? '⌘F' : 'Ctrl F';

/** Title first, then anything a slide says — so a half-remembered line finds the song. */
const matchOf = (song, needle) => {
  const title = song.title.toLowerCase();

  if (title.startsWith(needle)) {
    return { rank: 0 };
  }

  if (title.includes(needle)) {
    return { rank: 1 };
  }

  const line = song.slides.flatMap(slide => slide.text.split('\n')).find(text => text.toLowerCase().includes(needle));

  return line ? { rank: 2, line: line.trim() } : null;
};

/**
 * ProPresenter's ⌘F: a palette over the workspace that searches the whole song
 * library from anywhere, without reaching for the Lyrics tab first. Arrow keys
 * walk the results, Enter opens the song, ⇧Enter drops it on the playlist.
 *
 * It floats without dimming the room behind it, and its backdrop takes no
 * pointer events, so a row can be dragged straight out onto the playlist while
 * the palette stays open for the next song.
 */
const SongSearch = ({ open, onClose }) => {
  const { songs, setTab, setActiveSongId, placeInSetlist, setlist } = useStudio();

  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);

  // Held in a ref so the outside-click effect keys on `open` alone.
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const cardRef = useRef(null);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();

    if (!needle) {
      return songs.map(song => ({ song }));
    }

    return songs
      .map(song => {
        const match = matchOf(song, needle);

        return match && { song, ...match };
      })
      .filter(Boolean)
      .sort((a, b) => a.rank - b.rank || a.song.title.localeCompare(b.song.title));
  }, [query, songs]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setCursor(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // With the backdrop transparent to the mouse, the close-on-outside-click has
  // to come from the document. `mousedown` rather than `click` so it fires
  // before whatever was clicked behind takes focus.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleMouseDown = e => {
      if (!cardRef.current?.contains(e.target)) {
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);

    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // Keep the highlighted row in view while the arrows walk past the fold.
  useEffect(() => {
    listRef.current?.children[cursor]?.scrollIntoView({ block: 'nearest' });
  }, [cursor, results]);

  if (!open) {
    return null;
  }

  const openSong = song => {
    setTab('lyrics');
    setActiveSongId(song.id);
    onClose();
  };

  const handleKeyDown = e => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setCursor(current => (results.length === 0 ? 0 : (current + 1) % results.length));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setCursor(current => (results.length === 0 ? 0 : (current - 1 + results.length) % results.length));
        break;
      case 'Enter': {
        const picked = results[cursor]?.song;

        if (!picked) {
          return;
        }

        e.preventDefault();

        if (e.shiftKey) {
          placeInSetlist(picked.id, setlist.length);
          onClose();
          return;
        }

        openSong(picked);
        break;
      }
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        onClose();
        break;
      default:
        break;
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex justify-center px-4 pt-[13vh] font-ui">
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search the song library"
        className="pointer-events-auto flex h-fit max-h-[70vh] w-full max-w-md flex-col overflow-hidden
          rounded-studio-lg bg-white shadow-studio-modal ring-1 ring-studio-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <HiOutlineSearch className="shrink-0 text-lg text-studio-faint" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder="Library"
            onChange={e => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base text-studio-text placeholder:text-studio-faint
              focus:outline-none"
          />
        </div>

        <div ref={listRef} className="studio-scroll min-h-0 flex-1 overflow-y-auto border-t border-studio-divider">
          {results.map(({ song, line }, index) => (
            <div
              key={song.id}
              {...songDragProps(song.id)}
              title="Drag onto the playlist"
              onMouseMove={() => setCursor(index)}
              onClick={() => openSong(song)}
              className={`flex w-full cursor-grab items-baseline gap-3 px-4 py-2 text-left
                ${index === cursor ? 'bg-studio-accent/10' : ''}`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-studio-text">{song.title}</span>
                {line && <span className="mt-0.5 block truncate text-[11px] text-studio-muted">{line}</span>}
              </span>

              <span className="shrink-0 text-[11px] text-studio-faint">{song.slides.length} slides</span>
            </div>
          ))}

          {results.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-studio-faint">
              {songs.length === 0 ? 'No songs in the library yet.' : `Nothing matches “${query.trim()}”.`}
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-3 border-t border-studio-divider px-4 py-2 text-[11px] text-studio-faint">
          <span>↑↓ move</span>
          <span>↵ open</span>
          <span>⇧↵ add to playlist</span>
          <span>drag onto the playlist</span>
          <span className="ml-auto">esc close</span>
        </div>
      </div>
    </div>
  );
};

export default SongSearch;
