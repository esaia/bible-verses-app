import { useState } from 'react';
import { HiOutlinePencil, HiOutlineX } from 'react-icons/hi';
import { MdDragIndicator } from 'react-icons/md';
import IconButton from '../ui/IconButton';
import { useStudio } from '../StudioProvider';

const DRAG_TYPE = 'application/x-studio-song';

/** Which half of the row the pointer is over, read from the event so a fast
 *  drop still lands where it was aimed. */
const sideOf = event => {
  const box = event.currentTarget.getBoundingClientRect();
  return event.clientY < box.top + box.height / 2 ? 'before' : 'after';
};

export const songDragProps = songId => ({
  draggable: true,
  onDragStart: event => {
    event.dataTransfer.setData(DRAG_TYPE, songId);
    event.dataTransfer.setData('text/plain', songId);
    event.dataTransfer.effectAllowed = 'move';
  },
});

const readDragged = event => event.dataTransfer.getData(DRAG_TYPE) || event.dataTransfer.getData('text/plain');

/**
 * The order of service: the songs picked for this Sunday, dragged over from the
 * library and reordered by dragging within the list. It holds ids only, so a
 * re-imported bundle updates the songs without disturbing the running order.
 */
const Setlist = ({ onEdit }) => {
  const { songs, setlist, activeSongId, setActiveSongId, placeInSetlist, removeFromSetlist, clearSetlist } =
    useStudio();

  // `{ index }` while a drag is over the list — the slot the drop would use.
  const [dropIndex, setDropIndex] = useState(null);

  const items = setlist.map(id => songs.find(song => song.id === id)).filter(Boolean);

  const handleDrop = index => event => {
    const songId = readDragged(event);

    event.preventDefault();
    setDropIndex(null);

    if (songId) {
      placeInSetlist(songId, index);
      setActiveSongId(songId);
    }
  };

  const allowDrop = index => event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1 flex items-center justify-between px-0.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-studio-faint">
          Set list{items.length > 0 && ` · ${items.length}`}
        </h3>

        {items.length > 0 && (
          <button
            type="button"
            onClick={clearSetlist}
            className="text-[11px] text-studio-faint hover:text-studio-text focus:outline-none"
          >
            Clear
          </button>
        )}
      </div>

      <div
        onDragOver={allowDrop(items.length)}
        onDragLeave={() => setDropIndex(null)}
        onDrop={handleDrop(items.length)}
        className={`studio-scroll min-h-[96px] flex-1 overflow-y-auto rounded-studio border
          ${dropIndex !== null ? 'border-studio-accent bg-studio-accent/5' : 'border-dashed border-studio-border'}`}
      >
        {items.length === 0 ? (
          <p className="px-3 py-6 text-center text-[11px] leading-relaxed text-studio-faint">
            Drag songs here to build this Sunday's order of service.
          </p>
        ) : (
          items.map((song, index) => (
            <div
              key={song.id}
              {...songDragProps(song.id)}
              onDragOver={event => {
                event.stopPropagation();
                allowDrop(sideOf(event) === 'before' ? index : index + 1)(event);
              }}
              onDrop={event => {
                event.stopPropagation();
                handleDrop(sideOf(event) === 'before' ? index : index + 1)(event);
              }}
              className={`group/set flex cursor-grab items-center gap-1 border-b border-studio-divider last:border-b-0
                ${song.id === activeSongId ? 'bg-studio-accent/10' : 'hover:bg-studio-surface'}
                ${dropIndex === index ? 'border-t-2 border-t-studio-accent' : ''}
                ${dropIndex === index + 1 ? 'border-b-2 border-b-studio-accent' : ''}`}
            >
              <MdDragIndicator className="ml-1 shrink-0 text-sm text-studio-faint" />

              <button
                type="button"
                onClick={() => setActiveSongId(song.id)}
                className="min-w-0 flex-1 py-2 pr-1 text-left focus:outline-none"
              >
                <span
                  className={`block truncate text-xs ${
                    song.id === activeSongId ? 'font-semibold text-studio-text' : 'text-studio-muted'
                  }`}
                >
                  {index + 1}. {song.title}
                </span>
              </button>

              <span className="flex shrink-0 pr-1 opacity-0 transition-opacity group-hover/set:opacity-100">
                <IconButton label={`Edit ${song.title}`} onClick={() => onEdit(song)}>
                  <HiOutlinePencil className="text-sm" />
                </IconButton>

                <IconButton label={`Remove ${song.title} from the set list`} onClick={() => removeFromSetlist(song.id)}>
                  <HiOutlineX className="text-sm" />
                </IconButton>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Setlist;
