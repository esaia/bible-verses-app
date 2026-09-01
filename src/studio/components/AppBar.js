import { Link } from 'react-router-dom';
import {
  HiOutlineExternalLink,
  HiOutlineDesktopComputer,
  HiOutlineBookOpen,
  HiOutlineMusicNote,
  HiOutlineMicrophone,
  HiOutlineCog,
  HiOutlineMenu,
} from 'react-icons/hi';
import Button from '../ui/Button';
import { useStudio } from '../StudioProvider';

const TABS = [
  { id: 'bible', label: 'Bible', Icon: HiOutlineBookOpen },
  { id: 'lyrics', label: 'Lyrics', Icon: HiOutlineMicrophone },
  { id: 'audio', label: 'Audio', Icon: HiOutlineMusicNote },
];

/**
 * Wraps to a second row on a narrow window rather than squeezing: the tab
 * switcher keeps its labels, and the actions on the right shed theirs down to
 * bare icons, which is why each one carries a title.
 */
const AppBar = ({ onOpenNav }) => {
  const { previewOpen, togglePreview, clearProjector, tab, setTab, openSettings } = useStudio();

  return (
    <header
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b
        border-studio-border bg-white px-3 py-2 sm:px-4 lg:h-12 lg:flex-nowrap lg:gap-4 lg:py-0"
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open setup"
          title="Setup — languages, projector, stream"
          className="-ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-studio
            text-studio-muted transition-colors duration-150 hover:bg-studio-surface hover:text-studio-text
            focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 lg:hidden"
        >
          <HiOutlineMenu className="text-lg" />
        </button>

        <span className="truncate text-sm font-semibold text-studio-text">Bible Presenter</span>
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
        className="order-last flex items-center gap-0.5 rounded-studio border border-studio-border
          bg-studio-surface p-0.5 sm:order-none"
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

      <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={togglePreview}
          aria-pressed={previewOpen}
          title="Preview window"
          className={`inline-flex h-8 items-center gap-1.5 rounded-studio border px-2.5 text-xs font-medium
            transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
            md:px-3
            ${
              previewOpen
                ? 'border-studio-accent bg-studio-accent text-white'
                : 'border-studio-border bg-white text-studio-text hover:bg-studio-surface'
            }`}
        >
          <HiOutlineDesktopComputer className="text-sm" />
          <span className="hidden md:inline">Preview</span>
        </button>

        <button
          type="button"
          onClick={() => openSettings('projector')}
          title="Settings — background, type, OBS"
          className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border bg-white px-2.5
            text-xs font-medium text-studio-text transition-colors duration-150 hover:bg-studio-surface
            focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40 md:px-3"
        >
          <HiOutlineCog className="text-sm" />
          <span className="hidden md:inline">Settings</span>
        </button>

        <Link
          to="/"
          className="hidden h-8 items-center rounded-studio border border-studio-border bg-white px-3
            text-xs font-medium text-studio-muted transition-colors duration-150 hover:bg-studio-surface
            hover:text-studio-text xl:inline-flex"
        >
          Classic view
        </Link>

        <Link
          to="/show"
          target="_blank"
          title="Open the projector window"
          className="inline-flex h-8 items-center gap-1.5 rounded-studio border border-studio-border
            bg-white px-2.5 text-xs font-medium text-studio-text transition-colors duration-150
            hover:bg-studio-surface md:px-3"
        >
          <HiOutlineExternalLink className="text-sm" />
          <span className="hidden lg:inline">Open Projector</span>
        </Link>

        <Button variant="primary" onClick={clearProjector}>
          Clear
        </Button>
      </div>
    </header>
  );
};

export default AppBar;
