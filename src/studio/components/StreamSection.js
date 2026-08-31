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
              className={`flex items-center gap-2 rounded-studio px-1 py-1 text-xs
                ${
                  enabled[lang]
                    ? 'cursor-pointer text-studio-text hover:bg-studio-surface'
                    : 'cursor-not-allowed text-studio-faint'
                }`}
            >
              <input
                type="radio"
                name="lowerThirdLanguage"
                value={lang}
                disabled={!enabled[lang]}
                checked={effectiveLang === lang}
                onChange={() => setStreamLang(lang)}
                className="h-3.5 w-3.5 shrink-0 accent-studio-accent"
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
