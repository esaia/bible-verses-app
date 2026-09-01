import { useId } from 'react';
import Toggle from '../ui/Toggle';
import { useStudio } from '../StudioProvider';
import { LANGS, LANG_LABELS } from '../useChapter';

/**
 * The two stream controls an operator touches mid-service: the on-air blank,
 * and which language the lower third carries. Lives in the rail rather than
 * behind the settings dialog; the connection and the look stay in settings.
 */
const StreamSection = () => {
  const { obsHidden, setObsHidden, streamLang, setStreamLang, enabled } = useStudio();

  // The rail is rendered twice below `lg` — once as the desktop column, once
  // inside the drawer — and a radio group is scoped to the document by name,
  // not to its container. Sharing one name let the browser uncheck the visible
  // copy the moment React checked the hidden one, so the chosen language took
  // effect with nothing on screen marked. Each rail gets its own group.
  const group = useId();

  // Mirrors the fallback the payload applies, so the selected radio always
  // matches what the stream is actually showing.
  const armedLangs = LANGS.filter(lang => enabled[lang]);
  const effectiveLang = armedLangs.includes(streamLang) ? streamLang : armedLangs[0];

  return (
    <div className="space-y-3">
      <div
        className="flex items-center justify-between gap-2 rounded-studio border border-studio-border
          bg-studio-surface px-2.5 py-2"
      >
        <div className="min-w-0">
          <span className="block text-xs font-medium text-studio-text">On air</span>
          <span className="block text-[11px] leading-snug text-studio-faint">
            {obsHidden ? 'Hidden in OBS' : 'Slides visible in OBS'}
          </span>
        </div>

        <Toggle checked={!obsHidden} onChange={next => setObsHidden(!next)} label="Show the lower third in OBS" />
      </div>

      <div>
        <span className="mb-1 block px-0.5 text-[11px] text-studio-faint">Language on stream</span>

        <div className="space-y-0.5">
          {LANGS.map(lang => (
            <label
              key={lang}
              className={`flex items-center gap-2 rounded-studio px-1 py-1.5 text-xs
                ${
                  enabled[lang]
                    ? 'cursor-pointer text-studio-text hover:bg-studio-surface'
                    : 'cursor-not-allowed text-studio-faint'
                }`}
            >
              {/* The input carries the semantics and the keyboard behaviour but
                  is not what you see: `accent-color` left the dot undrawn on
                  iOS, so a language could be chosen and take effect with
                  nothing on screen saying which one was chosen. The mark below
                  is drawn from the input's own :checked state instead, which
                  every browser renders the same way. */}
              <input
                type="radio"
                name={`lowerThirdLanguage-${group}`}
                value={lang}
                disabled={!enabled[lang]}
                checked={effectiveLang === lang}
                onChange={() => setStreamLang(lang)}
                className="peer sr-only"
              />

              <span
                aria-hidden="true"
                className="relative h-4 w-4 shrink-0 rounded-full border border-studio-border bg-white
                  after:absolute after:inset-1 after:rounded-full after:bg-studio-accent after:opacity-0
                  after:transition-opacity after:duration-150 after:content-['']
                  peer-checked:border-studio-accent peer-checked:after:opacity-100
                  peer-focus-visible:ring-2 peer-focus-visible:ring-studio-accent/40 peer-disabled:opacity-40"
              />

              <span className="truncate">
                {LANG_LABELS[lang]}
                {!enabled[lang] && <span className="ml-1 text-[11px] text-studio-faint">· not armed</span>}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StreamSection;
