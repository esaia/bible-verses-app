import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SlSizeFullscreen } from 'react-icons/sl';
import TextShow from '../components/result-versions/TextShow';
import { fitText, refitOnFontLoad } from '../lib/fitText';
import { LOCAL_THEME, themeClassName } from '../data/themes';
import { loadLocalFile, loadReceivedFile, saveReceivedFile } from '../lib/localMedia';
import { requestAsset } from '../lib/peerAssets';
import { readTransition } from '../lib/transition';
import { onRelayMessage, readRoom, startRelay, stopRelay } from '../lib/relay';

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const LANGS = ['geo', 'eng', 'rus'];
const DEFAULT_ORDER = ['eng', 'geo', 'rus'];

const readLocalImage = () => {
  try {
    return JSON.parse(localStorage.getItem('localImage')) || null;
  } catch (e) {
    return null;
  }
};

const readOrder = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('projectorOrder'));
    const valid = Array.isArray(stored) && stored.length === LANGS.length && LANGS.every(lang => stored.includes(lang));

    return valid ? stored : DEFAULT_ORDER;
  } catch (e) {
    return DEFAULT_ORDER;
  }
};

const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 64;

// A song slide is a handful of words and should fill the screen, so it is
// allowed a far larger size than a verse, which has a reference under it and
// often two or three translations stacked above.
const LYRICS_MAX_FONT_SIZE = 200;
// Breathing room above and below the text block, so a slide never touches the
// top and bottom edges of the screen.
const VERTICAL_MARGIN = 160;

