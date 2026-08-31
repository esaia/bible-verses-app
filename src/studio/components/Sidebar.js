import Select from '../ui/Select';
import TranslationsSection from './TranslationsSection';
import StyleSection from './StyleSection';
import ObsSection from './ObsSection';
import { useStudio } from '../StudioProvider';
import { versionsByLang } from '../../data/bible';
import { LANGS, LANG_LABELS } from '../useChapter';

const ADMIN_LANGS = LANGS.map(lang => ({ value: lang, label: LANG_LABELS[lang] }));

const Section = ({ title, hint, children }) => (
  <section className="border-b border-studio-divider px-4 py-4 last:border-b-0">
    <h2 className="text-[11px] font-semibold uppercase tracking-wider text-studio-faint">{title}</h2>
    {hint && <p className="mb-3 mt-1 text-xs leading-relaxed text-studio-muted">{hint}</p>}
    <div className={hint ? '' : 'mt-3'}>{children}</div>
  </section>
);

/**
 * Everything that used to hide behind the Translations / Style popovers, laid
 * out in one always-visible rail so nothing needs to be clicked open.
 */
const Sidebar = () => {
  const { admin, setAdmin } = useStudio();

  return (
    <aside
      className="studio-scroll flex h-full w-[264px] shrink-0 flex-col overflow-y-auto border-r
        border-studio-border bg-white"
    >
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

      <Section title="Style" hint="Background and typeface used on the projector screen.">
        <StyleSection />
      </Section>

      <Section
        title="OBS lower third"
        hint="Sends the live slide to an OBS Browser Source as a lower third, over a transparent background."
      >
        <ObsSection />
      </Section>
    </aside>
  );
};

export default Sidebar;
