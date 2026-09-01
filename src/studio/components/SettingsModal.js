import { MdOutlineSlideshow, MdOutlineVideocam } from 'react-icons/md';
import Modal from '../ui/Modal';
import StyleSection from './StyleSection';
import ObsSection from './ObsSection';
import { useStudio } from '../StudioProvider';

const PANELS = [
  { id: 'projector', label: 'Projector', Icon: MdOutlineSlideshow, Panel: StyleSection },
  { id: 'stream', label: 'Stream', Icon: MdOutlineVideocam, Panel: ObsSection },
];

/**
 * Everything that is set up once before a service — backgrounds, typefaces,
 * the OBS bridge — lives here rather than in the rail, which is left with the
 * handful of controls an operator touches while the service is running.
 */
const SettingsModal = () => {
  const { settingsTab, openSettings, closeSettings } = useStudio();

  const active = PANELS.find(panel => panel.id === settingsTab) || PANELS[0];
  const { Panel } = active;

  return (
    <Modal
      open={Boolean(settingsTab)}
      onClose={closeSettings}
      width="max-w-4xl"
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
          <h2 className="shrink-0 text-sm font-semibold text-studio-text">Settings</h2>

          <nav
            aria-label="Settings"
            className="flex items-center gap-0.5 rounded-studio border border-studio-border bg-studio-surface p-0.5"
          >
            {PANELS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={active.id === id ? 'page' : undefined}
                onClick={() => openSettings(id)}
                className={`inline-flex h-7 items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium
                  transition-colors duration-150 focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-studio-accent/40
                  ${active.id === id ? 'bg-white text-studio-text shadow-studio' : 'text-studio-muted hover:text-studio-text'}`}
              >
                <Icon className="text-sm" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      }
    >
      <div className="py-2">
        <Panel />
      </div>
    </Modal>
  );
};

export default SettingsModal;