const Show = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [bgStr, setBgStr] = useState('');

  const [showData, setShowData] = useState(JSON.parse(localStorage.getItem('showData')));
  const [theme, setTheme] = useState(localStorage.getItem('themeNumber') || '1');
  const [dynamicImage, setDynamicImage] = useState(() => localStorage.getItem('dynamicImage') || '');

  // Which of the operator's own pictures is the background, and the blob URL
  // for it once this machine actually holds the bytes.
  const [localImage, setLocalImage] = useState(readLocalImage);
  const [localUrl, setLocalUrl] = useState('');
  const [font, setFont] = useState(localStorage.getItem('font') || 'font-banner');
  const [align, setAlign] = useState(() => localStorage.getItem('projectorAlign') || 'left');
  const [lyricsFont, setLyricsFont] = useState(
    () => localStorage.getItem('lyricsFont') || localStorage.getItem('font') || 'font-banner',
  );
  const [lyricsAlign, setLyricsAlign] = useState(
    () => localStorage.getItem('lyricsAlign') || localStorage.getItem('projectorAlign') || 'left',
  );
  const [order, setOrder] = useState(readOrder);
  const [transitionMs, setTransitionMs] = useState(readTransition);
  const [projectorLanguages, setProjectorLanguages] = useState(
    JSON.parse(localStorage.getItem('projectorLanguages')) || {
      geo: false,
      eng: false,
      rus: false,
    },
  );

  const imageContainer = useRef();
  const innerContainerRef = useRef();

  // What is on screen right now, which lags `showData` by one fade. Swapping
  // only while the text is invisible means the refit measures the incoming
  // verse, and the audience never sees a hard cut.
  const [displayed, setDisplayed] = useState(showData);
  const [visible, setVisible] = useState(false);

  const handleFullscreenClick = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullScreen(Boolean(document.fullscreenElement));

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setProjectorLanguages(
        JSON.parse(localStorage.getItem('projectorLanguages')) || { geo: false, eng: false, rus: false },
      );
      setTheme(localStorage.getItem('themeNumber') || '1');
      setDynamicImage(localStorage.getItem('dynamicImage') || '');
      setLocalImage(readLocalImage());
      setShowData(JSON.parse(localStorage.getItem('showData')));
      setFont(localStorage.getItem('font') || 'font-banner');
      setAlign(localStorage.getItem('projectorAlign') || 'left');
      setLyricsFont(localStorage.getItem('lyricsFont') || localStorage.getItem('font') || 'font-banner');
      setLyricsAlign(localStorage.getItem('lyricsAlign') || localStorage.getItem('projectorAlign') || 'left');
      setOrder(readOrder());
      setTransitionMs(readTransition());
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  /**
   * The relay path: a console on another device — a phone, or a second
   * machine — cannot reach this tab through `localStorage`, so it pushes the
   * slide *and* the projector look, which is read off this browser's own keys
   * only when no room is in play.
   */
  useEffect(() => {
    const room = readRoom();

    if (!room) {
      return undefined;
    }

    startRelay(room, 'show');

    const off = onRelayMessage(payload => {
      if (!payload?.showData) {
        return;
      }

      setShowData(payload.showData);

      const projector = payload.projector;

      if (!projector) {
        return;
      }

      setTheme(projector.theme || '1');
      setFont(projector.font || 'font-banner');
      setAlign(projector.align || 'left');
      setLyricsFont(projector.lyricsFont || projector.font || 'font-banner');
      setLyricsAlign(projector.lyricsAlign || projector.align || 'left');
      setOrder(Array.isArray(projector.order) ? projector.order : DEFAULT_ORDER);
      setTransitionMs(projector.transitionMs ?? 320);
      setProjectorLanguages(projector.enabled || { geo: false, eng: false, rus: false });

      setDynamicImage(projector.dynamicImage || '');

      // Objects arrive fresh on every push; taking one that has not actually
      // changed would restart the transfer on every slide.
      setLocalImage(current => (current?.id === projector.localImage?.id ? current : projector.localImage || null));
    });

    return () => {
      off();
      stopRelay();
    };
  }, []);

  /**
   * A background the operator dragged in on their own machine. It has no URL
   * anyone else can fetch, so this asks the console for the bytes over the
   * peer connection and keeps them: a reload, or a console that has since been
   * shut, must not blank the screen mid-service.
   *
   * The console's *own* projector tab finds the file in this browser already
   * and never negotiates anything.
   */
  const localImageId = localImage?.id;

  useEffect(() => {
    if (theme !== LOCAL_THEME || !localImageId) {
      setLocalUrl('');
      return undefined;
    }

    let cancelled = false;
    let url = '';

    const show = record => {
      if (cancelled || !record?.file) {
        return;
      }

      url = URL.createObjectURL(record.file);
      setLocalUrl(url);
    };

    (async () => {
      try {
        const mine = await loadLocalFile(localImageId);

        if (mine) {
          show(mine);
          return;
        }

        const cached = await loadReceivedFile(localImageId);

        if (cached) {
          show(cached);
          return;
        }

        const received = await requestAsset(localImageId);

        if (cancelled) {
          return;
        }

        await saveReceivedFile({
          id: localImageId,
          name: received.name,
          type: received.type,
          file: received.file,
        });

        show(received);
      } catch (e) {
        if (!cancelled) {
          setLocalUrl('');
        }
      }
    })();

    return () => {
      cancelled = true;

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [theme, localImageId]);

  useEffect(() => {
    if (!imageContainer.current) {
      return;
    }

    imageContainer.current.style.backgroundImage = '';

    if (theme === LOCAL_THEME) {
      // Empty until the transfer lands, which reads as the background simply
      // arriving a moment late rather than as a broken image.
      imageContainer.current.style.backgroundImage = localUrl ? `url(${localUrl})` : '';
      setBgStr('');
      return;
    }

    if (theme === 'dynamicIMG') {
      imageContainer.current.style.backgroundImage = `url(${dynamicImage})`;
      setBgStr('');
      return;
    }

    setBgStr(themeClassName(theme));
  }, [theme, dynamicImage, localUrl]);

  useEffect(() => {
    if (JSON.stringify(showData) === JSON.stringify(displayed)) {
      setVisible(true);
      return undefined;
    }

    // A zero-length transition is a hard cut: swap in the same tick so the
    // screen never blanks, however briefly.
    if (transitionMs === 0) {
      setDisplayed(showData);
      setVisible(true);
      return undefined;
    }

    setVisible(false);

    const swap = setTimeout(() => {
      setDisplayed(showData);
      setVisible(true);
    }, transitionMs / 2);

    return () => clearTimeout(swap);
  }, [showData, displayed, transitionMs]);

  /**
   * Fit what is on screen. The upper bound stops a two-word verse from filling
   * the whole projector; the lower bound keeps a long passage legible.
   */
  const resizeText = useCallback(() => {
    const lyrics = Boolean(displayed?.lyrics);

    fitText(innerContainerRef.current, window.innerHeight - VERTICAL_MARGIN, {
      min: MIN_FONT_SIZE,
      max: lyrics
        ? Math.min(LYRICS_MAX_FONT_SIZE, Math.round(window.innerHeight / 4))
        : Math.min(MAX_FONT_SIZE, Math.round(window.innerHeight / 13)),
    });
  }, [displayed]);

  useEffect(() => {
    resizeText();

    // The projector font arrives asynchronously; the first measurement uses
    // fallback metrics, so refit once it has actually swapped in.
    const cancelFontRefit = refitOnFontLoad(resizeText);
    const frame = requestAnimationFrame(resizeText);

    window.addEventListener('resize', resizeText);

    return () => {
      cancelFontRefit();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resizeText);
    };
  }, [resizeText, projectorLanguages, font, align, order, lyricsFont, lyricsAlign]);

  return (
    <div className={`flex justify-center items-center w-full h-screen ${displayed?.lyrics ? lyricsFont : font}`}>
      <div
        ref={imageContainer}
        className={`relative w-full h-full px-10 flex justify-center items-center  flex-col  gap-12 bg-blend-overlay bgblind showbackground  overflow-hidden   ${bgStr} `}
      >
        {!isFullScreen && (
          <div className="absolute right-0 bottom-0 z-30 bg-white p-4 cursor-pointer">
            <SlSizeFullscreen onClick={handleFullscreenClick} className="text-4xl" />
          </div>
        )}

        <div
          className={`w-full max-w-[2000px] px-[4%] py-[10px] ${ALIGN_CLASS[displayed?.lyrics ? lyricsAlign : align]}`}
          ref={innerContainerRef}
          style={{
            opacity: visible ? 1 : 0,
            transition: transitionMs === 0 ? 'none' : `opacity ${transitionMs / 2}ms ease-in-out`,
          }}
        >
          {displayed?.lyrics ? (
            // A song slide is one block of text: no reference, no language
            // stack, and the armed languages do not apply to it. The line
            // breaks the song was written with are ignored — at projector size
            // they wrap anyway, and honouring both gives a ragged block.
            <div className="w-full">
              <p className="showText">{displayed.lyrics.text.split('\n').join(' ')}</p>
            </div>
          ) : (
            displayed &&
            order.map(lang =>
              projectorLanguages?.[lang] ? <TextShow key={lang} lang={lang} showData={displayed} /> : null,
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Show;
