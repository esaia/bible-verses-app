import React, { useCallback, useEffect, useRef, useState } from 'react';
import useData from '../hooks/useData';
import { fitText, refitOnFontLoad } from '../lib/fitText';
import { OBS_EVENT } from '../lib/obsBridge';
import { readTransition } from '../lib/transition';

/**
 * The OBS Browser Source output: the live slide as a broadcast lower third,
 * drawn on a transparent background so it composites over the camera.
 *
 * Content arrives as a CustomEvent emitted into this page by OBS itself (see
 * `lib/obsBridge`), because an OBS Browser Source cannot see the console's
 * `localStorage`. The payload is therefore self-contained: it carries the
 * style settings as well as the slide, since none of the projector keys are
 * readable from in here.
 *
 * `localStorage` is still read as a fallback so the page can be opened in a
 * normal tab alongside the console to preview the design. In OBS those keys
 * are simply absent and the event is the only source.
 */

const LANGS = ['geo', 'eng', 'rus'];
const DEFAULT_ORDER = ['eng', 'geo', 'rus'];

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const MIN_FONT_SIZE = 10;

/**
 * A lower third is read at a glance while someone is speaking, so text is
 * scaled down to fit a line budget rather than being allowed to grow into a
 * paragraph that eats the frame. A verse gets more room than a song slide:
 * scripture is read, whereas lyrics are sung along to and only need prompting.
 */
const MAX_LINES = { verse: 4, lyrics: 2 };

/**
 * Share of the frame height the bar may grow into. A lower third that creeps
 * past roughly a third of the screen stops reading as an overlay and starts
 * covering the shot.
 */
const MAX_HEIGHT_RATIO = 0.34;

const EMPTY = { geo: [], eng: [], rus: [] };

const readStyleFromStorage = () => ({
  font: localStorage.getItem('font') || 'font-banner',
  align: localStorage.getItem('projectorAlign') || 'left',
  lyricsFont: localStorage.getItem('lyricsFont') || localStorage.getItem('font') || 'font-banner',
  lyricsAlign: localStorage.getItem('lyricsAlign') || localStorage.getItem('projectorAlign') || 'left',
  order: (() => {
    try {
      const stored = JSON.parse(localStorage.getItem('projectorOrder'));
      return Array.isArray(stored) && LANGS.every(lang => stored.includes(lang)) ? stored : DEFAULT_ORDER;
    } catch (e) {
      return DEFAULT_ORDER;
    }
  })(),
  // One language only, chosen from the projector's armed set — the same rule
  // the pushed payload follows, so the studio's preview matches the output.
  enabled: (() => {
    try {
      const armed = JSON.parse(localStorage.getItem('projectorLanguages')) || { geo: false, eng: false, rus: false };
      const list = LANGS.filter(lang => armed[lang]);
      const stored = localStorage.getItem('lowerThirdLanguage');
      const chosen = list.includes(stored) ? stored : list[0];

      return LANGS.reduce((acc, lang) => ({ ...acc, [lang]: lang === chosen }), {});
    } catch (e) {
      return { geo: false, eng: false, rus: false };
    }
  })(),
  transitionMs: readTransition(),
  position: localStorage.getItem('lowerThirdPosition') || 'bottom',
  variant: localStorage.getItem('lowerThirdVariant') || 'scrim',
  lyricsVariant: localStorage.getItem('lyricsVariant') || 'scrim',
  hidden: localStorage.getItem('obsHidden') === '1',
});

const readShowFromStorage = () => {
  try {
    return JSON.parse(localStorage.getItem('showData')) || EMPTY;
  } catch (e) {
    return EMPTY;
  }
};

/** Is there anything on this slide worth putting on screen? */
const hasContent = (showData, enabled) => {
  if (!showData) {
    return false;
  }

  if (showData.lyrics?.text) {
    return true;
  }

  return LANGS.some(lang => enabled?.[lang] && showData[lang]?.length > 0);
};

