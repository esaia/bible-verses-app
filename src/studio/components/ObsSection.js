import { useCallback, useState, useSyncExternalStore } from 'react';
import { MdCheck, MdContentCopy, MdHelpOutline, MdVerticalAlignBottom, MdVerticalAlignTop } from 'react-icons/md';
import Toggle from '../ui/Toggle';
import ObsHelpModal from './ObsHelpModal';
import LowerThirdStylePicker from './LowerThirdStylePicker';
import { Field } from './StyleSection';
import { useStudio } from '../StudioProvider';
import { configureObs, getObsState, subscribeObs } from '../../lib/obsBridge';

export const STATUS = {
  idle: { label: 'Off', tone: 'bg-studio-border' },
  connecting: { label: 'Connecting…', tone: 'bg-amber-400' },
  connected: { label: 'Connected', tone: 'bg-studio-go' },
  error: { label: 'No connection', tone: 'bg-studio-danger' },
};

export const obsStatus = state => STATUS[state.status] || STATUS.idle;

const POSITIONS = [
  { value: 'bottom', label: 'Bottom', Icon: MdVerticalAlignBottom },
  { value: 'top', label: 'Top', Icon: MdVerticalAlignTop },
];

const field = `h-8 w-full min-w-0 rounded-studio border border-studio-border px-2.5 text-xs
  text-studio-text placeholder:text-studio-faint focus:outline-none
  focus-visible:ring-2 focus-visible:ring-studio-accent/40`;

/**
 * The stream panel of the settings dialog: the OBS connection on the left, the
 * look of the lower third on the right. Reads the bridge directly rather than
 * through StudioProvider because the connection is a long-lived side effect
 * that outlives any render.
 */
const ObsSection = () => {
  const { lowerThirdPosition, setLowerThirdPosition } = useStudio();
  const obs = useSyncExternalStore(subscribeObs, getObsState);

  const [copied, setCopied] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const sourceUrl = `${window.location.origin}/lower3rd`;

  const status = obsStatus(obs);

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
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field
          label="Connection"
          hint="Sends the live slide to an OBS Browser Source as a lower third, over a transparent background."
        >
          <div className="rounded-studio border border-studio-border bg-studio-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.tone}`} />
                <span className="truncate text-xs font-medium text-studio-text">{status.label}</span>
              </span>

              <Toggle
                checked={obs.enabled}
                onChange={value => configureObs({ enabled: value })}
                label="Send slides to OBS"
              />
            </div>

            {obs.enabled && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={obs.url}
                  placeholder="ws://127.0.0.1:4455"
                  onChange={e => configureObs({ url: e.target.value })}
                  className={`${field} bg-white`}
                />

                <input
                  type="password"
                  value={obs.password}
                  placeholder="obs-websocket password"
                  onChange={e => configureObs({ password: e.target.value })}
                  className={`${field} bg-white`}
                />

                {/* Shown while re-dialling too, not only in the error state:
                    a retry that keeps failing is still a failure, and the
                    amber pill on its own explains nothing. */}
                {obs.status !== 'connected' && obs.error && (
                  <p className="text-[11px] leading-relaxed text-studio-danger">{obs.error}</p>
                )}

                {obs.status === 'connected' && (
                  <p className="text-[11px] leading-relaxed text-studio-muted">
                    {obs.emitError ? (
                      <span className="text-studio-danger">
                        OBS refused the slide: {obs.emitError}. Add a Browser Source pointing at the URL below, then
                        refresh it.
                      </span>
                    ) : (
                      `Slides delivered: ${obs.sent}`
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        </Field>

        <Field label="Browser Source URL" hint="Paste this into a Browser Source in OBS.">
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
        </Field>

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
      </div>

      {/* With the bridge off none of this applies, and an operator who is not
          streaming should not have to read past it. On air and the stream
          language are not here: they are live controls, so they sit in the
          rail beside the passages. */}
      <div className={`space-y-4 ${obs.enabled ? '' : 'pointer-events-none opacity-40'}`}>
        <LowerThirdStylePicker />

        <Field label="Position on screen">
          <div className="flex items-center gap-1.5">
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
        </Field>
      </div>

      <ObsHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} sourceUrl={sourceUrl} />
    </div>
  );
};

export default ObsSection;
