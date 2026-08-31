import { useCallback, useState, useSyncExternalStore } from 'react';
import { MdCheck, MdContentCopy, MdHelpOutline, MdVerticalAlignBottom, MdVerticalAlignTop } from 'react-icons/md';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';
import ObsHelpModal from './ObsHelpModal';
import { useStudio } from '../StudioProvider';
import { configureObs, getObsState, subscribeObs } from '../../lib/obsBridge';
import { LANGS, LANG_LABELS } from '../useChapter';

const STATUS = {
  idle: { label: 'Off', tone: 'bg-studio-border' },
  connecting: { label: 'Connecting…', tone: 'bg-amber-400' },
  connected: { label: 'Connected', tone: 'bg-studio-go' },
  error: { label: 'No connection', tone: 'bg-studio-danger' },
};

// Each look re-points the CSS variables on `.lower3rd-bar`; see `index.css`.
const VARIANTS = [
  { value: 'scrim', label: 'Gradient fade' },
  { value: 'solid', label: 'Solid bar' },
  { value: 'bands', label: 'White bands' },
  { value: 'bandsdark', label: 'Black bands' },
  { value: 'card', label: 'Reference card' },
  { value: 'split', label: 'Split bar' },
  { value: 'plain', label: 'Text only' },
];

const POSITIONS = [
  { value: 'bottom', label: 'Bottom', Icon: MdVerticalAlignBottom },
  { value: 'top', label: 'Top', Icon: MdVerticalAlignTop },
];

const field = `h-8 w-full min-w-0 rounded-studio border border-studio-border px-2.5 text-xs
  text-studio-text placeholder:text-studio-faint focus:outline-none
  focus-visible:ring-2 focus-visible:ring-studio-accent/40`;

/**
 * Connection settings for the OBS bridge, plus the URL to paste into the
 * Browser Source. Reads the bridge directly rather than through StudioProvider
 * because the connection is a long-lived side effect that outlives any render.
 */
const ObsSection = () => {
  const {
    lowerThirdPosition,
    setLowerThirdPosition,
    lowerThirdVariant,
    setLowerThirdVariant,
    lyricsVariant,
    setLyricsVariant,
    obsHidden,
    setObsHidden,
    streamLang,
    setStreamLang,
    enabled,
  } = useStudio();
  const obs = useSyncExternalStore(subscribeObs, getObsState);

  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const sourceUrl = `${window.location.origin}/lower3rd`;

  // Mirrors the fallback the payload applies, so the selected radio always
  // matches what the stream is actually showing.
  const armedLangs = LANGS.filter(lang => enabled[lang]);
  const effectiveLang = armedLangs.includes(streamLang) ? streamLang : armedLangs[0];
  const status = STATUS[obs.status] || STATUS.idle;

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(sourceUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  }, [sourceUrl]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${status.tone}`} />
          <span className="truncate text-xs text-studio-muted">{status.label}</span>
        </div>

        <Toggle checked={obs.enabled} onChange={enabled => configureObs({ enabled })} label="Send slides to OBS" />
      </div>

      {obs.enabled && (
        <>
          <input
            type="text"
            value={obs.url}
            placeholder="ws://127.0.0.1:4455"
            onChange={e => configureObs({ url: e.target.value })}
            className={field}
          />

          <input
            type="password"
            value={obs.password}
            placeholder="obs-websocket password"
            onChange={e => configureObs({ password: e.target.value })}
            className={field}
          />

          {obs.status === 'error' && obs.error && (
            <p className="text-[11px] leading-relaxed text-studio-danger">{obs.error}</p>
          )}

          {obs.status === 'connected' && (
            <p className="text-[11px] leading-relaxed text-studio-muted">
              {obs.emitError ? (
                <span className="text-studio-danger">
                  OBS refused the slide: {obs.emitError}. Add a Browser Source pointing at the URL below, then refresh
                  it.
                </span>
              ) : (
                `Slides delivered: ${obs.sent}`
              )}
            </p>
          )}
        </>
      )}

      {obs.enabled && (
        <div
          className="flex items-center justify-between gap-2 rounded-studio border border-studio-border
          bg-studio-surface px-2.5 py-2"
        >
          <div className="min-w-0">
            <span className="block text-xs font-medium text-studio-text">Show on stream</span>
            <span className="block text-[11px] leading-snug text-studio-faint">
              {obsHidden ? 'Hidden in OBS, still on the projector' : 'Verses visible in OBS'}
            </span>
          </div>

          <Toggle checked={!obsHidden} onChange={next => setObsHidden(!next)} label="Show the lower third in OBS" />
        </div>
      )}

      {/* With the bridge off none of this applies, and an operator who is not
          streaming should not have to scroll past it. */}
      {obs.enabled && (
        <>
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

            <p className="mt-1.5 text-[11px] leading-snug text-studio-faint">
              One language only — a lower third is read at a glance. Pick from the languages armed for the projector
              above; those are the ones actually fetched.
            </p>
          </div>

          <div className="space-y-2">
            <div>
              <span className="mb-1 block px-0.5 text-[11px] text-studio-faint">Style · verses</span>
              <Select className="w-full" value={lowerThirdVariant} onChange={setLowerThirdVariant} options={VARIANTS} />
            </div>

            <div>
              <span className="mb-1 block px-0.5 text-[11px] text-studio-faint">Style · lyrics</span>
              <Select className="w-full" value={lyricsVariant} onChange={setLyricsVariant} options={VARIANTS} />
            </div>
          </div>

          <div>
            <span className="mb-1 block px-0.5 text-[11px] text-studio-faint">Position on screen</span>

            <div className="flex items-center gap-1">
              {POSITIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={lowerThirdPosition === value}
                  onClick={() => setLowerThirdPosition(value)}
                  className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-studio border text-xs
                  font-medium transition-colors duration-150 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-studio-accent/40
                  ${
                    lowerThirdPosition === value
                      ? 'border-studio-accent bg-studio-accent text-white'
                      : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface'
                  }`}
                >
                  <Icon className="text-sm" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block px-0.5 text-[11px] text-studio-faint">Browser Source URL</span>

            <div className="flex items-center gap-1.5">
              <input readOnly value={sourceUrl} className={`${field} bg-studio-surface text-studio-muted`} />

              <button
                type="button"
                onClick={copy}
                aria-label={copied ? 'Copied' : 'Copy the Browser Source URL'}
                title={copied ? 'Copied' : 'Copy the Browser Source URL'}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-studio border
                bg-white transition-colors duration-150 focus:outline-none
                focus-visible:ring-2 focus-visible:ring-studio-accent/40
                ${
                  copied
                    ? 'border-studio-go text-studio-go'
                    : 'border-studio-border text-studio-muted hover:bg-studio-surface hover:text-studio-text'
                }`}
              >
                {/* The icon itself reports the result, so no message has to appear
                  below and shift the controls under it. */}
                {copied ? <MdCheck className="text-base" /> : <MdContentCopy className="text-sm" />}
              </button>
            </div>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setHelpOpen(true)}
        className="flex h-8 w-full items-center justify-center gap-1.5 rounded-studio border
          border-studio-border bg-white text-xs font-medium text-studio-text transition-colors
          duration-150 hover:bg-studio-surface focus:outline-none
          focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      >
        <MdHelpOutline className="text-sm text-studio-muted" />
        How to set this up
      </button>

      <ObsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} sourceUrl={sourceUrl} />
    </div>
  );
};

export default ObsSection;
