import { useEffect, useState } from 'react';
import { HiOutlineArrowDown, HiOutlineArrowUp, HiOutlinePlus, HiOutlineTrash } from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import IconButton from '../ui/IconButton';

const slideId = () => `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const swap = (list, a, b) => {
  const next = [...list];
  [next[a], next[b]] = [next[b], next[a]];
  return next;
};

/** Pull `from` out and drop it into the slot the pointer was aiming at. */
const move = (list, from, index) => {
  const next = [...list];
  const [moved] = next.splice(from, 1);
  const target = from < index ? index - 1 : index;

  next.splice(Math.max(0, Math.min(target, next.length)), 0, moved);

  return next;
};

/** Which half of the row the pointer is over, read from the event. */
const sideOf = event => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

/**
 * Fix a typo, add a verse, split a long slide. Edits are made on a draft and
 * only committed on Save, so an abandoned edit leaves the song alone. One slide
 * is one projector screen; the line breaks inside it are the line breaks the
 * congregation reads.
 */
const SongEditor = ({ song, onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [slides, setSlides] = useState([]);

  // Reordering by dragging the handle. The textareas stay undraggable so
  // selecting text inside one still works.
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setSlides(song.slides.map(slide => ({ ...slide })));
    }
  }, [song]);

  if (!song) {
    return null;
  }

  const setText = (index, text) => setSlides(current => current.map((s, i) => (i === index ? { ...s, text } : s)));

  const insertAfter = index =>
    setSlides(current => {
      const next = [...current];
      next.splice(index + 1, 0, { id: slideId(), text: '' });
      return next;
    });

  const save = () => {
    const kept = slides.map(slide => ({ ...slide, text: slide.text.trim() })).filter(slide => slide.text.length > 0);

    onSave({ ...song, title: title.trim() || song.title || 'Untitled song', slides: kept });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-2xl"
      title={
        <input
          type="text"
          value={title}
          aria-label="Song title"
          placeholder="Song title"
          onChange={e => setTitle(e.target.value)}
          className="w-full rounded-studio border border-studio-border px-3 py-1.5 text-sm font-semibold
            text-studio-text focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
        />
      }
      footer={
        <>
          <span className="mr-auto text-[11px] text-studio-faint">
            {slides.length} slides · empty slides are dropped on save
          </span>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-2 py-1">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            onDragOver={event => {
              if (dragIndex === null) {
                return;
              }

              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
              setDropIndex(sideOf(event) === 'before' ? index : index + 1);
            }}
            onDrop={event => {
              event.preventDefault();

              const to = sideOf(event) === 'before' ? index : index + 1;

              if (dragIndex !== null) {
                setSlides(current => move(current, dragIndex, to));
              }

              setDragIndex(null);
              setDropIndex(null);
            }}
            className={`flex items-start gap-2 rounded-studio py-0.5
              ${dragIndex === index ? 'opacity-40' : ''}
              ${dropIndex === index ? 'border-t-2 border-t-studio-accent' : ''}
              ${dropIndex === index + 1 ? 'border-b-2 border-b-studio-accent' : ''}`}
          >
            <span
              draggable
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', String(index));
                setDragIndex(index);
              }}
              onDragEnd={() => {
                setDragIndex(null);
                setDropIndex(null);
              }}
              title="Drag to reorder"
              className="flex cursor-grab items-center gap-0.5 pt-2 text-studio-faint"
            >
              <MdDragIndicator className="text-sm" />
              <span className="w-4 text-right text-[11px] tabular-nums">{index + 1}</span>
            </span>

            <textarea
              value={slide.text}
              rows={Math.min(6, Math.max(2, slide.text.split('\n').length))}
              placeholder="Lyrics for this slide"
              onChange={e => setText(index, e.target.value)}
              className="min-w-0 flex-1 resize-y rounded-studio border border-studio-border px-2.5 py-2 text-xs
                leading-relaxed text-studio-text placeholder:text-studio-faint focus:outline-none
                focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />

            <span className="flex shrink-0 flex-col gap-0.5 pt-0.5">
              <IconButton
                label="Move slide up"
                disabled={index === 0}
                onClick={() => setSlides(current => swap(current, index, index - 1))}
              >
                <HiOutlineArrowUp className="text-sm" />
              </IconButton>
              <IconButton
                label="Move slide down"
                disabled={index === slides.length - 1}
                onClick={() => setSlides(current => swap(current, index, index + 1))}
              >
                <HiOutlineArrowDown className="text-sm" />
              </IconButton>
            </span>

            <span className="flex shrink-0 flex-col gap-0.5 pt-0.5">
              <IconButton label="Add a slide below" onClick={() => insertAfter(index)}>
                <HiOutlinePlus className="text-sm" />
              </IconButton>
              <IconButton
                label="Delete this slide"
                tone="danger"
                onClick={() => setSlides(current => current.filter((_, i) => i !== index))}
              >
                <HiOutlineTrash className="text-sm" />
              </IconButton>
            </span>
          </div>
        ))}

        <Button
          variant="secondary"
          icon={<HiOutlinePlus className="text-sm" />}
          onClick={() => insertAfter(slides.length - 1)}
        >
          Add slide
        </Button>
      </div>
    </Modal>
  );
};

export default SongEditor;
