import { useMemo, useRef, useState } from 'react';
import { HiOutlineDownload, HiOutlinePencil, HiOutlinePlus, HiOutlineTrash, HiOutlineUpload } from 'react-icons/hi';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import ConfirmDialog from '../ui/ConfirmDialog';
import LyricCard from './LyricCard';
import SlideEditor from './SlideEditor';
import Setlist, { songDragProps } from './Setlist';
import SongEditor from './SongEditor';
import { useStudio } from '../StudioProvider';
import { parseDroppedFiles } from '../../lib/propresenter';

// Generated from a ProPresenter bundle by `scripts/build-lyrics-library.js` and
// served as a static file, so a church with no bundle of its own still starts
// with a full library — and the 150 kB is only fetched if they ask for it.
const BUILT_IN_LIBRARY = '/lyrics/library.json';

/**
 * The Lyrics tab: songs imported straight from a ProPresenter `.proBundle`,
 * listed on the left and laid out as slides on the right. Clicking a slide
 * sends it to the projector exactly as clicking a verse does, so ← and →
 * step through a song the same way they step through a passage.
 */
const LyricsLibrary = () => {
  const {
    songs,
    activeSongId,
    setActiveSongId,
    importSongs,
    updateSong,
    removeSong,
    clearSongs,
    setlist,
    placeInSetlist,
    live,
    selectLyric,
    lyricsFont,
    lyricsAlign,
    cardSize,
  } = useStudio();

  const fileRef = useRef(null);

  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(null);
  const [editingSlide, setEditingSlide] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState(null);

  const active = songs.find(song => song.id === activeSongId) || songs[0] || null;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return needle ? songs.filter(song => song.title.toLowerCase().includes(needle)) : songs;
  }, [query, songs]);

  const handleFiles = async event => {
    const files = [...event.target.files];

    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const imported = await parseDroppedFiles(files);

      if (imported.length === 0) {
        setError('No lyrics found in that file. Export a bundle or a .pro document from ProPresenter.');
        return;
      }

      importSongs(imported);
      setActiveSongId(imported[0].id);
    } catch (e) {
      setError('That file could not be read. It should be a ProPresenter .proBundle or .pro document.');
    } finally {
      setBusy(false);
    }
  };

  const loadBuiltIn = async () => {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch(BUILT_IN_LIBRARY);

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const library = await response.json();

      importSongs(library.songs);
      setActiveSongId(library.songs[0]?.id || null);
    } catch (e) {
      setError('The built-in songs could not be loaded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 gap-4 py-3">
      <div className="flex w-60 shrink-0 flex-col gap-2">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".proBundle,.pro,.zip"
          className="hidden"
          onChange={handleFiles}
        />

        <Button
          variant="accent"
          icon={<HiOutlineUpload className="text-sm" />}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? 'Importing…' : 'Import from ProPresenter'}
        </Button>

        <Button variant="secondary" icon={<HiOutlineDownload className="text-sm" />} onClick={loadBuiltIn}>
          Use the built-in songs
        </Button>

        {songs.length > 0 && <Setlist onEdit={setEditing} />}

        {songs.length > 0 && (
          <>
            <h3 className="mt-1 px-0.5 text-[11px] font-semibold uppercase tracking-wider text-studio-faint">
              Library · {filtered.length === songs.length ? songs.length : `${filtered.length} of ${songs.length}`}
            </h3>

            <input
              type="search"
              value={query}
              placeholder="Find a song"
              onChange={e => setQuery(e.target.value)}
              className="h-8 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
                placeholder:text-studio-faint focus:outline-none
                focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />
          </>
        )}

        <div className="studio-scroll min-h-0 flex-1 overflow-y-auto rounded-studio border border-studio-border">
          {filtered.map(song => (
            <div
              key={song.id}
              {...songDragProps(song.id)}
              title="Drag into the set list"
              className={`group/song flex cursor-grab items-center gap-1 border-b border-studio-divider last:border-b-0
                ${song.id === active?.id ? 'bg-studio-accent/10' : 'hover:bg-studio-surface'}`}
            >
              <button
                type="button"
                onClick={() => setActiveSongId(song.id)}
                className="min-w-0 flex-1 px-2.5 py-2 text-left focus:outline-none"
              >
                <span
                  className={`block truncate text-xs ${
                    song.id === active?.id ? 'font-semibold text-studio-text' : 'text-studio-muted'
                  }`}
                >
                  {song.title}
                </span>
                <span className="block text-[11px] text-studio-faint">{song.slides.length} slides</span>
              </button>

              <span className="flex shrink-0 pr-1 opacity-0 transition-opacity group-hover/song:opacity-100">
                <IconButton
                  label={`Add ${song.title} to the set list`}
                  onClick={() => placeInSetlist(song.id, setlist.length)}
                >
                  <HiOutlinePlus className="text-sm" />
                </IconButton>

                <IconButton label={`Edit ${song.title}`} onClick={() => setEditing(song)}>
                  <HiOutlinePencil className="text-sm" />
                </IconButton>

                <IconButton label={`Remove ${song.title}`} tone="danger" onClick={() => setConfirmingRemove(song)}>
                  <HiOutlineTrash className="text-sm" />
                </IconButton>
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-studio-faint">
              {songs.length === 0 ? 'No songs imported yet.' : 'Nothing matches that.'}
            </p>
          )}
        </div>

        {songs.length > 0 && (
          <Button variant="ghost" onClick={() => setConfirmingClear(true)}>
            Remove all songs
          </Button>
        )}

        <ConfirmDialog
          open={Boolean(confirmingRemove)}
          title="Remove this song?"
          message={`“${confirmingRemove?.title}” and its ${confirmingRemove?.slides.length} slides are deleted, and it
            leaves the set list. Importing the bundle again brings it back.`}
          confirmLabel="Remove song"
          onCancel={() => setConfirmingRemove(null)}
          onConfirm={() => {
            removeSong(confirmingRemove.id);
            setConfirmingRemove(null);
          }}
        />

        <ConfirmDialog
          open={confirmingClear}
          title="Remove all songs?"
          message={`This deletes all ${songs.length} imported songs and empties the set list. The bundle itself is
            untouched — you can import it again.`}
          confirmLabel="Remove all songs"
          onCancel={() => setConfirmingClear(false)}
          onConfirm={() => {
            clearSongs();
            setConfirmingClear(false);
          }}
        />
      </div>

      <SongEditor song={editing} onSave={updateSong} onClose={() => setEditing(null)} />

      <SlideEditor
        open={editingSlide !== null}
        slide={active?.slides?.[editingSlide]}
        index={editingSlide ?? 0}
        onClose={() => setEditingSlide(null)}
        onSave={text =>
          updateSong({
            ...active,
            slides: active.slides.map((item, i) => (i === editingSlide ? { ...item, text } : item)),
          })
        }
      />

      <div className="studio-scroll min-w-0 flex-1 overflow-y-auto px-1 pb-6">
        {error && (
          <p
            className="mb-3 rounded-studio border border-studio-danger/30 bg-red-50 px-3 py-2 text-xs
              text-studio-danger"
          >
            {error}
          </p>
        )}

        {!active ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-studio-text">No songs yet</p>
            <p className="max-w-sm text-xs text-studio-muted">
              In ProPresenter, select your playlist and choose File → Export → Bundle, then import the{' '}
              <code>.proBundle</code> here. Only the lyrics are read — media stays in ProPresenter.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-semibold text-studio-text">{active.title}</h2>

            <div
              className="grid gap-x-4 gap-y-3"
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
            >
              {active.slides.map((slide, index) => (
                <LyricCard
                  key={slide.id}
                  slide={slide}
                  index={index}
                  size={cardSize}
                  font={lyricsFont}
                  align={lyricsAlign}
                  isLive={live?.kind === 'lyrics' && live.songId === active.id && live.slideIndex === index}
                  onGoLive={() => selectLyric(active, index)}
                  onEdit={() => setEditingSlide(index)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LyricsLibrary;
