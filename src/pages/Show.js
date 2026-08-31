import React, { useEffect, useRef, useState } from 'react';
import { SlSizeFullscreen } from 'react-icons/sl';
import TextShow from '../components/result-versions/TextShow';
import { fitText, refitOnFontLoad } from '../lib/fitText';
import { themeClassName } from '../data/themes';
import { readTransition } from '../lib/transition';

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const LANGS = ['geo', 'eng', 'rus'];
const DEFAULT_ORDER = ['eng', 'geo', 'rus'];

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
const VERTICAL_MARGIN = 120;

const Show = () => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const [bgStr, setBgStr] = useState('');

  const [showData, setShowData] = useState(JSON.parse(localStorage.getItem('showData')));
  const [theme, setTheme] = useState(localStorage.getItem('themeNumber') || '1');
  const [font, setFont] = useState(localStorage.getItem('font') || 'font-banner');
  const [align, setAlign] = useState(() => localStorage.getItem('projectorAlign') || 'left');
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
      setShowData(JSON.parse(localStorage.getItem('showData')));
      setFont(localStorage.getItem('font') || 'font-banner');
      setAlign(localStorage.getItem('projectorAlign') || 'left');
      setOrder(readOrder());
      setTransitionMs(readTransition());
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    if (!imageContainer.current) {
      return;
    }

    imageContainer.current.style.backgroundImage = '';

    if (theme === 'dynamicIMG') {
      imageContainer.current.style.backgroundImage = `url(${localStorage.getItem('dynamicImage')})`;
      setBgStr('');
      return;
    }

    setBgStr(themeClassName(theme));
  }, [theme]);

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
  }, [displayed, projectorLanguages, font, align, order]);

  /**
   * Fit the passage to the screen. The upper bound stops a two-word verse from
   * filling the whole projector; the lower bound keeps a long passage legible.
   */
  const resizeText = () => {
    fitText(innerContainerRef.current, window.innerHeight - VERTICAL_MARGIN, {
      min: MIN_FONT_SIZE,
      max: Math.min(MAX_FONT_SIZE, Math.round(window.innerHeight / 13)),
    });
  };

  return (
    <div className={`flex justify-center items-center w-full h-screen ${font}`}>
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
          className={`max-w-[2000px] py-[10px] ${ALIGN_CLASS[align]}`}
          ref={innerContainerRef}
          style={{
            opacity: visible ? 1 : 0,
            transition: transitionMs === 0 ? 'none' : `opacity ${transitionMs / 2}ms ease-in-out`,
          }}
        >
          {displayed &&
            order.map(lang =>
              projectorLanguages?.[lang] ? <TextShow key={lang} lang={lang} showData={displayed} /> : null,
            )}
        </div>
      </div>
    </div>
  );
};

export default Show;
