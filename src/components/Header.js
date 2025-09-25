import Select from 'react-select';
import useBibleContext from '../hooks/useBibleContext';
import useData from '../hooks/useData';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

const Header = () => {
  const { inputValues, inputDispatch, refetch } = useBibleContext();
  const { languages, versions, book, chapter, verse, versemde } = useData();

  const selectTheme = useMemo(() => {
    return theme => ({
      ...theme,
      colors: {
        ...theme.colors,
        primary25: 'transparent',
        primary: '#2256ab',
      },
    });
  }, []);

  const changeInputValue = (e, triggleAction) => {
    inputDispatch({
      type: 'CHANGE_INPUT_VALUE',
      payload: { event: e, triggleAction },
    });
  };

  const submitSearchForm = e => {
    e.preventDefault();
    const inputValueBlankAndFetch = async () => {
      await inputDispatch({ type: 'MAKE_BLANK' });
      refetch();
    };

    inputValueBlankAndFetch();
  };

  return (
    <>
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{
            type: 'spring',
            stiffness: 50,
            delay: '0.4',
          }}
        >
          <div className="flex justify-start items-center flex-grow-4 gap-3 my-4   lg:flex-nowrap flex-wrap">
            <Select
              placeholder={'ენა'}
              defaultValue={{
                value: inputValues.language,
                label: inputValues.language,
                id: 'language',
              }}
              options={languages}
              isSearchable={true}
              onChange={(e, triggleAction) => changeInputValue(e, triggleAction)}
              className="my-react-select-container  w-[100px]  flex-auto z-[52]"
              classNamePrefix="my-react-select"
              theme={selectTheme}
            />
            <Select
              placeholder={'ვერსია'}
              defaultValue={{
                value: inputValues.version,
                label: inputValues.version,
                id: 'version',
              }}
              options={versions}
              isSearchable={true}
              onChange={(e, triggleAction) => changeInputValue(e, triggleAction)}
              className="my-react-select-container w-[300px]  flex-auto  z-[50]"
              classNamePrefix="my-react-select"
              theme={selectTheme}
            />

            <Select
              placeholder={'წიგნი'}
              value={book.flatMap(item => item.options).find(option => option.value === inputValues.book)}
              options={book}
              isSearchable={true}
              onChange={(e, triggleAction) => changeInputValue(e, triggleAction)}
              className="my-react-select-container w-[300px]  flex-auto  "
              classNamePrefix="my-react-select"
              theme={selectTheme}
            />

            <Select
              value={chapter?.find(option => option.label === inputValues.chapter || null) || null}
              placeholder={'თავი'}
              options={chapter}
              isSearchable={true}
              isClearable={true}
              onChange={(e, triggleAction) => changeInputValue(e, triggleAction)}
              className="my-react-select-container w-[180px] flex-auto "
              classNamePrefix="my-react-select"
              theme={selectTheme}
            />

            <Select
              value={verse?.filter(option => option.label === inputValues.verse || null)}
              defaultValue={verse?.filter(option => option.label === 1)}
              placeholder={'მუხლი'}
              options={verse}
              isSearchable={true}
              isClearable={true}
              onChange={(e, triggleAction) => changeInputValue(e, triggleAction)}
              className="my-react-select-container w-[180px] flex-auto"
              classNamePrefix="my-react-select"
              theme={selectTheme}
            />

            <Select
              value={versemde?.filter(option => option.label === inputValues.versemde || null)}
              placeholder={'(მდე)'}
              options={versemde}
              isSearchable={true}
              isClearable={true}
              isDisabled={inputValues.verse ? false : true}
              onChange={(e, triggleAction) => changeInputValue(e, triggleAction)}
              className="my-react-select-container w-[180px] flex-auto"
              classNamePrefix="my-react-select"
              theme={selectTheme}
            />

            <form
              onSubmit={e => submitSearchForm(e)}
              className="   w-[300px] h-[37px] rounded-[3px] border-[1.2px] border-gray-300   flex-auto dark:bg-[#374151] dark:border-gray-600 dark:text-white "
            >
              <input
                onChange={e => {
                  inputDispatch({
                    type: 'PHRASE_INPUT',
                    payload: { event: e },
                  });
                }}
                value={inputValues.phrase}
                type="text"
                className="outline-none  w-full bg-transparent h-full p-3 "
              />
            </form>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Header;
