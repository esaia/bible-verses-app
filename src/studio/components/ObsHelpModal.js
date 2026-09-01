import { useState } from 'react';
import { MdCheck, MdChevronRight, MdContentCopy } from 'react-icons/md';
import Modal from '../ui/Modal';

/**
 * In-app setup for the OBS bridge: three steps and the two values that have to
 * be typed into OBS. Everything an operator only needs when something is wrong
 * is folded away — the docs in `docs/obs-lower-third.md` carry the long form.
 */

const Code = ({ children }) => (
  <code
    className="rounded-[4px] border border-studio-border bg-studio-surface px-1.5 py-0.5 font-mono
      text-[12px] text-studio-text"
  >
    {children}
  </code>
);

const Strong = ({ children }) => <strong className="font-semibold text-studio-text">{children}</strong>;

/** A value to be carried into OBS, with the copy button next to it. */
const CopyField = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };

  return (
    <div className="flex items-center gap-1.5">
      <span className="w-10 shrink-0 text-[11px] text-studio-faint">{label}</span>

      <input
        readOnly
        value={value}
        onFocus={e => e.target.select()}
        className="h-8 min-w-0 flex-1 rounded-studio border border-studio-border bg-studio-surface px-2.5
          font-mono text-[12px] text-studio-text focus:outline-none focus-visible:ring-2
          focus-visible:ring-studio-accent/40"
      />

      <button
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : `Copy the ${label.toLowerCase()}`}
        title={copied ? 'Copied' : `Copy the ${label.toLowerCase()}`}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-studio border bg-white
          transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
          ${
            copied
              ? 'border-studio-go text-studio-go'
              : 'border-studio-border text-studio-muted hover:bg-studio-surface hover:text-studio-text'
          }`}
      >
        {copied ? <MdCheck className="text-base" /> : <MdContentCopy className="text-sm" />}
      </button>
    </div>
  );
};

const Step = ({ n, title, where, children }) => (
  <li className="grid grid-cols-[28px_1fr] gap-3">
    <span
      className="flex h-7 w-7 items-center justify-center rounded-studio border border-studio-border
        bg-studio-surface font-mono text-xs font-semibold text-studio-accent"
    >
      {n}
    </span>

    <div className="min-w-0 pt-0.5">
      <h4 className="text-sm font-semibold text-studio-text">{title}</h4>
      <p className="mt-0.5 font-mono text-[11px] text-studio-faint">{where}</p>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-studio-muted">{children}</div>
    </div>
  </li>
);

/** Folded-away detail. Native disclosure, so no state and no keyboard work. */
const More = ({ title, children }) => (
  <details className="group rounded-studio border border-studio-border">
    <summary
      className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium
        text-studio-text marker:content-none hover:bg-studio-surface"
    >
      <MdChevronRight className="text-base text-studio-faint transition-transform duration-150 group-open:rotate-90" />
      {title}
    </summary>

    <div className="space-y-2 border-t border-studio-divider px-3 py-2.5 text-xs leading-relaxed text-studio-muted">
      {children}
    </div>
  </details>
);

const ObsHelpModal = ({ open, onClose, sourceUrl }) => {
  // Mixed-content blocking exempts loopback, so an https console drives OBS on
  // this machine fine — the note is about the cases it does not cover, and is
  // only shown to the operator it could apply to.
  const insecure = window.location.protocol === 'https:';

  return (
    <Modal open={open} onClose={onClose} title="Set up the OBS lower third" width="max-w-xl">
      <div className="space-y-5 pb-4">
        <p className="text-xs leading-relaxed text-studio-muted">
          Needs <Strong>OBS 28 or newer</Strong> — the WebSocket server is already built in.
        </p>

        <ol className="space-y-4">
          <Step n="1" title="Turn on the WebSocket server" where="OBS → Tools → WebSocket Server Settings">
            <p>
              Tick <Strong>Enable WebSocket server</Strong>, then <Strong>Show Connect Info</Strong> and copy the
              password.
            </p>
          </Step>

          <Step n="2" title="Add the Browser Source" where="OBS → Sources → + → Browser">
            <CopyField label="URL" value={sourceUrl} />

            <p>
              Size <Code>1920</Code> × <Code>1080</Code>. Leave <Strong>Shutdown source when not visible</Strong>{' '}
              unticked, and drag the source <Strong>above your camera</Strong>.
            </p>
          </Step>

          <Step n="3" title="Connect" where="Back in this panel">
            <p>
              Paste the password, flip the toggle, wait for the green dot. <Strong>Slides delivered</Strong> climbing is
              the proof it works.
            </p>
          </Step>
        </ol>

        {insecure && (
          <div className="rounded-studio border border-amber-300 bg-amber-50 p-3">
            <h4 className="text-xs font-semibold text-studio-text">If OBS is on another device</h4>
            <p className="mt-1 text-xs leading-relaxed text-studio-muted">
              This page can open a <Code>ws://</Code> connection to <Code>127.0.0.1</Code> — OBS on this machine — but
              not to another computer's address, which mixed-content blocking refuses. To run the console from a phone
              or a second machine, open it over <Code>http://</Code> on your network, or put a <Code>wss://</Code>{' '}
              endpoint in front of obs-websocket. Safari refuses <Code>ws://</Code> from an <Code>https://</Code> page
              altogether, loopback included.
            </p>
          </div>
        )}

        <div className="space-y-2">
          <More title="Nothing is showing up in OBS">
            <p>
              Add <Code>?debug=1</Code> to the Browser Source URL and <Strong>Refresh</Strong> the source — a panel in
              the corner shows what the page is receiving.
            </p>
            <ul className="space-y-1.5">
              <li>
                <Strong>Black screen</Strong> — usually correct; the overlay is transparent, so put a camera behind it.
              </li>
              <li>
                <Strong>No debug panel</Strong> — the page is not loading. Check the console is still being served.
              </li>
              <li>
                <Strong>events received: 0</Strong> — the studio is not reaching it. Check the dot is green and a slide
                is live.
              </li>
              <li>
                <Strong>Panel right, screen empty</Strong> — the source is under the camera, or its eye is off.
              </li>
              <li>
                <Strong>Nothing changed after an update</Strong> — reload this console <em>and</em> refresh the source.
              </li>
            </ul>
          </More>

          <More title="Sending it on as NDI">
            <p>
              A web page cannot produce NDI. Install the <Strong>DistroAV</Strong> plugin in OBS and switch on its NDI
              output — OBS then broadcasts the whole program, lower third included.
            </p>
          </More>
        </div>
      </div>
    </Modal>
  );
};

export default ObsHelpModal;
