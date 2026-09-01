import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useStudio, groupVerses } from '../StudioProvider';
import { plain, verseRef } from '../text';
import { fitText, refitOnFontLoad } from '../../lib/fitText';
import { LOCAL_THEME, themeClassName } from '../../data/themes';
import { loadLocalFile } from '../../lib/localMedia';

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const MODE_KEY = 'studioPreviewMode';

/** The frame the lower third is authored against; the iframe is scaled from it. */
const STREAM_W = 1920;
const STREAM_H = 1080;

const MODES = [
  { value: 'projector', label: 'Projector' },
  { value: 'stream', label: 'Lower third' },
];

/**
 * Mirror of what the projector is showing, docked at the top of the right rail
 * the way a presentation app puts its output preview: always in the same
 * place, never in front of the verse it is previewing. It used to float and be
 * dragged around, which meant it was permanently in the wrong place.
 */
const PreviewPanel = () => {
  const {
    blocks,
    live,
    enabled,
    projectorFont,
    theme,
    dynamicImage,
    localImage,
    textAlign,
    langOrder,
    transitionMs,
    songs,
    lyricsFont,
    lyricsAlign,
  } = useStudio();

  // The panel runs the projector's own crossfade, at the operator's setting, so
  // the preview lies about nothing — timing included.
  const fadeMs = transitionMs / 2;

  const screenRef = useRef(null);
  const textRef = useRef(null);

  const [mode, setMode] = useState(() => localStorage.getItem(MODE_KEY) || 'projector');

  /**
   * A background from this machine has no URL to put in a class or a style, so
   * the preview mints its own from the stored file — the same picture the
   * projector is being sent, read straight out of IndexedDB here.
   */
  const [localUrl, setLocalUrl] = useState('');
  const localImageId = localImage?.id;

  useEffect(() => {
    if (theme !== LOCAL_THEME || !localImageId) {
      setLocalUrl('');
      return undefined;
    }

    let cancelled = false;
    let url = '';

    loadLocalFile(localImageId)
      .then(record => {
        if (cancelled || !record?.file) {
          return;
        }

        url = URL.createObjectURL(record.file);
        setLocalUrl(url);
      })
      .catch(() => setLocalUrl(''));

    return () => {
      cancelled = true;

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [theme, localImageId]);

  // The lower third is authored at 1920x1080 and scaled down to whatever width
  // the rail happens to be, so the preview has to know its own size.
  const [scale, setScale] = useState(0);

  // What is live right now. The fade is keyed on the text itself rather than on
  // the `live` pointer, because editing a passage — adding a verse at the
  // start, say — shifts the pointer without changing the verse on screen, and
  // that must not look like a slide change.
  const liveSong = live?.kind === 'lyrics' ? songs.find(item => item.id === live.songId) : null;
  const liveLyrics = liveSong?.slides?.[live.slideIndex]?.text || '';

  const liveBlock = liveSong ? null : blocks.find(item => item.id === live?.blockId);
  const liveGroup = liveBlock?.groups?.[live?.verseIndex];
  const liveRows = langOrder
    .filter(lang => enabled[lang])
    .map(lang => ({
      lang,
      items: liveBlock && liveGroup ? groupVerses(liveBlock, lang, liveGroup) : [],
    }));
  const signature = JSON.stringify([liveLyrics, liveRows.map(row => [row.lang, row.items.map(item => item.bv)])]);

  // What the panel is showing right now, which lags the live text by one fade.
  // Swapping only while the text is invisible means the refit measures the
  // incoming verse and the operator never sees a hard cut.
  const [displayed, setDisplayed] = useState({ rows: liveRows, lyrics: liveLyrics, signature });
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  useLayoutEffect(() => {
    const box = screenRef.current;

    if (!box) {
      return undefined;
    }

    const measure = () => setScale(box.clientWidth / STREAM_W);

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(box);

    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (signature === displayed.signature) {
      setVisible(true);
      return undefined;
    }

    if (fadeMs === 0) {
      setDisplayed({ rows: liveRows, lyrics: liveLyrics, signature });
      setVisible(true);
      return undefined;
    }

    setVisible(false);

    const swap = setTimeout(() => {
      setDisplayed({ rows: liveRows, lyrics: liveLyrics, signature });
      setVisible(true);
    }, fadeMs);

    return () => clearTimeout(swap);
    // `liveRows` is rebuilt every render; `signature` is what actually changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, displayed.signature, fadeMs]);

  // Same fit as the projector, in proportion to the panel — the bounds are the
  // projector's own, expressed as fractions of the screen height, so a slide
  // that fills the projector fills the preview too.
  useEffect(() => {
    const refit = () => {
      const box = screenRef.current;

      if (!box) {
        return;
      }

      const height = box.clientHeight;

      fitText(textRef.current, height * 0.89, {
        min: 5,
        max: Math.max(6, Math.round(height / (displayed.lyrics ? 4 : 13))),
      });
    };

    refit();

    const cancelFontRefit = refitOnFontLoad(refit);
    const frame = requestAnimationFrame(refit);

    return () => {
      cancelFontRefit();
      cancelAnimationFrame(frame);
    };
  });

  // A pasted URL and one of the operator's own pictures are both drawn as an
  // inline background; the stock themes stay on their Tailwind class.
  const backgroundUrl = (theme === LOCAL_THEME && localUrl) || (theme === 'dynamicIMG' && dynamicImage) || '';

  const rows = displayed.rows;
  const hasContent = Boolean(displayed.lyrics) || rows.some(row => row.items.length > 0);

  return (
    <div className="shrink-0 border-b border-studio-border">
      {/* Dark, like the floating preview it replaced: the bar reads as the edge
          of the output rather than as more console furniture, and the screen
          under it is not fighting a white strip. */}
      <div className="flex h-9 items-center justify-between gap-2 bg-studio-bar px-2">
        <div className="flex items-center gap-0.5">
          {MODES.map(item => (
            <button
              key={item.value}
              type="button"
              aria-pressed={mode === item.value}
              onClick={() => setMode(item.value)}
              className={`rounded-[4px] px-2 py-1 text-[11px] font-medium transition-colors duration-150
                focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40
                ${mode === item.value ? 'bg-white/20 text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <span className="flex items-center gap-1.5 pr-1 text-[10px] font-semibold tracking-wide text-white/80">
          <span className={`h-1.5 w-1.5 rounded-full ${hasContent ? 'bg-studio-live' : 'bg-white/30'}`} />
          {hasContent ? 'LIVE' : 'IDLE'}
        </span>
      </div>

      {mode === 'stream' ? (
        // The real `/lower3rd` page, scaled down, rather than a second
        // rendering of the same design: same origin means it picks the slide up
        // through the `storage` event, and its `vh`/`vw` padding resolves
        // against its own 1920x1080 viewport, so what shows here is what OBS
        // draws. The chequerboard stands in for the camera and reads as
        // transparency.
        <div ref={screenRef} className="preview-alpha relative aspect-video w-full overflow-hidden">
          <iframe
            title="Lower third preview"
            src="/lower3rd"
            tabIndex={-1}
            scrolling="no"
            style={{
              width: STREAM_W,
              height: STREAM_H,
              border: 0,
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : (
        <div
          ref={screenRef}
          className={`relative aspect-video w-full overflow-hidden bg-blend-overlay bgblind showbackground
            ${theme === 'dynamicIMG' || theme === LOCAL_THEME ? '' : themeClassName(theme)}`}
          style={backgroundUrl ? { backgroundImage: `url(${backgroundUrl})` } : undefined}
        >
          <div
            className="flex h-full w-full items-center justify-center px-[6%]"
            style={{
              opacity: visible ? 1 : 0,
              transition: fadeMs === 0 ? 'none' : `opacity ${fadeMs}ms ease-in-out`,
            }}
          >
            {!hasContent ? (
              <p className="text-xs text-white/40">Nothing is live</p>
            ) : displayed.lyrics ? (
              <div ref={textRef} className={`w-full ${lyricsFont}`}>
                <p className={`font-semibold leading-snug text-white ${ALIGN_CLASS[lyricsAlign]}`}>
                  {displayed.lyrics.split('\n').join(' ')}
                </p>
              </div>
            ) : (
              <div ref={textRef} className={`w-full ${projectorFont}`}>
                {rows.map(({ lang, items }) =>
                  items.length > 0 ? (
                    <div key={lang} className="py-[0.35em]">
                      <p className={`font-semibold leading-snug text-white ${ALIGN_CLASS[textAlign]}`}>
                        {items.map(item => plain(item.bv)).join(' ')}
                      </p>
                      <p className={`italic text-gray-300/90 ${ALIGN_CLASS[textAlign]}`} style={{ fontSize: '0.72em' }}>
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
      )}
    </div>
  );
};

export default PreviewPanel;
