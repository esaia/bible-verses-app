import React from 'react';
import useData from '../../hooks/useData';

/**
 * One language's block on the projector. Fading is handled by the parent so
 * the whole screen crossfades as a unit and the text is only remeasured while
 * it is invisible.
 */
const TextShow = ({ showData, lang }) => {
  const { bibleNames } = useData();

  const verses = showData?.[lang] || [];

  if (verses.length === 0) {
    return null;
  }

  const first = verses[0];
  const last = verses[verses.length - 1];
  const name = bibleNames[lang]?.[+first?.wigni + 2] || '';
  const muxli = verses.length > 1 ? `${first?.muxli}-${last?.muxli}` : first?.muxli;

  return (
    <div className="w-full">
      {verses.map((item, i) => (
        <p className="showText" key={i}>
          {item.bv}
        </p>
      ))}

      <h3 className="showText italic text-gray-300/90">{`${name} ${first?.tavi}:${muxli}`}</h3>
    </div>
  );
};

export default TextShow;
