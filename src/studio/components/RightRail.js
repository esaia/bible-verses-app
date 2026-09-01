import { useCallback, useEffect, useRef, useState } from 'react';
import { MdClose } from 'react-icons/md';
import IconButton from '../ui/IconButton';
import PreviewPanel from './PreviewPanel';
import AudioPlaylist from './AudioPlaylist';
import { useStudio } from '../StudioProvider';

/** The width it has always been, and the narrowest the preview stays useful. */
const MIN_WIDTH = 320;

/** Past this the rail is taking room the running order needs more. */
const MAX_WIDTH = 720;

const WIDTH_KEY = 'studioRailWidth';

/** Never wider than the window can spare, whatever was saved on a bigger one. */
const clampWidth = width =>
  Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - 520)));

const readWidth = () => {
  try {
    const saved = Number(localStorage.getItem(WIDTH_KEY));

    return clampWidth(Number.isFinite(saved) && saved > 0 ? saved : MIN_WIDTH);
  } catch (e) {
    return MIN_WIDTH;
  }
};

/**
 * The output rail: what the projector is showing, and what the service is
 * going to play, in the fixed place a presentation app keeps them. Mirrors the
 * left rail's behaviour on a narrow window, where there is no room for a third
 * column and it slides over instead.
 */
const RightRail = () => {
  const { previewOpen, previewDrawer, closePreview } = useStudio();

  const [width, setWidth] = useState(readWidth);
  const [dragging, setDragging] = useState(false);
  const widthRef = useRef(width);

  useEffect(() => {
    widthRef.current = width;

    try {
      localStorage.setItem(WIDTH_KEY, String(width));
    } catch (e) {
      // Non-critical.
    }
  }, [width]);

  // A rail sized on a wide screen must give the running order its room back on
  // a narrower one.
  useEffect(() => {
    const onResize = () => setWidth(current => clampWidth(current));

    window.addEventListener('resize', onResize);

    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startResize = useCallback(event => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    setDragging(true);

    const startX = event.clientX;
    const startWidth = widthRef.current;

    // The handle is on the left edge, so dragging left widens the rail.
    const onMove = move => setWidth(clampWidth(startWidth + (startX - move.clientX)));

    const onUp = () => {
      setDragging(false);
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, []);

  // Selecting the verse text behind the cursor while dragging looks broken.
  useEffect(() => {
    if (!dragging) {
      return undefined;
    }

    const previous = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    return () => {
      document.body.style.userSelect = previous;
    };
  }, [dragging]);

  if (!previewOpen && !previewDrawer) {
    return null;
  }

  const contents = (
    <>
      <PreviewPanel />
      <AudioPlaylist />
    </>
  );

  return (
    <>
      {previewOpen && (
        <aside
          style={{ width }}
          className="relative hidden shrink-0 flex-col border-l border-studio-border bg-white lg:flex"
        >
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize the output rail"
            onPointerDown={startResize}
            onDoubleClick={() => setWidth(MIN_WIDTH)}
            title="Drag to resize · double-click to reset"
            className={`absolute inset-y-0 -left-1 z-10 w-2 cursor-col-resize transition-colors duration-150
              ${dragging ? 'bg-studio-accent/40' : 'hover:bg-studio-accent/20'}`}
          />

          {contents}
        </aside>
      )}

      {previewDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            aria-hidden="true"
            onClick={closePreview}
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(16, 24, 40, 0.5)' }}
          />

          <aside
            className="relative flex h-full w-[320px] max-w-[90vw] flex-col border-l border-studio-border
            bg-white shadow-studio-modal"
          >
            <div className="flex h-9 shrink-0 items-center justify-between border-b border-studio-border px-3">
              <span className="text-xs font-semibold text-studio-text">Output</span>
              <IconButton label="Close preview" onClick={closePreview}>
                <MdClose className="text-base" />
              </IconButton>
            </div>

            {contents}
          </aside>
        </div>
      )}
    </>
  );
};

export default RightRail;