/** One language: its verses, then the reference that produced them. */
const Block = ({ showData, lang, bibleNames }) => {
  const verses = showData?.[lang] || [];

  if (verses.length === 0) {
    return null;
  }

  const first = verses[0];
  const last = verses[verses.length - 1];
  const name = bibleNames[lang]?.[+first?.wigni + 2] || '';
  const muxli = verses.length > 1 ? `${first?.muxli}-${last?.muxli}` : first?.muxli;

  return (
    <div className="lower3rd-block">
      <p className="lower3rd-text">{verses.map(verse => verse.bv).join(' ')}</p>
      {/* The reference needs its own line even in the banded look, where the
          verse above it is an inline run so each wrapped line gets a plate. */}
      {/* Split into parts so the column looks can set the book and the numbers
          differently. Run together they still read "Mark 3:16". */}
      <div className="lower3rd-refline">
        <span className="lower3rd-ref">
          <span className="lower3rd-ref-book">{name}</span>{' '}
          <span className="lower3rd-ref-num">{`${first?.tavi}:${muxli}`}</span>
        </span>
      </div>
    </div>
  );
};

const Lower3rd = () => {
  const { bibleNames } = useData();

  const [slide, setSlide] = useState(() => ({ showData: readShowFromStorage(), style: readStyleFromStorage() }));

  // What is drawn right now, which lags `slide` by half a transition. Swapping
  // only while the bar is hidden means the refit measures the incoming text
  // and the stream never sees a half-sized frame.
  const [displayed, setDisplayed] = useState(slide);
  const [visible, setVisible] = useState(false);

  // `?debug=1` on the Browser Source URL draws an always-visible panel over the
  // transparent stage. Without it a black canvas is ambiguous: a page that
  // never loaded, a bridge that never delivered, and a correctly transparent
  // overlay with nothing live all look identical inside OBS.
  const [debug] = useState(() => new URLSearchParams(window.location.search).has('debug'));
  const [received, setReceived] = useState({ count: 0, at: null, sample: null });
  const [metrics, setMetrics] = useState(null);

  const textRef = useRef();
  const barRef = useRef();

  const { showData, style } = displayed;
  const lyrics = showData?.lyrics;
  const transitionMs = style?.transitionMs ?? 320;
  const blanked = Boolean(slide.style?.hidden);
  const shown = !blanked && hasContent(slide.showData, slide.style?.enabled);

  // The app shell paints a background on every other route; over live video
  // any paint at all shows up as a grey box, so this route clears it. Set from
  // JS rather than CSS because it has to reach `html`/`body`, which are
  // outside the React tree.
  useEffect(() => {
    const targets = [document.documentElement, document.body];
    const previous = targets.map(el => el.style.background);

    targets.forEach(el => {
      el.style.background = 'transparent';
    });

    return () =>
      targets.forEach((el, i) => {
        el.style.background = previous[i];
      });
  }, []);

  useEffect(() => {
    const onSlide = event => {
      // obs-browser has delivered vendor event data as both an object and a
      // JSON string across versions, so accept either. The payload itself then
      // rides in a `json` field, because OBS's own marshalling mangles nested
      // arrays of objects on the way in (see `lib/obsBridge`).
      const outer = typeof event.detail === 'string' ? JSON.parse(event.detail) : event.detail;
      const detail = typeof outer?.json === 'string' ? JSON.parse(outer.json) : outer;

      if (detail?.showData) {
        setSlide({ showData: detail.showData, style: { ...readStyleFromStorage(), ...detail.style } });
        const sample =
          detail.showData.lyrics?.text ||
          LANGS.map(lang => detail.showData[lang]?.[0]?.bv).find(Boolean) ||
          '(no verse text in payload)';

        setReceived(current => ({
          count: current.count + 1,
          at: new Date().toLocaleTimeString(),
          sample: String(sample).slice(0, 60),
        }));
      }
    };

    window.addEventListener(OBS_EVENT, onSlide);

    return () => window.removeEventListener(OBS_EVENT, onSlide);
  }, []);

  // Preview path: only meaningful in a normal tab, where the console shares
  // this origin's storage. Inert inside OBS.
  useEffect(() => {
    const onStorage = () => setSlide({ showData: readShowFromStorage(), style: readStyleFromStorage() });

    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (JSON.stringify(slide) === JSON.stringify(displayed)) {
      setVisible(shown);
      return undefined;
    }

    if (transitionMs === 0) {
      setDisplayed(slide);
      setVisible(shown);
      return undefined;
    }

    setVisible(false);

    const swap = setTimeout(() => {
      setDisplayed(slide);
      setVisible(shown);
    }, transitionMs / 2);

    return () => clearTimeout(swap);
  }, [slide, displayed, transitionMs, shown]);

  const resizeText = useCallback(() => {
    fitText(textRef.current, window.innerHeight * MAX_HEIGHT_RATIO, {
      min: MIN_FONT_SIZE,
      // Lyrics are a handful of words and can carry more weight than a verse,
      // which stacks up to three translations plus a reference in the same bar.
      max: Math.round(window.innerHeight / (lyrics ? 14 : 22)),
      // Every passage keeps to two lines. Measured against its own line-height
      // rather than a fixed pixel budget, so it holds for any typeface or size
      // the search lands on. The half-line of slack absorbs sub-pixel rounding.
      constrain: element =>
        [...element.querySelectorAll('.lower3rd-text')].every(line => {
          const lineHeight = parseFloat(getComputedStyle(line).lineHeight);
          const budget = lyrics ? MAX_LINES.lyrics : MAX_LINES.verse;

          return !lineHeight || line.offsetHeight <= lineHeight * (budget + 0.5);
        }),
    });
  }, [lyrics]);

  useEffect(() => {
    resizeText();

    const cancelFontRefit = refitOnFontLoad(resizeText);
    const frame = requestAnimationFrame(resizeText);

    window.addEventListener('resize', resizeText);

    return () => {
      cancelFontRefit();
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resizeText);
    };
  }, [resizeText, displayed]);

  // Debug only: report what the layout actually produced. A bar that is drawn
  // but sized wrong is indistinguishable from one that is not drawn at all when
  // the only view of it is a scaled-down OBS preview.
  useEffect(() => {
    if (!debug) {
      return undefined;
    }

    const frame = requestAnimationFrame(() => {
      const bar = barRef.current?.getBoundingClientRect();

      setMetrics({
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        bar: bar ? `top ${Math.round(bar.top)} h ${Math.round(bar.height)}` : 'no bar',
        fontSize: textRef.current?.style.fontSize || '?',
        innerWidth: textRef.current?.clientWidth,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [debug, displayed, visible]);

  const top = style?.position === 'top';
  const align = lyrics ? style?.lyricsAlign : style?.align;
  const order = style?.order || DEFAULT_ORDER;

  return (
    <div className={`lower3rd-stage ${lyrics ? style?.lyricsFont : style?.font}`}>
      <div
        ref={barRef}
        className={`lower3rd-bar lower3rd-bar--${(lyrics ? style?.lyricsVariant : style?.variant) || 'scrim'} ${
          top ? 'lower3rd-bar--top' : ''
        } ${ALIGN_CLASS[align] || 'text-left'}`}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : `translateY(${top ? '-' : ''}24px)`,
          transition:
            transitionMs === 0
              ? 'none'
              : `opacity ${transitionMs / 2}ms ease-in-out, transform ${transitionMs / 2}ms ease-out`,
        }}
      >
        <div ref={textRef} className="lower3rd-inner">
          {lyrics ? (
            <p className="lower3rd-text">{lyrics.text.split('\n').join(' ')}</p>
          ) : (
            order.map(lang =>
              style?.enabled?.[lang] ? (
                <Block key={lang} lang={lang} showData={showData} bibleNames={bibleNames} />
              ) : null,
            )
          )}
        </div>
      </div>

      {debug && (
        <div className="lower3rd-debug">
          <strong>lower3rd</strong> — page loaded
          <br />
          OBS events received: {received.count}
          {received.at && ` (last ${received.at})`}
          <br />
          {received.count === 0
            ? 'Waiting for the studio. Check the toggle is on and a slide is live.'
            : `showing: ${
                lyrics ? 'lyrics' : LANGS.filter(lang => style?.enabled?.[lang] && showData?.[lang]?.length).join(', ')
              } · ${visible ? 'visible' : blanked ? 'blanked (switched off in the studio)' : 'hidden (nothing live)'}`}
          {received.sample && (
            <>
              <br />
              {`text: "${received.sample}"`}
            </>
          )}
          {metrics && (
            <>
              <br />
              {`viewport ${metrics.viewport} · bar ${metrics.bar} · font ${metrics.fontSize} · innerW ${metrics.innerWidth}`}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Lower3rd;
