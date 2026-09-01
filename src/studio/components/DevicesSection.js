import { useState, useSyncExternalStore } from 'react';
import {
  MdCheck,
  MdContentCopy,
  MdOutlineDesktopWindows,
  MdOutlinePhoneIphone,
  MdOutlineVideocam,
  MdRefresh,
} from 'react-icons/md';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { Field } from './StyleSection';
import { CopyField } from './ObsHelpModal';
import { useStudio } from '../StudioProvider';
import { getRelayState, newRoom, subscribeRelayState, validRoom } from '../../lib/relay';

/**
 * What the room should contain, and what each one being absent means. Before
 * this the only way to know whether OBS had actually connected was to go and
 * look at OBS.
 */
const OUTPUTS = [
  { role: 'show', label: 'Projector', Icon: MdOutlineDesktopWindows, hint: 'Open the Screen link on that machine.' },
  { role: 'lower3rd', label: 'Stream', Icon: MdOutlineVideocam, hint: 'Paste the OBS link into a Browser Source.' },
  {
    role: 'console',
    label: 'Consoles',
    Icon: MdOutlinePhoneIphone,
    hint: 'This one. Open the Phone link to add another.',
  },
];

/** Consoles are counted; an output is simply there or not. */
const countLabel = (role, count) => {
  if (role === 'console') {
    return count === 1 ? 'Just this one' : `${count} connected`;
  }

  return count > 0 ? 'Connected' : 'Not yet';
};

const STATUS = {
  idle: { label: 'Off', tone: 'bg-studio-border' },
  connecting: { label: 'Connecting…', tone: 'bg-amber-400' },
  connected: { label: 'Connected', tone: 'bg-studio-go' },
};

/**
 * The room this console publishes into, and the three links that carry it.
 *
 * Everything an operator has to do to put slides on a stream now lives here:
 * paste one URL into a Browser Source. There is no WebSocket server to enable,
 * no password to copy and no requirement that OBS be on this machine — the
 * outputs connect out to the relay rather than the console reaching in.
 */
const DevicesSection = () => {
  const { room, setRoom } = useStudio();
  const relay = useSyncExternalStore(subscribeRelayState, getRelayState);

  const [entry, setEntry] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState(false);

  const status = STATUS[relay.status] || STATUS.idle;
  const origin = window.location.origin;

  const link = path => `${origin}${path}?room=${room}`;

  const copyRoom = () => {
    navigator.clipboard?.writeText(room).then(
      () => {
        setCopiedRoom(true);
        setTimeout(() => setCopiedRoom(false), 1500);
      },
      () => {},
    );
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field
          label="This service"
          hint="The projector and the stream follow whichever console is publishing into this room."
        >
          <div className="rounded-studio border border-studio-border bg-studio-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className={`h-2 w-2 shrink-0 rounded-full ${status.tone}`} />
                <span className="truncate text-xs font-medium text-studio-text">{status.label}</span>
              </span>

              <button
                type="button"
                onClick={copyRoom}
                aria-label={copiedRoom ? 'Copied' : 'Copy the room code'}
                title={copiedRoom ? 'Copied' : 'Copy the room code'}
                className="flex h-7 items-center gap-1.5 rounded-studio border border-studio-border bg-white
                  px-2 font-mono text-[12px] text-studio-text transition-colors duration-150
                  hover:bg-studio-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
              >
                {room}
                {copiedRoom ? <MdCheck className="text-studio-go" /> : <MdContentCopy className="text-studio-faint" />}
              </button>
            </div>

            {!relay.configured && (
              <p className="mt-3 text-[11px] leading-relaxed text-studio-danger">
                No relay is configured in this build, so the projector and stream only follow a console in this browser.
              </p>
            )}
          </div>
        </Field>

        <Field label="Connected" hint="Live from the room itself, so it says what is really there.">
          <div className="overflow-hidden rounded-studio border border-studio-border">
            {OUTPUTS.map(({ role, label, Icon, hint }) => {
              // The console counts itself, so a lone operator reads 1 here and
              // 2 once a phone joins; the outputs are simply on or off.
              const count = relay.peers?.[role] || 0;

              return (
                <div
                  key={role}
                  className="flex items-center gap-2 border-b border-studio-divider px-2.5 py-2 last:border-b-0"
                >
                  <Icon className={`shrink-0 text-base ${count > 0 ? 'text-studio-text' : 'text-studio-faint'}`} />

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-studio-text">{label}</span>
                    {count === 0 && <span className="block text-[11px] text-studio-faint">{hint}</span>}
                  </span>

                  <span
                    className={`shrink-0 text-[11px] font-medium ${count > 0 ? 'text-studio-go' : 'text-studio-faint'}`}
                  >
                    {countLabel(role, count)}
                  </span>
                </div>
              );
            })}
          </div>
        </Field>

        <Field label="Links" hint="Each one carries the room, so nothing has to be typed at the other end.">
          <div className="space-y-2">
            <CopyField label="OBS" value={link('/lower3rd')} />
            <CopyField label="Screen" value={link('/show')} />
            <CopyField label="Phone" value={link('/studio')} />
          </div>
        </Field>
      </div>

      <div className="space-y-4">
        <Field
          label="Join another room"
          hint="Paste a code to take over an existing service — after clearing this browser's data, say."
        >
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={entry}
              placeholder="16-character code"
              onChange={e => setEntry(e.target.value.trim().toLowerCase())}
              className="h-8 w-full min-w-0 rounded-studio border border-studio-border bg-white px-2.5
                font-mono text-[12px] text-studio-text placeholder:font-sans placeholder:text-studio-faint
                focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />

            <Button
              variant="secondary"
              disabled={!validRoom(entry) || entry === room}
              onClick={() => {
                setRoom(entry);
                setEntry('');
              }}
            >
              Join
            </Button>
          </div>
        </Field>

        <Field
          label="New code"
          hint="Anyone holding the current code can watch and push slides. A new one locks them out — and means
            re-pasting the links above into OBS."
        >
          <Button variant="secondary" icon={<MdRefresh className="text-sm" />} onClick={() => setRegenerating(true)}>
            Generate a new code
          </Button>
        </Field>
      </div>

      <ConfirmDialog
        open={regenerating}
        title="Generate a new code?"
        message="The projector and Browser Source will stop following this console until the new links are pasted
          in again."
        confirmLabel="Generate"
        onCancel={() => setRegenerating(false)}
        onConfirm={() => {
          setRoom(newRoom());
          setRegenerating(false);
        }}
      />
    </div>
  );
};

export default DevicesSection;
