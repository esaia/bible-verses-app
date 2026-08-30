import React from 'react';
import { TiArrowRightThick, TiArrowLeftThick } from 'react-icons/ti';
import useData from '../hooks/useData';
import useBibleContext from '../hooks/useBibleContext';
import { useSearchParams } from 'react-router-dom';
import { useBibleSettingContext } from '../context/BibleSettingProvider';

const VerseArrows = () => {
  const { inputDispatch, inputValues } = useBibleContext();
  const { onSave } = useBibleSettingContext();
  const { verse } = useData();

  const [searchParams, setSearchParams] = useSearchParams();

  const syncVerseInUrl = value => {
    searchParams.delete('verse');
    searchParams.append('verse', value);
    searchParams.sort();
    setSearchParams(searchParams);
  };

  const left = () => {
    const current = +inputValues.verse || 1;
    if (current <= 1) {
      return;
    }

    inputDispatch({ type: 'DECREASE_VERSE' });
    syncVerseInUrl(current - 1);
  };

  const right = () => {
    const current = +inputValues.verse || 1;
    const lastVerse = verse?.[verse.length - 1]?.value;

    if (!lastVerse || current >= lastVerse) {
      return;
    }

    inputDispatch({ type: 'INCREASE_VERSE' });
    syncVerseInUrl(current + 1);
  };

  return (
    <div className="w-full flex justify-end items-center  select-none ">
      <div className=" flex justify-end gap-3">
        <TiArrowLeftThick
          className="text-3xl cursor-pointer text-gray-300 dark:text-[#374151] hover:text-gray-500 hover:dark:text-[#282f3b]"
          onClick={left}
        />
        <TiArrowRightThick
          className="text-3xl cursor-pointer text-gray-300 dark:text-[#374151] hover:text-gray-500 hover:dark:text-[#282f3b]"
          onClick={right}
        />

        <button
          onClick={() => onSave()}
          className="bg-gray-200 w-20 rounded-sm px-3 cursor-pointer text-black dark:text-gray-200  dark:bg-[#374151] hover:bg-gray-400 hover:dark:bg-[#282f3b]"
        >
          Show
        </button>
      </div>
    </div>
  );
};

export default VerseArrows;
