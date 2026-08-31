import { useLayoutEffect, useRef } from 'react';
import { HiOutlineLink, HiOutlineScissors, HiOutlineX } from 'react-icons/hi';
import { plain, verseRef } from '../text';
import { fitText } from '../../lib/fitText';

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const Control = ({ label, onClick, children }) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    className="text-studio-faint opacity-0 transition-opacity duration-150 hover:text-studio-text
      focus:opacity-100 focus:outline-none group-hover/card:opacity-100"
  >
    {children}
  </button>
);

/**
 * One slide: a single verse, or several joined verses shown together. Text is
 * scaled to fit rather than clipped, so the card previews what the projector
 * will actually show.
 */
const VerseCard = ({ items, lang, isLive, font, align = 'left', size = 190, onGoLive, onRemove, onJoin, onSplit }) => {
  const bodyRef = useRef(null);
  const textRef = useRef(null);

  const verses = items || [];
  const first = verses[0];
  const last = verses[verses.length - 1];

  const label = verses.length > 1 ? `V${first?.muxli}-${last?.muxli}` : `V${first?.muxli}`;
  const reference = verses.length > 1 ? `${verseRef(first, lang)}-${last?.muxli}` : verseRef(first, lang);

  const text = verses.map(item => plain(item.bv)).join(' ');
  const refSize = clamp(Math.round(size / 24), 7, 14);

  useLayoutEffect(() => {
    if (bodyRef.current) {
      fitText(textRef.current, bodyRef.current.clientHeight, {
        min: 6,
        max: clamp(Math.round(size / 17), 9, 22),
      });
    }
  }, [text, size, font, align]);

  return (
    <div className="group/card">
      <div className="mb-1 flex h-[18px] items-center justify-between gap-1 px-0.5">
        <span className={`text-xs font-semibold ${isLive ? 'text-studio-live' : 'text-studio-muted'}`}>{label}</span>

        <span className="flex items-center gap-1.5">
          {verses.length > 1 && onSplit && (
            <Control label="Split back into separate verses" onClick={onSplit}>
              <HiOutlineScissors className="text-sm" />
            </Control>
          )}
          {onJoin && (
            <Control label="Join with the next verse" onClick={onJoin}>
              <HiOutlineLink className="text-sm" />
            </Control>
          )}
          {onRemove && (
            <Control label="Remove this verse and the rest" onClick={onRemove}>
              <HiOutlineX className="text-sm" />
            </Control>
          )}
        </span>
      </div>

      <button
        type="button"
        onClick={onGoLive}
        title={isLive ? 'Click again to clear the screen' : text}
        className={`flex aspect-video w-full flex-col justify-between rounded-[4px] bg-studio-slide p-2
          text-left transition-shadow duration-150 focus:outline-none ${font}
          ${
            isLive
              ? 'ring-4 ring-studio-live'
              : 'ring-1 ring-transparent hover:ring-2 hover:ring-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent'
          }`}
      >
        <span ref={bodyRef} className="flex flex-1 items-center justify-center overflow-hidden">
          <span ref={textRef} className={`w-full font-semibold leading-snug text-white ${ALIGN_CLASS[align]}`}>
            {text}
          </span>
        </span>

        <span className={`block truncate text-studio-faint ${ALIGN_CLASS[align]}`} style={{ fontSize: refSize }}>
          {reference}
        </span>
      </button>
    </div>
  );
};

export default VerseCard;
