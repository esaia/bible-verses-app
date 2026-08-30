import { useCallback, useEffect, useRef, useState } from 'react';
import { HiOutlineChevronDown, HiOutlineChevronUp, HiOutlineX } from 'react-icons/hi';
import IconButton from '../ui/IconButton';
import { useStudio, groupVerses } from '../StudioProvider';
import { plain, verseRef } from '../text';
import { fitText, refitOnFontLoad } from '../../lib/fitText';

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const MIN_WIDTH = 260;
const HEADER_HEIGHT = 36;
const ASPECT = 16 / 9;
const GEOMETRY_KEY = 'studioPreviewGeometry';

/** The body is locked to the projector's 16:9 so the preview never lies about framing. */
const heightFor = width => Math.round(width / ASPECT) + HEADER_HEIGHT;

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const sanitize = value =>
  value && typeof value.x === 'number' && typeof value.width === 'number'
    ? { x: value.x, y: value.y, width: value.width, height: value.height }
    : null;

const readGeometry = () => {
  try {
    return sanitize(JSON.parse(localStorage.getItem(GEOMETRY_KEY)));
  } catch (e) {
    return null;
  }
};

const defaultGeometry = () => {
  const width = Math.min(380, Math.max(MIN_WIDTH, window.innerWidth - 32));
  const height = heightFor(width);

  return {
    width,
    height,
    x: Math.max(16, window.innerWidth - width - 16),
    y: Math.max(16, window.innerHeight - height - 16),
  };
};

/**
 * Floating mirror of what the projector is showing. Hidden until the operator
 * opens it, then draggable by its title bar and resizable from the bottom-right
 * grip; position, size and open state all persist.
 */
