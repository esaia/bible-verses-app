import { useState } from 'react';
import { HiOutlinePencil, HiOutlinePlay, HiOutlinePlus, HiOutlineX } from 'react-icons/hi';
import { MdOutlineDriveFileMove } from 'react-icons/md';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAudio } from '../AudioProvider';
import { MUSIC_CATEGORIES } from '../../data/music';

/** Three bars that only animate on the track actually playing. */
const Equalizer = () => (
  <span className="flex h-3 items-end gap-[2px]">
    {[0, 150, 300].map(delay => (
      <span
        key={delay}
        className="w-[3px] animate-pulse rounded-full bg-white"
        style={{ height: delay === 150 ? 12 : 8, animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
);

const TrackCard = ({
  track,
  isCurrent,
  isPlaying,
  queued,
  categories,
  categoryId,
  onPlay,
  onQueue,
  onMove,
  onRemove,
}) => (
  <div className="group/track relative">
    <button
      type="button"
      onClick={onPlay}
      title={isCurrent && isPlaying ? 'Fade out' : `Play ${track.title}`}
      className={`flex w-full items-center gap-3 rounded-studio border bg-white p-2.5 text-left
        transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
        ${isCurrent ? 'border-studio-accent bg-studio-accent/5' : 'border-studio-border hover:bg-studio-surface'}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-studio
          ${isCurrent ? 'bg-studio-accent text-white' : 'bg-studio-slide text-white'}`}
      >
        {isCurrent && isPlaying ? <Equalizer /> : <HiOutlinePlay className="text-base" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-medium text-studio-text">{track.title}</span>
        <span className="block truncate text-[11px] text-studio-faint">{track.artist}</span>
      </span>
    </button>

    {/* Sits over the title, so it needs a ground of its own — the icons were
        unreadable against the track name underneath. */}
    <span
      className="absolute right-1.5 top-1.5 flex items-center rounded-studio bg-white opacity-0 shadow-studio
        ring-1 ring-studio-border transition-opacity group-hover/track:opacity-100"
    >
      {/* Filing without dragging: the same list the sections are built from,
          so a track can be moved from wherever it happens to be showing. */}
      {onMove && (
        <span className="relative flex h-7 w-7 items-center justify-center text-studio-muted" title="Move to a group">
          <MdOutlineDriveFileMove className="pointer-events-none text-sm" />
          <select
            value={categoryId || ''}
            aria-label={`Move ${track.title} to a group`}
            onChange={event => onMove(event.target.value || null)}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            <option value="">Unfiled</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </span>
      )}

      <IconButton
        label={queued ? `${track.title} is already in the playlist` : `Add ${track.title} to the playlist`}
        disabled={queued}
        onClick={onQueue}
      >
        <HiOutlinePlus className="text-sm" />
      </IconButton>

      {onRemove && (
        <IconButton label="Remove this track" tone="danger" onClick={onRemove}>
          <HiOutlineX className="text-sm" />
        </IconButton>
      )}
    </span>
  </div>
);

const Grid = ({ children }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
    {children}
  </div>
);

const Section = ({ label, hint, actions, onDropFiles, children }) => {
  const [over, setOver] = useState(false);

  return (
    <section
      onDragOver={event => {
        if (onDropFiles && [...event.dataTransfer.types].includes('Files')) {
          event.preventDefault();
          event.stopPropagation();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={event => {
        if (!onDropFiles) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        onDropFiles(event.dataTransfer.files);
      }}
      className={`rounded-studio py-4 transition-colors duration-150
        ${over ? 'bg-studio-accent/5 outline-dashed outline-2 outline-offset-2 outline-studio-accent' : ''}`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-studio-text">{label}</h2>
          {hint && <p className="mt-0.5 text-xs text-studio-muted">{hint}</p>}
        </div>

        {actions && <div className="flex shrink-0 items-center gap-0.5">{actions}</div>}
      </div>

      {children}
    </section>
  );
};

const Empty = ({ children }) => (
  <p className="rounded-studio border border-dashed border-studio-border px-3 py-6 text-center text-xs text-studio-faint">
    {children}
  </p>
);

/**
 * The Audio tab. Tracks the operator drags in are filed into groups they name
 * themselves — "Communion", "Before the service" — because the catalogue
 * headings shipped with the app mean nothing to any particular church.
 */
const AudioLibrary = () => {
  const {
    current,
    playing,
    playTrack,
    customTracks,
    addCustomTrack,
    removeCustomTrack,
    error,
    playlist,
    addToPlaylist,
    localTracks,
    addLocalFiles,
    removeLocalTrack,
    categories,
    assignments,
    addCategory,
    renameCategory,
    removeCategory,
    setTrackCategory,
  } = useAudio();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [renaming, setRenaming] = useState(null);
  const [confirmingRemove, setConfirmingRemove] = useState(null);

  const add = () => {
    const track = addCustomTrack(url, title);

    if (track) {
      setUrl('');
      setTitle('');
    }
  };

  const mine = [...localTracks, ...customTracks];
  const inCategory = id => mine.filter(track => (assignments[track.id] || null) === id);

  const cardsFor = tracks =>
    tracks.map(track => (
      <TrackCard
        key={track.id}
        track={track}
        isCurrent={current?.id === track.id}
        isPlaying={playing}
        queued={playlist.some(item => item.id === track.id)}
        categories={categories}
        categoryId={assignments[track.id] || null}
        onPlay={() => playTrack(track)}
        onQueue={() => addToPlaylist(track)}
        onMove={categoryId => setTrackCategory(track.id, categoryId)}
        onRemove={track.custom ? () => removeCustomTrack(track.id) : () => removeLocalTrack(track.id)}
      />
    ));

  /** Files dropped on a group are saved and filed there in one movement. */
  const dropInto = categoryId => async files => {
    const added = await addLocalFiles(files);

    if (categoryId) {
      added.forEach(track => setTrackCategory(track.id, categoryId));
    }
  };

  const createCategory = () => {
    if (addCategory(name)) {
      setName('');
      setNaming(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl divide-y divide-studio-divider">
      {error && (
        <p className="my-3 rounded-studio border border-studio-danger/30 bg-red-50 px-3 py-2 text-xs text-studio-danger">
          {error}
        </p>
      )}

      {categories.map(category => (
        <Section
          key={category.id}
          label={category.name}
          onDropFiles={dropInto(category.id)}
          actions={
            <>
              <IconButton
                label={`Rename ${category.name}`}
                onClick={() => {
                  setRenaming(category.id);
                  setName(category.name);
                }}
              >
                <HiOutlinePencil className="text-sm" />
              </IconButton>

              <IconButton label={`Delete ${category.name}`} tone="danger" onClick={() => setConfirmingRemove(category)}>
                <HiOutlineX className="text-sm" />
              </IconButton>
            </>
          }
        >
          {renaming === category.id && (
            <div className="mb-3 flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                onChange={event => setName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    renameCategory(category.id, name);
                    setRenaming(null);
                  }

                  if (event.key === 'Escape') {
                    setRenaming(null);
                  }
                }}
                className="h-8 w-56 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
              />

              <Button
                variant="accent"
                onClick={() => {
                  renameCategory(category.id, name);
                  setRenaming(null);
                }}
              >
                Rename
              </Button>

              <Button variant="ghost" onClick={() => setRenaming(null)}>
                Cancel
              </Button>
            </div>
          )}

          {inCategory(category.id).length > 0 ? (
            <Grid>{cardsFor(inCategory(category.id))}</Grid>
          ) : (
            <Empty>Drop audio files here to add them to {category.name}.</Empty>
          )}
        </Section>
      ))}

      <Section
        label="Unfiled"
        hint="Drag audio files anywhere onto this tab. They stay on this machine — nothing is uploaded."
        onDropFiles={dropInto(null)}
        actions={
          naming ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                value={name}
                placeholder="Group name"
                onChange={event => setName(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    createCategory();
                  }

                  if (event.key === 'Escape') {
                    setNaming(false);
                  }
                }}
                className="h-8 w-44 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
                  placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
              />

              <Button variant="accent" onClick={createCategory} disabled={!name.trim()}>
                Create
              </Button>

              <Button variant="ghost" onClick={() => setNaming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="secondary" icon={<HiOutlinePlus className="text-sm" />} onClick={() => setNaming(true)}>
              New group
            </Button>
          )
        }
      >
        {inCategory(null).length > 0 ? (
          <Grid>{cardsFor(inCategory(null))}</Grid>
        ) : (
          <Empty>Drop an MP3 here from Finder or Explorer.</Empty>
        )}
      </Section>

      {/* Shipped catalogue, shown only where a church has actually put files. */}
      {MUSIC_CATEGORIES.filter(category => category.tracks.length > 0).map(category => (
        <Section key={category.id} label={category.label} hint={category.hint}>
          <Grid>{cardsFor(category.tracks)}</Grid>
        </Section>
      ))}

      <Section label="Add by URL" hint="Anything reachable over http(s) — a file on your own server, for instance.">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={url}
            placeholder="https://example.com/track.mp3"
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="h-8 min-w-[240px] flex-1 rounded-studio border border-studio-border px-2.5 text-xs
              text-studio-text placeholder:text-studio-faint focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          />
          <input
            type="text"
            value={title}
            placeholder="Title (optional)"
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            className="h-8 w-44 rounded-studio border border-studio-border px-2.5 text-xs text-studio-text
              placeholder:text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          />
          <Button variant="accent" onClick={add} disabled={!url.trim()}>
            Add
          </Button>
        </div>
      </Section>

      <ConfirmDialog
        open={Boolean(confirmingRemove)}
        title="Delete this group?"
        message={`“${confirmingRemove?.name}” is removed. The tracks in it are kept and become unfiled.`}
        confirmLabel="Delete group"
        onCancel={() => setConfirmingRemove(null)}
        onConfirm={() => {
          removeCategory(confirmingRemove.id);
          setConfirmingRemove(null);
        }}
      />
    </div>
  );
};

export default AudioLibrary;
