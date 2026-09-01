import { useCallback, useEffect, useRef, useState } from 'react';
import { HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import { useStudio } from '../StudioProvider';
import { deleteLocalFile, isImageFile, loadLocalFiles, saveLocalFile, titleFromName } from '../../lib/localMedia';
import { LOCAL_THEME } from '../../data/themes';

/**
 * Backgrounds from the operator's own machine, alongside the stock ones.
 *
 * The files are kept in this browser exactly like the music library's, and are
 * handed to a projector on another computer over the peer connection rather
 * than uploaded anywhere. Nothing here has a URL — the thumbnails are blob
 * URLs minted for this dialog and revoked when it closes.
 */
const LocalBackgrounds = () => {
  const { theme, localImage, setLocalBackground } = useStudio();

  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const all = await loadLocalFiles();

    setItems(current => {
      current.forEach(item => URL.revokeObjectURL(item.url));

      return all
        .filter(record => isImageFile(record.file))
        .map(record => ({ ...record, url: URL.createObjectURL(record.file) }));
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Revoked on the way out, so a console left open all morning does not hold a
  // URL for every picture ever added.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => itemsRef.current.forEach(item => URL.revokeObjectURL(item.url)), []);

  const add = async event => {
    const files = [...event.target.files].filter(isImageFile);

    event.target.value = '';

    if (!files.length) {
      return;
    }

    setBusy(true);

    let last = null;

    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      last = await saveLocalFile(file);
    }

    await load();
    setBusy(false);

    // Picking the one just added is what the operator was going to do next.
    if (last) {
      setLocalBackground(last);
    }
  };

  const remove = async record => {
    await deleteLocalFile(record.id);

    if (localImage?.id === record.id) {
      setLocalBackground(null);
    }

    await load();
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-studio-faint">
          From this computer — sent straight to the projector, not uploaded.
        </span>

        <label
          className={`flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-studio border
            border-studio-border bg-white px-2.5 text-[11px] font-medium text-studio-text
            transition-colors duration-150 hover:bg-studio-surface ${busy ? 'pointer-events-none opacity-60' : ''}`}
        >
          <HiOutlinePhotograph className="text-sm" />
          {busy ? 'Adding…' : 'Add image'}
          <input type="file" accept="image/*" multiple onChange={add} className="hidden" />
        </label>
      </div>

      {items.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {items.map(item => {
            const selected = theme === LOCAL_THEME && localImage?.id === item.id;

            return (
              <div key={item.id} className="group/bg relative">
                <button
                  type="button"
                  title={titleFromName(item.name)}
                  aria-label={titleFromName(item.name)}
                  aria-pressed={selected}
                  onClick={() => setLocalBackground(item)}
                  className={`block w-full overflow-hidden rounded-[4px] transition-shadow duration-150
                    focus:outline-none
                    ${selected ? 'ring-2 ring-studio-accent' : 'ring-1 ring-studio-border hover:ring-studio-faint'}`}
                >
                  <img src={item.url} alt="" className="h-14 w-full object-cover" />
                </button>

                <button
                  type="button"
                  aria-label={`Remove ${titleFromName(item.name)}`}
                  title="Remove"
                  onClick={() => remove(item)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full
                    bg-white/90 text-studio-muted opacity-0 shadow-studio transition-opacity
                    hover:text-studio-text group-hover/bg:opacity-100"
                >
                  <HiOutlineX className="text-xs" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LocalBackgrounds;