const PreviewPanel = () => {
  const { blocks, live, enabled, previewOpen, closePreview, projectorFont, theme, dynamicImage, textAlign, langOrder } =
    useStudio();

  const screenRef = useRef(null);
  const textRef = useRef(null);

  const [geometry, setGeometry] = useState(readGeometry);
  const [collapsed, setCollapsed] = useState(false);
  const [interaction, setInteraction] = useState(null);

  // Placed on first open so it lands in the corner of the current window.
  useEffect(() => {
    if (previewOpen && !geometry) {
      setGeometry(defaultGeometry());
    }
  }, [previewOpen, geometry]);

  useEffect(() => {
    if (geometry) {
      try {
        localStorage.setItem(GEOMETRY_KEY, JSON.stringify(geometry));
      } catch (e) {
        // Non-critical.
      }
    }
  }, [geometry]);

  // Keep the panel reachable when the window shrinks.
  useEffect(() => {
    const handleResize = () =>
      setGeometry(current =>
        current
          ? {
              ...current,
              x: clamp(current.x, 0, window.innerWidth - current.width),
              y: clamp(current.y, 0, window.innerHeight - 48),
            }
          : current,
      );

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startInteraction = useCallback(
    (mode, event) => {
      if (event.button !== 0 || !geometry) {
        return;
      }

      event.preventDefault();
      setInteraction(mode);

      const pointerX = event.clientX;
      const pointerY = event.clientY;
      const origin = { ...geometry };

      const handleMove = e => {
        const dx = e.clientX - pointerX;
        const dy = e.clientY - pointerY;

        if (mode === 'drag') {
          setGeometry({
            width: origin.width,
            height: origin.height,
            x: clamp(origin.x + dx, 0, window.innerWidth - origin.width),
            y: clamp(origin.y + dy, 0, window.innerHeight - 48),
          });
          return;
        }

        // Both axes grow together: whichever way the pointer pushed further
        // wins, and the panel slides back on screen rather than being capped by
        // whatever space happens to be to its right.
        const width = clamp(
          origin.width + Math.max(dx, dy * ASPECT),
          MIN_WIDTH,
          Math.min(window.innerWidth - 16, (window.innerHeight - 16 - HEADER_HEIGHT) * ASPECT),
        );
        const height = heightFor(width);

        setGeometry({
          width,
          height,
          x: clamp(origin.x, 0, window.innerWidth - width),
          y: clamp(origin.y, 0, window.innerHeight - height),
        });
      };

      const handleUp = () => {
        setInteraction(null);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [geometry],
  );

  // Same fit as the projector, scaled to the panel — so the preview shows what
  // will actually be on screen, and never needs a scrollbar.
  useEffect(() => {
    const refit = () => {
      if (screenRef.current) {
        fitText(textRef.current, screenRef.current.clientHeight - 12, { min: 5, max: 40 });
      }
    };

    refit();

    const cancelFontRefit = refitOnFontLoad(refit);
    const frame = requestAnimationFrame(refit);

    return () => {
      cancelFontRefit();
      cancelAnimationFrame(frame);
    };
  });

  const block = blocks.find(item => item.id === live?.blockId);
  const group = block?.groups?.[live?.verseIndex];
  const rows = langOrder
    .filter(lang => enabled[lang])
    .map(lang => ({
      lang,
      items: block && group ? groupVerses(block, lang, group) : [],
    }));

  const hasContent = rows.some(row => row.items.length > 0);

  if (!previewOpen || !geometry) {
    return null;
  }

  return (
    <div
      className="fixed z-40 flex flex-col overflow-hidden rounded-studio-lg bg-studio-slide shadow-studio-modal"
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.width,
        height: collapsed ? 'auto' : geometry.height,
        userSelect: interaction ? 'none' : undefined,
      }}
    >
      <div
        onMouseDown={e => startInteraction('drag', e)}
        style={{ height: HEADER_HEIGHT }}
        className={`flex shrink-0 items-center justify-between border-b border-white/10 bg-studio-bar px-3 ${
          interaction === 'drag' ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <span className="text-xs font-medium text-white/80">Preview</span>

        <div className="flex items-center gap-1.5" onMouseDown={e => e.stopPropagation()}>
          <span className="flex items-center gap-1.5 pr-1 text-[10px] font-semibold tracking-wide text-white/80">
            <span className={`h-1.5 w-1.5 rounded-full ${hasContent ? 'bg-studio-live' : 'bg-white/30'}`} />
            {hasContent ? 'LIVE' : 'IDLE'}
          </span>

          <IconButton
            tone="onDark"
            label={collapsed ? 'Expand preview' : 'Collapse preview'}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <HiOutlineChevronUp className="text-sm" /> : <HiOutlineChevronDown className="text-sm" />}
          </IconButton>

          <IconButton tone="onDark" label="Close preview" onClick={closePreview}>
            <HiOutlineX className="text-sm" />
          </IconButton>
        </div>
      </div>

      {!collapsed && (
        <>
          <div
            ref={screenRef}
            className={`relative flex-1 overflow-hidden bg-blend-overlay bgblind showbackground
              ${theme === 'dynamicIMG' ? '' : `bg-${theme}img`}`}
            style={theme === 'dynamicIMG' && dynamicImage ? { backgroundImage: `url(${dynamicImage})` } : undefined}
          >
            <div className="flex h-full w-full items-center justify-center px-[6%]">
              {!hasContent ? (
                <p className="text-xs text-white/40">Nothing is live</p>
              ) : (
                <div ref={textRef} className={`w-full ${projectorFont}`}>
                  {rows.map(({ lang, items }) =>
                    items.length > 0 ? (
                      <div key={lang} className="py-[0.35em]">
                        <p className={`font-semibold leading-snug text-white ${ALIGN_CLASS[textAlign]}`}>
                          {items.map(item => plain(item.bv)).join(' ')}
                        </p>
                        <p
                          className={`italic text-gray-300/90 ${ALIGN_CLASS[textAlign]}`}
                          style={{ fontSize: '0.72em' }}
                        >
                          {items.length > 1
                            ? `${verseRef(items[0], lang)}-${items[items.length - 1].muxli}`
                            : verseRef(items[0], lang)}
                        </p>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          </div>

          <div
            role="separator"
            aria-label="Resize preview"
            onMouseDown={e => startInteraction('resize', e)}
            className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize"
          >
            <span className="absolute bottom-1 right-1 block h-2 w-2 border-b-2 border-r-2 border-white/40" />
          </div>
        </>
      )}
    </div>
  );
};

export default PreviewPanel;
