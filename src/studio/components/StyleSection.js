import { MdFormatAlignCenter, MdFormatAlignLeft, MdFormatAlignRight } from 'react-icons/md';
import Select from '../ui/Select';
import { useStudio } from '../StudioProvider';
import { THEMES } from '../../data/themes';
import { MAX_TRANSITION_MS, MIN_TRANSITION_MS } from '../../lib/transition';

const ALIGNMENTS = [
  { value: 'left', label: 'Align left', Icon: MdFormatAlignLeft },
  { value: 'center', label: 'Align center', Icon: MdFormatAlignCenter },
  { value: 'right', label: 'Align right', Icon: MdFormatAlignRight },
];

// Only the first two are Georgian-only / Latin-only; the rest cover Georgian,
// Latin and Cyrillic, so one typeface serves all three projector languages.
const FONTS = [
  { value: 'font-banner', label: 'BPG Banner Caps (Georgian)' },
  { value: 'font-valera', label: 'Varela Round (Latin)' },
  { value: 'font-firago', label: 'FiraGO' },
  { value: 'font-notosans', label: 'Noto Sans' },
  { value: 'font-notoserif', label: 'Noto Serif' },
];

/**
 * Writes the same `themeNumber` / `dynamicImage` / `font` keys the projector
 * has always read, so backgrounds set here work on `/show` unchanged.
 */
const StyleSection = () => {
  const {
    projectorFont,
    setProjectorFont,
    theme,
    setTheme,
    dynamicImage,
    setDynamicImage,
    textAlign,
    setTextAlign,
    transitionMs,
    setTransitionMs,
  } = useStudio();

  return (
    <div className="space-y-3">
      <div
        className="studio-scroll max-h-[188px] overflow-y-auto rounded-studio border border-studio-border
          bg-studio-surface p-1.5"
      >
        <div className="grid grid-cols-4 gap-1.5">
          {THEMES.map(item => (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              title={item.label}
              onClick={() => setTheme(item.id)}
              className={`overflow-hidden rounded-[4px] transition-shadow duration-150 focus:outline-none
                ${
                  theme === item.id ? 'ring-2 ring-studio-accent' : 'ring-1 ring-studio-border hover:ring-studio-faint'
                }`}
            >
              <img src={item.src} alt="" loading="lazy" className="h-9 w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={dynamicImage}
          placeholder="Custom image URL"
          onChange={e => setDynamicImage(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-studio border border-studio-border px-2.5 text-xs
            text-studio-text placeholder:text-studio-faint focus:outline-none
            focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        />
        <button
          type="button"
          onClick={() => setTheme('dynamicIMG')}
          className={`h-8 shrink-0 rounded-studio border px-2.5 text-xs font-medium transition-colors duration-150
            ${
              theme === 'dynamicIMG'
                ? 'border-studio-accent bg-studio-accent text-white'
                : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface'
            }`}
        >
          Use
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <Select className="min-w-0 flex-1" value={projectorFont} onChange={setProjectorFont} options={FONTS} />

        <div className="flex shrink-0 items-center gap-0.5 rounded-studio border border-studio-border p-0.5">
          {ALIGNMENTS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              aria-label={label}
              title={label}
              aria-pressed={textAlign === value}
              onClick={() => setTextAlign(value)}
              className={`flex h-6 w-6 items-center justify-center rounded-[4px] transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
                ${
                  textAlign === value
                    ? 'bg-studio-accent text-white'
                    : 'text-studio-muted hover:bg-studio-surface hover:text-studio-text'
                }`}
            >
              <Icon className="text-sm" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-studio-faint">Transition</span>

        <input
          type="range"
          min={MIN_TRANSITION_MS}
          max={MAX_TRANSITION_MS}
          step={10}
          value={transitionMs}
          aria-label="Slide transition duration in milliseconds"
          onChange={e => setTransitionMs(e.target.value)}
          className="studio-range h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-studio-border"
        />

        <span className="w-12 shrink-0 text-right text-[11px] tabular-nums text-studio-muted">
          {transitionMs === 0 ? 'Off' : `${transitionMs}ms`}
        </span>
      </div>
    </div>
  );
};

export default StyleSection;
