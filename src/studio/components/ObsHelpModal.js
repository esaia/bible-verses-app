import Modal from '../ui/Modal';

/**
 * In-app setup instructions for the OBS bridge. The steps live here rather
 * than only in the repo docs because the person setting up the stream is often
 * not the person who has the repository checked out.
 */

const Code = ({ children }) => (
  <code className="rounded-[4px] border border-studio-border bg-studio-surface px-1.5 py-0.5 font-mono text-[12px] text-studio-text">
    {children}
  </code>
);

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
      {where && <p className="mt-0.5 font-mono text-[11px] text-studio-faint">{where}</p>}
      <div className="mt-1.5 space-y-1.5 text-xs leading-relaxed text-studio-muted">{children}</div>
    </div>
  </li>
);

const Row = ({ symptom, meaning }) => (
  <tr className="border-b border-studio-divider last:border-b-0">
    <td className="w-[38%] py-2 pr-3 align-top text-xs font-medium text-studio-text">{symptom}</td>
    <td className="py-2 align-top text-xs leading-relaxed text-studio-muted">{meaning}</td>
  </tr>
);

const ObsHelpModal = ({ open, onClose, sourceUrl }) => (
  <Modal open={open} onClose={onClose} title="OBS lower third — setup" width="max-w-2xl">
    <div className="space-y-6 pb-4">
      <p className="text-xs leading-relaxed text-studio-muted">
        Sends whatever is live in the studio to OBS as a lower third, keyed over your camera. Needs{' '}
        <strong className="font-semibold text-studio-text">OBS 28 or newer</strong> — the WebSocket server is built in,
        so there is no plugin to install.
      </p>

      <ol className="space-y-4">
        <Step n="1" title="Turn on the WebSocket server" where="OBS → Tools → WebSocket Server Settings">
          <p>
            Tick <strong className="font-semibold text-studio-text">Enable WebSocket server</strong> and leave the port
            at <Code>4455</Code>. Press <strong className="font-semibold text-studio-text">Show Connect Info</strong>{' '}
            and copy the password.
          </p>
        </Step>

        <Step n="2" title="Add the Browser Source" where="OBS → Sources → + → Browser">
          <p>
            Set the URL to <Code>{sourceUrl}</Code>, size <Code>1920</Code> × <Code>1080</Code>, and leave{' '}
            <strong className="font-semibold text-studio-text">Shutdown source when not visible</strong> unticked — with
            it on, OBS destroys the page whenever the scene is inactive and the overlay stops updating.
          </p>
          <p>
            Then drag the Browser source <strong className="font-semibold text-studio-text">above your camera</strong>{' '}
            in the Sources list. It is transparent, so anything above it hides it.
          </p>
        </Step>

        <Step n="3" title="Connect" where="This panel">
          <p>
            Paste the password, flip the toggle, and wait for the green dot. The{' '}
            <strong className="font-semibold text-studio-text">Slides delivered</strong> count climbs each time you
            change verse — that is the quickest proof the link is alive.
          </p>
          <p>
            <strong className="font-semibold text-studio-text">Show on stream</strong> blanks the overlay without
            dropping the connection, so verses can come off the stream while staying on the projector. Below it,{' '}
            <strong className="font-semibold text-studio-text">Language on stream</strong> picks the one language the
            overlay shows — only languages armed for the projector are available, since those are the ones fetched.
          </p>
        </Step>
      </ol>

      <div className="rounded-studio border border-amber-300 bg-amber-50 p-3.5">
        <h4 className="text-sm font-semibold text-studio-text">The console has to run on localhost</h4>
        <p className="mt-1.5 text-xs leading-relaxed text-studio-muted">
          Browsers refuse to let a secure <Code>https://</Code> page open an insecure <Code>ws://</Code> connection, and
          OBS only speaks plain <Code>ws://</Code>. So this console must be opened from{' '}
          <Code>http://localhost:3000/studio</Code> to reach OBS — the hosted address cannot, and no setting changes
          that.
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-studio-muted">
          Only the console is affected. The projector window and the Browser Source are unaffected.
        </p>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-studio-faint">When nothing appears</h3>

        <p className="mt-2 text-xs leading-relaxed text-studio-muted">
          Add <Code>?debug=1</Code> to the Browser Source URL and press{' '}
          <strong className="font-semibold text-studio-text">Refresh</strong> on the source. A panel appears in the
          corner showing what the page is receiving; it stays visible even when the overlay correctly is not. Take it
          off again when you are done.
        </p>

        <table className="mt-3 w-full border-collapse">
          <tbody>
            <Row
              symptom="Black screen"
              meaning="Usually correct. A transparent overlay over an empty scene is black — put a camera or an image behind it before judging."
            />
            <Row
              symptom="No debug panel"
              meaning="The page is not loading at all. Check the console is still being served, then Refresh the source."
            />
            <Row
              symptom="events received: 0"
              meaning="The page is fine but the studio is not reaching it. Check the toggle above is green and a slide is live."
            />
            <Row
              symptom="Panel looks right, screen empty"
              meaning="Almost always the scene. Check the Browser source sits above the camera and its eye icon is on."
            />
            <Row
              symptom="Nothing changed after an update"
              meaning="Reload this console page and Refresh the Browser Source. Both sides have to be reloaded; forgetting the console is the usual culprit."
            />
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-studio-faint">Sending it on as NDI</h3>
        <p className="mt-2 text-xs leading-relaxed text-studio-muted">
          A web page cannot produce NDI itself. Let OBS do it: install the{' '}
          <strong className="font-semibold text-studio-text">DistroAV</strong> plugin and switch on its NDI output. OBS
          then broadcasts the whole program, lower third included, to vMix or any other NDI receiver.
        </p>
      </div>
    </div>
  </Modal>
);

export default ObsHelpModal;
