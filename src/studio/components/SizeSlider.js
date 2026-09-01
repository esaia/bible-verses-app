import { useStudio } from '../StudioProvider';

const MIN = 120;
const MAX = 420;

/** Scales the verse cards, like the zoom slider in a presentation app. */
const SizeSlider = () => {
  const { cardSize, setCardSize } = useStudio();

  return (
    <div className="flex h-11 shrink-0 items-center justify-end gap-3 border-t border-studio-border bg-white px-3 sm:px-4">
      <span className="text-[11px] text-studio-faint">Card size</span>
      <input
        type="range"
        min={MIN}
        max={MAX}
        step={10}
        value={cardSize}
        aria-label="Verse card size"
        onChange={e => setCardSize(Number(e.target.value))}
        className="studio-range h-1.5 w-28 cursor-pointer sm:w-48 appearance-none rounded-full bg-studio-border"
      />
    </div>
  );
};

export default SizeSlider;
