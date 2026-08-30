import { useRef, useState } from 'react';
import {
  HiOutlineArrowDown,
  HiOutlineArrowUp,
  HiOutlineChevronDown,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineChevronUp,
  HiOutlineTrash,
} from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import IconButton from '../ui/IconButton';
import VerseCard from './VerseCard';
import { useStudio, groupVerses } from '../StudioProvider';
import { bookName } from '../../lib/passage';
import { LANG_LABELS } from '../useChapter';

/** Pulls the neighbouring verse into the passage. Sized to match a verse card. */
const ExtendTile = ({ label, icon, onClick }) => (
  <div>
    <div className="mb-1 h-[18px]" aria-hidden="true" />
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex aspect-[4/3] w-full items-center justify-center rounded-[4px] border border-dashed
        border-studio-border text-studio-faint transition-colors duration-150
        hover:border-studio-accent hover:bg-studio-surface hover:text-studio-accent
        focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
    >
      {icon}
    </button>
  </div>
);

/** Which half of the block the pointer is over — read from the event, not from
 *  state, so a fast drop still lands where it was aimed. */
const sideOf = event => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

const PassageBlock = ({ block, index, isFirst, isLast }) => {
  const {
    live,
    selectVerse,
    removeBlock,
    extendBlock,
    removeGroup,
    joinGroup,
    splitGroup,
    toggleBlockCollapsed,
    moveBlock,
    moveBlockTo,
    draggingId,
    setDraggingId,
    projectorFont,
    textAlign,
    cardSize,
  } = useStudio();

  const [dropSide, setDropSide] = useState(null);
  const headerRef = useRef(null);

  // Folded either because the operator collapsed this passage, or because a
  // drag is in progress — during a drag every block folds so the whole running
  // order fits on screen and the drop target is easy to hit.
  const collapsed = Boolean(draggingId) || Boolean(block.collapsed);

  const lang = block.adminLang;
  const groups = block.groups || [];
  const numbers = block.verses || [];
  const firstVerse = numbers[0];
  const lastVerse = numbers[numbers.length - 1];

  // Compact label: 15:1-3,7 rather than a bare first-to-last span.
  const range = numbers.length
    ? `:${numbers
        .reduce((spans, verse) => {
          const tail = spans[spans.length - 1];
          if (tail && verse === tail[1] + 1) {
            tail[1] = verse;
          } else {
            spans.push([verse, verse]);
          }
          return spans;
        }, [])
        .map(([start, end]) => (start === end ? `${start}` : `${start}-${end}`))
        .join(',')}`
    : '';

  const wholeChapter = Boolean(block.chapterLength) && numbers.length === block.chapterLength;
  const canPrepend = !wholeChapter && firstVerse > 1;
  const canAppend = !wholeChapter && (!block.chapterLength || lastVerse < block.chapterLength);

  // Nothing to reorder when it is the only passage.
  const reorderable = !(isFirst && isLast);

  const isDragging = draggingId === block.id;
  const isDropTarget = Boolean(draggingId) && !isDragging;

  const handleDragOver = e => {
    if (!isDropTarget) {
      return;
    }

    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    setDropSide(sideOf(e));
  };

  const handleDrop = e => {
    if (!isDropTarget) {
      return;
    }

    e.preventDefault();
    moveBlockTo(draggingId, sideOf(e) === 'after' ? index + 1 : index);
    setDropSide(null);
    setDraggingId(null);
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={() => setDropSide(null)}
      onDrop={handleDrop}
      className={`relative border-b border-studio-divider transition-[padding] duration-200 ease-out
        last:border-b-0 ${collapsed ? 'py-2' : 'py-5'} ${isDragging ? 'opacity-40' : ''}`}
    >
      {dropSide && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 h-0.5 rounded-full bg-studio-accent ${
            dropSide === 'before' ? 'top-0' : 'bottom-0'
          }`}
        />
      )}

      <header ref={headerRef} className="flex items-start justify-between gap-4">
        <div className="group/header flex min-w-0 items-start gap-1.5">
          {reorderable && (
            <span
              draggable
              onDragStart={e => {
                e.dataTransfer.effectAllowed = 'move';
                // Firefox refuses to start a drag without payload.
                e.dataTransfer.setData('text/plain', block.id);

                // Snapshot the header explicitly, so collapsing the verse grid
                // below cannot affect what is dragged.
                if (headerRef.current) {
                  e.dataTransfer.setDragImage(headerRef.current, 16, 16);
                }

                setDraggingId(block.id);
              }}
              onDragEnd={() => {
                setDraggingId(null);
                setDropSide(null);
              }}
              title="Drag to reorder"
              className="mt-1 cursor-grab text-studio-faint transition-colors duration-150
                hover:text-studio-muted active:cursor-grabbing"
            >
              <MdDragIndicator className="text-lg" />
            </span>
          )}

          <button
            type="button"
            onClick={() => toggleBlockCollapsed(block.id)}
            aria-expanded={!block.collapsed}
            title={block.collapsed ? 'Expand passage' : 'Collapse passage'}
            className="min-w-0 rounded-studio text-left focus:outline-none
              focus-visible:ring-2 focus-visible:ring-studio-accent/40"
          >
            <h2
              className="truncate text-xl font-bold tracking-tight text-studio-text
                transition-colors duration-150 group-hover/header:text-studio-accent"
            >
              {bookName(block.book, lang)} {block.chapter}
              {range}
            </h2>
            <p className="mt-0.5 truncate text-xs text-studio-muted">{block.versions?.[lang]}</p>
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={block.collapsed ? 'Expand passage' : 'Collapse passage'}
            onClick={() => toggleBlockCollapsed(block.id)}
          >
            {block.collapsed ? (
              <HiOutlineChevronDown className="text-base" />
            ) : (
              <HiOutlineChevronUp className="text-base" />
            )}
          </IconButton>

          {reorderable && (
            <>
              <IconButton label="Move passage up" disabled={isFirst} onClick={() => moveBlock(block.id, -1)}>
                <HiOutlineArrowUp className="text-base" />
              </IconButton>
              <IconButton label="Move passage down" disabled={isLast} onClick={() => moveBlock(block.id, 1)}>
                <HiOutlineArrowDown className="text-base" />
              </IconButton>
            </>
          )}
          <IconButton label="Remove passage" tone="danger" onClick={() => removeBlock(block.id)}>
            <HiOutlineTrash className="text-base" />
          </IconButton>
        </div>
      </header>

      {/* The collapse clipper would cut the live card's ring at the edges, so the
          wrapper is widened by 4px and the content padded back in by the same. */}
      <div
        className="-mx-1 grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: collapsed ? '0fr' : '1fr' }}
      >
        <div className="overflow-hidden">
          <div className="px-1 pb-2 pt-4">
            {groups.length === 0 ? (
              <p className="text-sm text-studio-muted">
                No verses came back for this chapter in {LANG_LABELS[lang]}. Try another translation.
              </p>
            ) : (
              <div
                className="grid gap-x-4 gap-y-3"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}
              >
                {canPrepend && (
                  <ExtendTile
                    label={`Add verse ${firstVerse - 1}`}
                    icon={<HiOutlineChevronLeft className="text-xl" />}
                    onClick={() => extendBlock(block.id, 'start')}
                  />
                )}

                {groups.map((group, groupIndex) => (
                  <VerseCard
                    key={`${block.id}-${group.join('-')}`}
                    items={groupVerses(block, lang, group)}
                    lang={lang}
                    font={projectorFont}
                    align={textAlign}
                    size={cardSize}
                    isLive={live?.blockId === block.id && live?.verseIndex === groupIndex}
                    onGoLive={() => selectVerse(block.id, groupIndex)}
                    onRemove={() => removeGroup(block.id, groupIndex)}
                    onJoin={groupIndex < groups.length - 1 ? () => joinGroup(block.id, groupIndex) : undefined}
                    onSplit={() => splitGroup(block.id, groupIndex)}
                  />
                ))}

                {canAppend && (
                  <ExtendTile
                    label={`Add verse ${lastVerse + 1}`}
                    icon={<HiOutlineChevronRight className="text-xl" />}
                    onClick={() => extendBlock(block.id, 'end')}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PassageBlock;
