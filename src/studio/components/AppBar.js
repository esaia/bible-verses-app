import { Link } from 'react-router-dom';
import {
  HiOutlineExternalLink,
  HiOutlineDesktopComputer,
  HiOutlineBookOpen,
  HiOutlineMusicNote,
  HiOutlineMicrophone,
  HiOutlineCog,
} from 'react-icons/hi';
import Button from '../ui/Button';
import { useStudio } from '../StudioProvider';

const TABS = [
  { id: 'bible', label: 'Bible', Icon: HiOutlineBookOpen },
  { id: 'lyrics', label: 'Lyrics', Icon: HiOutlineMicrophone },
  { id: 'audio', label: 'Audio', Icon: HiOutlineMusicNote },
];

const AppBar = () => {
  const { previewOpen, togglePreview, clearProjector, tab, setTab, openSettings } = useStudio();

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-studio-border bg-white px-4">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-sm font-semibold text-studio-text">Bible Presenter</span>
        <span className="hidden text-xs text-studio-faint sm:inline">Studio</span>
        <span
          title="Beta — this console is still being built, so expect the odd bug. Keep the classic view handy."
          className="flex shrink-0 items-center gap-1.5 text-[11px] text-studio-faint"
        >
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
          BETA
        </span>
      </div>

      <nav
        aria-label="Workspace"
        className="flex items-center gap-0.5 rounded-studio border border-studio-border bg-studio-surface p-0.5"
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => setTab(id)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-[4px] px-3 text-xs font-medium
              transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
              ${tab === id ? 'bg-white text-studio-text shadow-studio' : 'text-studio-muted hover:text-studio-text'}`}
          >
            <Icon className="text-sm" />
            {label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePreview}
          aria-pressed={previewOpen}
          title="Preview window"
          className={`inline-flex h-8 items-center gap-1.5 rounded-studio border px-3 text-xs font-medium
            transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
            ${
              previewOpen
                ? 'border-studio-accent bg-studio-accent text-white'
                : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface'
            }`}
        >
          <HiOutlineDesktopComputer className="text-sm" />
          Preview
        </button>

        <button
          type="button"
          onClick={() => openSettings('projector')}
          title="Settings — background, type, OBS"
          className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-white px-3
            text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface
            focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        >
          <HiOutlineCog className="text-sm" />
          Settings
        </button>

        <Link
          to="/"
          className="inline-flex h-8 items-center rounded-studio border border-studio-border bg-white px-3
            text-xs font-medium text-studio-muted transition-colors duration-150 hover:bg-studio-surface
            hover:text-studio-text"
        >
          Classic view
        </Link>

        <Link
          to="/show"
          target="_blank"
          className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border
            bg-white px-3 text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface"
        >
          <HiOutlineExternalLink className="text-sm" />
          Open Projector
        </Link>

        <Button variant="primary" onClick={clearProjector}>
          Clear
        </Button>
      </div>
    </header>
  );
};

export default AppBar;
