import { HiOutlinePause, HiOutlinePlay, HiOutlineRefresh, HiOutlineVolumeUp, HiOutlineX } from 'react-icons/hi';
import IconButton from '../ui/IconButton';
import { useAudio } from '../AudioProvider';

const clock = seconds => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }

  const total = Math.floor(seconds);

  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/**
 * Transport for whatever is playing, kept mounted on both tabs so the bed can
 * be faded or stopped without leaving the passage the operator is presenting.
 */
const AudioBar = () => {
  const { current, playing, position, duration, volume, loop, togglePlay, stop, seek, setVolume, setLoop } = useAudio();

  if (!current) {
    return null;
  }

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-t border-studio-border bg-white px-3 sm:gap-3 sm:px-4">
      <IconButton label={playing ? 'Fade out' : 'Play'} onClick={togglePlay}>
        {playing ? <HiOutlinePause className="text-base" /> : <HiOutlinePlay className="text-base" />}
      </IconButton>

      <div className="hidden w-40 shrink-0 sm:block">
        <p className="truncate text-xs font-medium text-studio-text">{current.title}</p>
        <p className="truncate text-[11px] text-studio-faint">{current.artist}</p>
      </div>

      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-studio-muted">{clock(position)}</span>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.5}
        value={Math.min(position, duration || 0)}
        aria-label="Seek"
        disabled={!duration}
        onChange={e => seek(Number(e.target.value))}
        className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border
          disabled:cursor-default"
      />

      <span className="w-9 shrink-0 text-[11px] tabular-nums text-studio-muted">{clock(duration)}</span>

      <button
        type="button"
        aria-pressed={loop}
        title={loop ? 'Looping' : 'Play once'}
        onClick={() => setLoop(!loop)}
        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-studio transition-colors
          duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
          ${loop ? 'bg-studio-accent text-white' : 'text-studio-muted hover:bg-studio-surface hover:text-studio-text'}`}
      >
        <HiOutlineRefresh className="text-base" />
      </button>

      <span className="hidden shrink-0 items-center gap-1.5 md:flex">
        <HiOutlineVolumeUp className="text-base text-studio-faint" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-label="Volume"
          onChange={e => setVolume(Number(e.target.value))}
          className="studio-range h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-studio-border"
        />
      </span>

      <IconButton label="Stop and clear" onClick={stop}>
        <HiOutlineX className="text-base" />
      </IconButton>
    </div>
  );
};

export default AudioBar;
