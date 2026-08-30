import { useContext } from 'react';
import { BibleContext } from '../context/InputValuesProvider';
import useBibleContext from '../hooks/useBibleContext';
import { useBibleSettingContext } from '../context/BibleSettingProvider';
import { bibleNames, versionsByLang } from '../data/bible';
const useData = () => {
  const { filteredData } = useContext(BibleContext);
  const { inputValues } = useBibleContext();

  //   For preview
  const languages = [
    {
      value: 'geo',
      label: 'geo',
      id: 'language',
    },
    {
      value: 'eng',
      label: 'eng',
      id: 'language',
    },
    {
      value: 'russian',
      label: 'rus',
      id: 'language',
    },
  ];
  const versions =
    filteredData?.versions?.map((item, i) => {
      return { value: item, label: item, id: 'version' };
    }) || [];

  const bible =
    filteredData?.bibleNames
      ?.map((item, i) => {
        return { value: i + 1, label: item, id: 'book' };
      })
      .slice(0, 3) || [];

  const oldTest =
    filteredData?.bibleNames
      ?.map((item, i) => {
        return { value: i + 1, label: item, id: 'book' };
      })
      .slice(3, 42) || [];

  const newTest =
    filteredData?.bibleNames
      ?.map((item, i) => {
        return { value: i + 1, label: item, id: 'book' };
      })
      .slice(42, 69) || [];

  const book = [
    {
      label: 'ბიბლია',
      options: bible,
    },
    {
      label: 'ძველი აღთქმა',
      options: oldTest,
    },
    {
      label: 'ახალი აღთქმა',
      options: newTest,
    },
  ];
  const chapter =
    filteredData?.tavi &&
    new Array(+filteredData?.tavi[0].cc)?.fill()?.map((_, i) => {
      return { value: i + 1, label: i + 1, id: 'chapter' };
    });

  const verse =
    (filteredData?.muxli &&
      new Array(+filteredData?.muxli[0].cc)?.fill()?.map((_, i) => {
        return { value: i + 1, label: i + 1, id: 'verse' };
      })) ||
    [];

  const versemde =
    filteredData?.muxli &&
    new Array(+filteredData?.muxli[0].cc)
      ?.fill()
      ?.map((_, i) => {
        return { value: i + 1, label: i + 1, id: 'versemde' };
      })
      .slice(inputValues.verse);

  //   For result

  const allVersions = versionsByLang;

  const fontSizes = [
    {
      value: '2',
      label: '2',
      id: 'fontSize',
    },
    {
      value: '3',
      label: '3',
      id: 'fontSize',
    },
    {
      value: '4',
      label: '4',
      id: 'fontSize',
    },
    {
      value: '5',
      label: '5',
      id: 'fontSize',
    },
    {
      value: '6',
      label: '6',
      id: 'fontSize',
    },
    {
      value: '7',
      label: '7',
      id: 'fontSize',
    },
    {
      value: '8',
      label: '8',
      id: 'fontSize',
    },
    {
      value: '9',
      label: '9',
      id: 'fontSize',
    },
  ];

  const { fontTitle, setFontTitle } = useBibleSettingContext();

  return {
    languages,
    versions,
    book,
    chapter,
    verse,
    versemde,
    allVersions,
    fontSizes,
    bibleNames,
    fontTitle,
    setFontTitle,
  };
};

export default useData;
