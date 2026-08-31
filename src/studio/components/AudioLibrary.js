import { useState } from 'react';
import { HiOutlinePlay, HiOutlineX } from 'react-icons/hi';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';
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

const TrackCard = ({ track, isCurrent, isPlaying, onPlay, onRemove }) => (
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

    {onRemove && (
      <span className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover/track:opacity-100">
        <IconButton label="Remove this track" tone="danger" onClick={onRemove}>
          <HiOutlineX className="text-sm" />
        </IconButton>
      </span>
    )}
  </div>
);

const Grid = ({ children }) => (
  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
    {children}
  </div>
);

const Category = ({ label, hint, children }) => (
  <section className="py-4">
    <h2 className="text-sm font-semibold text-studio-text">{label}</h2>
    {hint && <p className="mb-3 mt-0.5 text-xs text-studio-muted">{hint}</p>}
    {children}
  </section>
);

/**
 * The Audio tab: the music catalog, browsed the same way the backgrounds are.
 * Categories come from `data/music.js`; anything the operator adds by URL lands
 * in its own category and persists.
 */
const AudioLibrary = () => {
  const { current, playing, playTrack, customTracks, addCustomTrack, removeCustomTrack, error } = useAudio();

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');

  const add = () => {
    const track = addCustomTrack(url, title);

    if (track) {
      setUrl('');
      setTitle('');
    }
  };

  const cardsFor = tracks =>
    tracks.map(track => (
      <TrackCard
        key={track.id}
        track={track}
        isCurrent={current?.id === track.id}
        isPlaying={playing}
        onPlay={() => playTrack(track)}
        onRemove={track.custom ? () => removeCustomTrack(track.id) : undefined}
      />
    ));

  return (
    <div className="mx-auto w-full max-w-5xl divide-y divide-studio-divider">
      {error && (
        <p className="my-3 rounded-studio border border-studio-danger/30 bg-red-50 px-3 py-2 text-xs text-studio-danger">
          {error}
        </p>
      )}

      {MUSIC_CATEGORIES.map(category => (
        <Category key={category.id} label={category.label} hint={category.hint}>
          {category.tracks.length > 0 ? (
            <Grid>{cardsFor(category.tracks)}</Grid>
          ) : (
            <p
              className="rounded-studio border border-dashed border-studio-border px-3 py-6 text-center text-xs
                text-studio-faint"
            >
              No tracks yet. Drop the files in <code className="text-studio-muted">public/audio/</code> and list them
              under <code className="text-studio-muted">{category.id}</code> in{' '}
              <code className="text-studio-muted">src/data/music.js</code> — or add one by URL below.
            </p>
          )}
        </Category>
      ))}

      <Category label="Added by URL" hint="Anything reachable over http(s) — a file on your own server, for instance.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
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

        {customTracks.length > 0 && <Grid>{cardsFor(customTracks)}</Grid>}
      </Category>
    </div>
  );
};

export default AudioLibrary;
