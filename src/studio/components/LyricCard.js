import { useLayoutEffect, useRef } from 'react';
import { HiOutlinePencil } from 'react-icons/hi';
import IconButton from '../ui/IconButton';
import { fitText } from '../../lib/fitText';

const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' };

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** One song slide, framed and scaled exactly like a verse card. */
const LyricCard = ({ slide, index, isLive, font, align = 'center', size = 190, onGoLive, onEdit }) => {
  const bodyRef = useRef(null);
  const textRef = useRef(null);

  useLayoutEffect(() => {
    if (bodyRef.current) {
      fitText(textRef.current, bodyRef.current.clientHeight, {
        min: 6,
        max: clamp(Math.round(size / 17), 9, 22),
      });
    }
  }, [slide.text, size, font, align]);

  return (
    <div>
      <div className="group mb-1 flex h-[18px] items-center justify-between px-0.5">
        <span className={`text-xs font-semibold ${isLive ? 'text-studio-live' : 'text-studio-muted'}`}>
          {index + 1}
        </span>

        {onEdit && (
          <IconButton
            label={`Edit slide ${index + 1}`}
            onClick={onEdit}
            className="h-[18px] w-[18px] text-studio-faint opacity-0 transition-opacity
              group-hover:opacity-100 focus-visible:opacity-100"
          >
            <HiOutlinePencil className="text-[11px]" />
          </IconButton>
        )}
      </div>

      <button
        type="button"
        onClick={onGoLive}
        title={isLive ? 'Click again to clear the screen' : slide.text}
        className={`flex aspect-video w-full flex-col justify-center rounded-[4px] bg-studio-slide p-2
          text-left transition-shadow duration-150 focus:outline-none ${font}
          ${
            isLive
              ? 'ring-4 ring-studio-live'
              : 'ring-1 ring-transparent hover:ring-2 hover:ring-studio-accent focus-visible:ring-2 focus-visible:ring-studio-accent'
          }`}
      >
        <span ref={bodyRef} className="flex flex-1 items-center justify-center overflow-hidden">
          <span ref={textRef} className={`w-full font-semibold leading-snug text-white ${ALIGN_CLASS[align]}`}>
            {slide.text.split('\n').join(' ')}
          </span>
        </span>
      </button>
    </div>
  );
};

export default LyricCard;
