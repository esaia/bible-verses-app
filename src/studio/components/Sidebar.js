import { useSyncExternalStore } from 'react';
import { MdChevronRight, MdClose, MdOutlineSlideshow, MdOutlineVideocam } from 'react-icons/md';
import Select from '../ui/Select';
import IconButton from '../ui/IconButton';
import TranslationsSection from './TranslationsSection';
import StreamSection from './StreamSection';
import { fontLabel } from './StyleSection';
import { obsStatus } from './ObsSection';
import { useStudio } from '../StudioProvider';
import { getObsState, subscribeObs } from '../../lib/obsBridge';
import { versionsByLang } from '../../data/bible';
import { THEMES } from '../../data/themes';
import { LANGS, LANG_LABELS } from '../useChapter';

const ADMIN_LANGS = LANGS.map(lang => ({ value: lang, label: LANG_LABELS[lang] }));

const Section = ({ title, hint, children }) => (
  <section className="border-b border-studio-divider px-4 py-4 last:border-b-0">
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-studio-faint">{title}</h2>
    {hint && <p className="mb-3 mt-1 text-xs leading-relaxed text-studio-muted">{hint}</p>}
    <div className={hint ? '' : 'mt-3'}>{children}</div>
  </section>
);

/** A row in the footer: what a setup area is currently set to, click to change. */
const SummaryRow = ({ Icon, label, value, thumb, onClick }) => (
  <div className="px-2 py-1.5">
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-studio px-2 py-1.5 text-left transition-colors
        duration-150 hover:bg-studio-surface focus:outline-none focus-visible:ring-2
        focus-visible:ring-studio-accent/40"
    >
      {thumb ? (
        <img src={thumb} alt="" className="h-7 w-7 shrink-0 rounded-[4px] object-cover ring-1 ring-studio-border" />
      ) : (
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border
            border-studio-border bg-studio-surface text-studio-muted"
        >
          <Icon className="text-base" />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-studio-text">{label}</span>
        <span className="block truncate text-[11px] text-studio-faint">{value}</span>
      </span>

      <MdChevronRight className="shrink-0 text-base text-studio-faint" />
    </button>
  </div>
);

/**
 * The live rail: what is being browsed, and what the projector is armed with.
 * Setup — backgrounds, typefaces, the OBS bridge — sits one click away in the
 * settings dialog, summarised at the foot of the rail.
 *
 * Below `lg` there is no room for a permanent column, so the same rail is
 * rendered a second time as a drawer the app bar's menu button slides in.
 */
const Sidebar = ({ open, onClose }) => {
  const { admin, setAdmin, theme, projectorFont, openSettings } = useStudio();
  const obs = useSyncExternalStore(subscribeObs, getObsState);

  const status = obsStatus(obs);
  const background = THEMES.find(item => item.id === theme);

  // The drawer covers the workspace, so opening a dialog from it has to put the
  // workspace back first.
  const openPanel = panel => {
    onClose();
    openSettings(panel);
  };

  const rail = (
    <>
      <div className="studio-scroll min-h-0 flex-1 overflow-y-auto">
        <Section title="Browsing in" hint="The language and translation printed on the verse cards below.">
          <div className="space-y-2">
            <Select
              className="w-full"
              value={admin.lang}
              onChange={lang => setAdmin({ lang, version: versionsByLang[lang][0].value })}
              options={ADMIN_LANGS}
            />
            <Select
              className="w-full"
              value={admin.version}
              onChange={version => setAdmin({ ...admin, version })}
              options={versionsByLang[admin.lang].map(v => ({ value: v.value, label: v.label }))}
            />
          </div>
        </Section>

        <Section title="Projector" hint="Armed languages are fetched with each passage and shown together on screen.">
          <TranslationsSection />
        </Section>

        {/* Only worth the space once slides are actually going to OBS. */}
        {obs.enabled && (
          <Section title="Stream" hint="What the OBS lower third is carrying right now.">
            <StreamSection />
          </Section>
        )}
      </div>

      <div className="shrink-0 border-t border-studio-border bg-studio-surface/60 py-1">
        <SummaryRow
          Icon={MdOutlineSlideshow}
          label="Projector look"
          value={`${background?.label || 'Custom image'} · ${fontLabel(projectorFont)}`}
          thumb={background?.src}
          onClick={() => openPanel('projector')}
        />

        <SummaryRow
          Icon={MdOutlineVideocam}
          label="Stream"
          value={obs.enabled ? status.label : 'Not sending to OBS'}
          onClick={() => openPanel('stream')}
        />
      </div>
    </>
  );

  return (
    <>
      <aside className="hidden h-full w-[264px] shrink-0 flex-col border-r border-studio-border bg-white lg:flex">
        {rail}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(16, 24, 40, 0.5)' }}
          />

          <aside
            className="relative flex h-full w-[264px] max-w-[85vw] flex-col border-r border-studio-border
              bg-white shadow-studio-modal"
          >
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-studio-border px-4">
              <span className="text-sm font-semibold text-studio-text">Setup</span>
              <IconButton label="Close menu" onClick={onClose}>
                <MdClose className="text-lg" />
              </IconButton>
            </div>

            {rail}
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
