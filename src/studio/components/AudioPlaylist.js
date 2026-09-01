import { useState } from 'react';
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlinePlus,
  HiOutlineX,
} from 'react-icons/hi';
import IconButton from '../ui/IconButton';
import { useAudio } from '../AudioProvider';
import { useStudio } from '../StudioProvider';

/** Three bars, animated only on the track actually playing. */
const Equalizer = () => (
  <span className="flex h-3 items-end gap-[2px]">
    {[0, 150, 300].map(delay => (
      <span
        key={delay}
        className="w-[3px] animate-pulse rounded-full bg-current"
        style={{ height: delay === 150 ? 12 : 8, animationDelay: `${delay}ms` }}
      />
    ))}
  </span>
);

const clock = seconds => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }

  const total = Math.round(seconds);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** The queue for this service, or one of the operator's groups. */
const PLAYLIST = 'playlist';

/**
 * What this service is going to play, under the preview — the shape a
 * presentation app puts its audio in. The picker at the top switches between
 * the running queue and the groups from the Audio tab, so a bed can be found
 * without leaving the passage that is on screen.
 */
const AudioPlaylist = () => {
  const {
    playlist,
    current,
    playing,
    playTrack,
    removeFromPlaylist,
    movePlaylistItem,
    clearPlaylist,
    addLocalFiles,
    addToPlaylist,
    categories,
    assignments,
    localTracks,
    customTracks,
    durations,
    fadeMs,
    setFadeMs,
  } = useAudio();
  const { setTab } = useStudio();

  const [view, setView] = useState(PLAYLIST);
  const [dragging, setDragging] = useState(false);

  // A group deleted from the Audio tab must not leave the rail looking at
  // nothing.
  const active = view === PLAYLIST || categories.some(category => category.id === view) ? view : PLAYLIST;
  const isQueue = active === PLAYLIST;

  const tracks = isQueue
    ? playlist
    : [...localTracks, ...customTracks].filter(track => (assignments[track.id] || null) === active);

  // Dropped straight onto the rail, a file is meant for this service — so it is
  // queued as well as saved, rather than only landing in the library.
  const drop = async event => {
    event.preventDefault();
    setDragging(false);

    const added = await addLocalFiles(event.dataTransfer.files);

    added.forEach(addToPlaylist);
  };

  return (
    <div
      onDragOver={event => {
        if ([...event.dataTransfer.types].includes('Files')) {
          event.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={event => {
        if (event.currentTarget === event.target) {
          setDragging(false);
        }
      }}
      onDrop={drop}
      className={`flex min-h-0 flex-1 flex-col ${dragging ? 'bg-studio-accent/5 ring-2 ring-inset ring-studio-accent' : ''}`}
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-studio-divider px-2 pl-3">
        <select
          value={active}
          aria-label="Show"
          onChange={event => setView(event.target.value)}
          className="min-w-0 flex-1 cursor-pointer truncate bg-transparent text-[11px] font-semibold uppercase
            tracking-wider text-studio-faint focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        >
          <option value={PLAYLIST}>Audio{playlist.length > 0 ? ` · ${playlist.length}` : ''}</option>
          {categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {isQueue && playlist.length > 0 && (
          <button
            type="button"
            onClick={clearPlaylist}
            className="shrink-0 text-[11px] text-studio-faint transition-colors duration-150 hover:text-studio-text
              focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            Clear
          </button>
        )}
      </div>

      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-studio-faint">
            {dragging ? (
              'Drop to add to this service.'
            ) : isQueue ? (
              <>
                Nothing queued.{' '}
                <button
                  type="button"
                  onClick={() => setTab('audio')}
                  className="font-medium text-studio-accent underline-offset-2 hover:underline focus:outline-none"
                >
                  Open the Audio tab
                </button>{' '}
                and add tracks for this service.
              </>
            ) : (
              'Nothing in this group yet.'
            )}
          </p>
        ) : (
          tracks.map((track, index) => {
            const isCurrent = current?.id === track.id;
            const length = clock(durations[track.id]);

            return (
              <div
                key={track.id}
                className={`group/track flex items-center gap-1 border-b border-studio-divider px-1.5 py-1.5
                  last:border-b-0 ${isCurrent ? 'bg-studio-accent/10' : 'hover:bg-studio-surface'}`}
              >
                <button
                  type="button"
                  onClick={() => playTrack(track)}
                  title={isCurrent && playing ? 'Fade out' : `Play ${track.title}`}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-studio px-1 py-0.5 text-left
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-studio
                      ${isCurrent ? 'bg-studio-accent text-white' : 'bg-studio-slide text-white'}`}
                  >
                    {isCurrent && playing ? (
                      <Equalizer />
                    ) : isCurrent ? (
                      <HiOutlinePause className="text-sm" />
                    ) : (
                      <HiOutlinePlay className="text-sm" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-xs ${
                        isCurrent ? 'font-semibold text-studio-text' : 'text-studio-text'
                      }`}
                    >
                      {track.title}
                    </span>
                    <span className="block truncate text-[11px] text-studio-faint">
                      {length ? `${length} · ${track.artist}` : track.artist}
                    </span>
                  </span>
                </button>

                <span className="flex shrink-0 opacity-0 transition-opacity group-hover/track:opacity-100">
                  {isQueue ? (
                    <>
                      <IconButton
                        label={`Move ${track.title} up`}
                        disabled={index === 0}
                        onClick={() => movePlaylistItem(track.id, -1)}
                      >
                        <HiOutlineArrowUp className="text-sm" />
                      </IconButton>

                      <IconButton
                        label={`Move ${track.title} down`}
                        disabled={index === tracks.length - 1}
                        onClick={() => movePlaylistItem(track.id, 1)}
                      >
                        <HiOutlineArrowDown className="text-sm" />
                      </IconButton>

                      <IconButton
                        label={`Remove ${track.title}`}
                        tone="danger"
                        onClick={() => removeFromPlaylist(track.id)}
                      >
                        <HiOutlineX className="text-sm" />
                      </IconButton>
                    </>
                  ) : (
                    <IconButton
                      label={
                        playlist.some(item => item.id === track.id)
                          ? `${track.title} is already queued`
                          : `Add ${track.title} to this service`
                      }
                      disabled={playlist.some(item => item.id === track.id)}
                      onClick={() => addToPlaylist(track)}
                    >
                      <HiOutlinePlus className="text-sm" />
                    </IconButton>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Set once, before a service, and it governs both the ramp in and the
          ramp out — so a bed can be brought under a prayer and taken away
          again without either being noticed. */}
      <label className="flex h-9 shrink-0 items-center gap-2 border-t border-studio-divider px-3">
        <span className="shrink-0 text-[11px] text-studio-faint">Fade</span>

        <input
          type="range"
          min={0}
          max={5000}
          step={100}
          value={fadeMs}
          aria-label="Fade length"
          onChange={event => setFadeMs(Number(event.target.value))}
          className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border"
        />

        <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-studio-muted">
          {fadeMs === 0 ? 'Off' : `${(fadeMs / 1000).toFixed(1)}s`}
        </span>
      </label>
    </div>
  );
};

export default AudioPlaylist;
