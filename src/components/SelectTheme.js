import React, { useEffect, useState } from 'react';
import { Radio } from '@material-tailwind/react';
import useData from '../hooks/useData';
import { THEMES } from '../data/themes';

// Shared with /studio and the projector.
const themeImages = THEMES;

const fonts = [
  { id: 'banner', value: 'font-banner', title: 'banner' },
  { id: 'valera', value: 'font-valera', title: 'valera' },
];

const SelectTheme = () => {
  const [themeNumber, setThemeNumber] = useState(() => localStorage.getItem('themeNumber'));

  const { fontTitle, setFontTitle } = useData();

  const [dynamicImage, setDynamicImage] = useState(() => localStorage.getItem('dynamicImage'));

  useEffect(() => {
    if (themeNumber) {
      localStorage.setItem('themeNumber', themeNumber);
    }
  }, [themeNumber]);

  useEffect(() => {
    localStorage.setItem('font', fontTitle);
  }, [fontTitle]);

  const handleThemeChange = newThemeNumber => {
    setThemeNumber(newThemeNumber);
  };

  const handleFont = newFontTitle => {
    setFontTitle(newFontTitle);
  };

  const generateFontClassStr = fontTitle => {
    switch (fontTitle) {
      case 'banner':
        return 'font-banner';
      case 'valera':
        return 'font-valera';
      default:
        return 'font-banner';
    }
  };

  const imageInputChange = e => {
    const newValue = e?.target?.value;
    setDynamicImage(newValue);
    localStorage.setItem('dynamicImage', newValue);
  };
  return (
    <div>
      <div className="grid grid-cols-3 grid-rows-2 gap-4 justify-center items-center md:grid-cols-4 xl:grid-cols-5">
        {themeImages.map(theme => (
          <Theme
            key={theme.id}
            id={theme.id}
            setThemeNumber={handleThemeChange}
            checked={themeNumber === theme.id}
            src={theme.src}
          />
        ))}
      </div>
      <div className="flex items-center mt-5">
        <div className="flex items-center">
          <Radio
            id={'dynamic'}
            name="theme"
            value={'dynamicIMG'}
            color="blue-gray"
            onChange={e => handleThemeChange(e?.target?.value)}
            checked={themeNumber === 'dynamicIMG'}
          />
          <input
            className="w-80 rounded-sm  h-fit outline-none p-1 dark:border-white/30 border-gray-300 border-[1px] dark:bg-[#374151] dark:text-white "
            type="text"
            value={dynamicImage || ''}
            onChange={e => imageInputChange(e)}
          />
        </div>
        <div className="flex">
          {fonts.map(item => {
            return (
              <div className="flex justify-center items-center" key={item.id}>
                <Radio
                  id={item.id}
                  name="font"
                  value={item.value}
                  color="blue-gray"
                  onChange={() => handleFont(item.value)}
                  checked={item.value === fontTitle}
                />
                <label
                  htmlFor={item.id}
                  className={`dark:text-white cursor-pointer ${generateFontClassStr(item.title)}`}
                >
                  {item.title}
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SelectTheme);

const Theme = ({ id, setThemeNumber, checked, src }) => {
  return (
    <div className="flex flex-wrap cursor-pointer">
      <Radio
        id={id}
        name="theme"
        value={id}
        color="blue-gray"
        onChange={e => setThemeNumber(e.target?.value)}
        checked={checked}
      />
      <label htmlFor={id} className="cursor-pointer">
        <img src={src} alt="theme img" className="themeimg rounded-md" />
      </label>
    </div>
  );
};
