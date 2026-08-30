import React, { useEffect, useRef, useState } from 'react';
import { SlSizeFullscreen } from 'react-icons/sl';
import TextShow from '../components/result-versions/TextShow';
import { fitText, refitOnFontLoad } from '../lib/fitText';

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

const FADE_MS = 320;
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
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let themeClass;

    if (!imageContainer.current) {
      return;
    }

    imageContainer.current.style.backgroundImage = '';

    switch (theme) {
      case '1':
        themeClass = 'bg-1img';
        break;
      case '2':
        themeClass = 'bg-2img';
        break;
      case '3':
        themeClass = 'bg-3img';
        break;
      case '4':
        themeClass = 'bg-4img';
        break;
      case '5':
        themeClass = 'bg-5img';
        break;
      case '6':
        themeClass = 'bg-6img';
        break;
      case '7':
        themeClass = 'bg-7img';
        break;
      case '8':
        themeClass = 'bg-8img';
        break;
      case '9':
        themeClass = 'bg-9img';
        break;
      case '10':
        themeClass = 'bg-10img';
        break;
      case '11':
        themeClass = 'bg-11img';
        break;
      case '12':
        themeClass = 'bg-12img';
        break;
      case '13':
        themeClass = 'bg-13img';
        break;
      case '14':
        themeClass = 'bg-14img';
        break;
      case '15':
        themeClass = 'bg-15img';
        break;
      case '16':
        themeClass = 'bg-16img';
        break;
      case '17':
        themeClass = 'bg-17img';
        break;
      case '18':
        themeClass = 'bg-18img';
        break;
      case '19':
        themeClass = 'bg-19img';
        break;
      case '20':
        themeClass = 'bg-20img';
        break;
      case 'dynamicIMG':
        const localStorageImg = localStorage.getItem('dynamicImage');
        imageContainer.current.style.backgroundImage = `url(${localStorageImg})`;

        themeClass = '';

        break;
      default:
        themeClass = 'bg-1img';
    }

    setBgStr(themeClass);
  }, [theme]);

  useEffect(() => {
    if (JSON.stringify(showData) === JSON.stringify(displayed)) {
      setVisible(true);
      return undefined;
    }

    setVisible(false);

    const swap = setTimeout(() => {
      setDisplayed(showData);
      setVisible(true);
    }, FADE_MS);

    return () => clearTimeout(swap);
  }, [showData, displayed]);

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
          style={{ opacity: visible ? 1 : 0, transition: `opacity ${FADE_MS}ms ease-in-out` }}
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
