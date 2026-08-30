import React, { createContext, useContext, useState } from 'react';
import useBibleContext from '../hooks/useBibleContext';
import { useQueryClient } from 'react-query';
import { fetchData } from '../lib/axios';
import { englishBooks } from '../data/englishBooks';

const bibleSettingContext = createContext();

const BibleSettingProvider = ({ children }) => {
  const queryClient = useQueryClient();

  const { inputValues } = useBibleContext();

  const [darkMode, setDarkMode] = useState(localStorage.getItem('darkmode') === 'true');
  const [fontTitle, setFontTitle] = useState(() => localStorage.getItem('font') || 'font-banner');

  const [versions, setVersions] = useState(
    JSON.parse(localStorage.getItem('versions')) || {
      geo: 'ახალი გადამუშავებული გამოცემა 2015',
      eng: 'KJV King James Version',
      rus: 'Синодальный перевод',
    },
  );

  const params = {
    w: inputValues.book,
    t: inputValues.chapter,
    m: '',
    s: inputValues.phrase,
    mv: inputValues.version || '',
    language: inputValues.language,
    page: 1,
  };

  const onSave = async () => {
    const keyGeo = ['geoData', params.w, inputValues.chapter, versions.geo];
    const keyEng = ['engData', params.w, inputValues.chapter, versions.eng];
    const keyRus = ['rusData', params.w, inputValues.chapter, versions.rus];
    const queryDataGeo = queryClient.getQueryData(keyGeo);
    const queryDataEng = queryClient.getQueryData(keyEng);
    const queryDataRus = queryClient.getQueryData(keyRus);

    const firstVerse = +inputValues.verse || 1;
    const startIndex = firstVerse - 1;
    const endIndex = +inputValues.versemde || firstVerse;

    const requestManagement = JSON.parse(localStorage.getItem('requestManagement'));

    if (!requestManagement?.geo && !requestManagement?.eng && !requestManagement?.rus) {
      return;
    }

    let preparedData = { geo: [], eng: [], rus: [] };

    if (!queryDataGeo) {
      if (requestManagement?.geo) {
        const dataGeo = await queryClient.fetchQuery({
          queryKey: keyGeo,
          queryFn: () => fetchData({ ...params, language: 'geo', t: inputValues.chapter, mv: versions.geo }),
        });

        if (dataGeo) {
          preparedData = {
            ...preparedData,
            geo: dataGeo?.bibleData?.slice(startIndex, endIndex),
          };
        }
      }
    } else {
      preparedData = {
        ...preparedData,
        geo: queryDataGeo.bibleData.slice(startIndex, endIndex),
      };
    }


    let englishBook = englishBooks[inputValues.book] || null;

    if (!queryDataEng) {
      if (requestManagement?.eng) {
        const dataEng = await queryClient.fetchQuery({
          queryKey: keyEng,
          queryFn: () =>
            fetchData({
              ...params,
              language: 'eng',
              w: englishBook || inputValues.book,
              t: inputValues.chapter,
              mv: versions.eng,
            }),
        });

        if (dataEng) {
          preparedData = {
            ...preparedData,
            eng: dataEng?.bibleData?.slice(startIndex, endIndex),
          };
        }
      }
    } else {
      preparedData = {
        ...preparedData,
        eng: queryDataEng.bibleData.slice(startIndex, endIndex),
      };
    }

    if (!queryDataRus) {
      if (requestManagement?.rus) {
        const dataRus = await queryClient.fetchQuery({
          queryKey: keyRus,
          queryFn: () => fetchData({ ...params, language: 'ru', t: inputValues.chapter, mv: versions.rus }),
        });

        if (dataRus) {
          preparedData = {
            ...preparedData,
            rus: dataRus?.bibleData?.slice(startIndex, endIndex),
          };
        }
      }
    } else {
      preparedData = {
        ...preparedData,
        rus: queryDataRus.bibleData.slice(startIndex, endIndex),
      };
    }

    localStorage.setItem('showData', JSON.stringify(preparedData));
  };

  return (
    <bibleSettingContext.Provider
      value={{
        darkMode,
        setDarkMode,
        fontTitle,
        setFontTitle,
        versions,
        setVersions,
        onSave,
      }}
    >
      {children}
    </bibleSettingContext.Provider>
  );
};

export const useBibleSettingContext = () => {
  const data = useContext(bibleSettingContext);
  return data;
};

export default BibleSettingProvider;
