import { useState } from 'react';
import { MdDragIndicator } from 'react-icons/md';
import Select from '../ui/Select';
import Toggle from '../ui/Toggle';
import { useStudio } from '../StudioProvider';
import { versionsByLang } from '../../data/bible';
import { LANG_LABELS } from '../useChapter';

/**
 * The three projector languages. Their order here is the order they are
 * stacked on screen, so the rows can be dragged to rearrange the slide.
 */
/** Which half of the row the pointer is over. Read from the event rather than
 *  from state, so a drop that lands before React re-renders is still correct. */
const sideOf = event => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

const TranslationsSection = () => {
  const { enabled, setEnabled, versions, setVersions, langOrder, moveLang } = useStudio();

  const [dragging, setDragging] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const clearDrag = () => {
    setDragging(null);
    setDropTarget(null);
  };

  return (
    <div className="space-y-3">
      {langOrder.map((lang, index) => {
        const on = Boolean(enabled[lang]);
        const isDropTarget = dragging && dragging !== lang;

        return (
          <div
            key={lang}
            onDragOver={e => {
              if (!isDropTarget) {
                return;
              }

              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';

              setDropTarget({ index, side: sideOf(e) });
            }}
            onDragLeave={() => setDropTarget(null)}
            onDrop={e => {
              if (!isDropTarget) {
                return;
              }

              e.preventDefault();
              moveLang(dragging, sideOf(e) === 'after' ? index + 1 : index);
              clearDrag();
            }}
            className={`relative ${on ? '' : 'opacity-55'} ${dragging === lang ? 'opacity-40' : ''}`}
          >
            {dropTarget?.index === index && (
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 h-0.5 rounded-full bg-studio-accent ${
                  dropTarget.side === 'before' ? '-top-1.5' : '-bottom-1.5'
                }`}
              />
            )}

            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1">
                <span
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', lang);
                    setDragging(lang);
                  }}
                  onDragEnd={clearDrag}
                  title="Drag to reorder on screen"
                  className="cursor-grab text-studio-faint transition-colors duration-150
                    hover:text-studio-muted active:cursor-grabbing"
                >
                  <MdDragIndicator className="text-base" />
                </span>

                <span className="truncate text-sm font-medium text-studio-text">{LANG_LABELS[lang]}</span>
              </span>

              <Toggle
                checked={on}
                onChange={value => setEnabled({ ...enabled, [lang]: value })}
                label={`Show ${LANG_LABELS[lang]} on the projector`}
              />
            </div>

            <Select
              className="w-full"
              value={versions[lang]}
              onChange={value => setVersions({ ...versions, [lang]: value })}
              options={versionsByLang[lang].map(v => ({ value: v.value, label: v.label }))}
            />
          </div>
        );
      })}
    </div>
  );
};

export default TranslationsSection;
