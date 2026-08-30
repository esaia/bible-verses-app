import React, { createContext, useEffect, useReducer, useState } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { fetchData } from '../lib/axios';
import { useSearchParams } from 'react-router-dom';

export const BibleContext = createContext();

const InputValuesProvider = ({ children }) => {
  const initialState = {};

  const [searchParams, setSearchParams] = useSearchParams();

  const inputValueInitial = {
    language: searchParams.get('language') || 'geo',
    version: searchParams.get('version') || 'ახალი გადამუშავებული გამოცემა 2015',
    book: +searchParams.get('book') || 4,
    chapter: +searchParams.get('chapter'),
    verse: +searchParams.get('verse'),
    versemde: +searchParams.get('versemde'),
    phrase: '',
    separate: false,
  };
  const bibleDataReducer = (state, { type, payload }) => {
    const e = payload?.event;
    const triggleAction = payload?.triggleAction;

    const appendQueryInUrl = e => {
      searchParams.delete(e.id);
      searchParams.append(e.id, e.value);
      searchParams.sort();
    };

    switch (type) {
      case 'CHANGE_INPUT_VALUE':
        if (triggleAction.action === 'clear' && triggleAction?.removedValues) {
          const { id } = triggleAction.removedValues[0];
          let newState = {
            ...state,
          };

          switch (id) {
            case 'chapter':
              searchParams.delete(id);
              searchParams.delete('verse');
              searchParams.delete('versemde');

              newState = {
                ...newState,
                [id]: null,
                verse: null,
                versemde: null,
              };
              break;
            case 'verse':
              searchParams.delete(id);
              searchParams.delete('versemde');

              newState = {
                ...newState,
                [id]: null,
                versemde: null,
              };
              break;

            default:
              searchParams.delete(id);

              newState = {
                ...newState,
                [id]: null,
              };
          }

          return newState;
        } else {
          let newState = {
            ...state,
          };

          switch (e?.id) {
            case 'book':
              searchParams.delete('chapter');
              searchParams.delete('verse');
              searchParams.delete('versemde');
              appendQueryInUrl(e);
              appendQueryInUrl({ id: 'verse', value: '1' });

              newState = {
                ...newState,
                [e?.id]: e?.value,
                chapter: 1,
                phrase: '',
                verse: 1,
                versemde: null,
                separate: false,
              };
              break;

            case 'chapter':
              searchParams.delete('verse');
              searchParams.delete('versemde');
              appendQueryInUrl(e);
              appendQueryInUrl({ id: 'verse', value: '1' });

              newState = {
                ...newState,
                [e?.id]: e?.value,
                phrase: '',
                verse: 1,
                versemde: null,
                separate: false,
              };
              break;

            case 'verse':
              searchParams.delete('versemde');

              appendQueryInUrl(e);

              newState = {
                ...newState,
                [e?.id]: e?.value,
                versemde: null,
                separate: false,
              };
              break;

            default:
              appendQueryInUrl(e);

              newState = {
                ...newState,
                [e?.id]: e?.value,
              };
          }

          return newState;
        }

      case 'DECREASE_VERSE':
        if (+state.verse <= 1) {
          return {
            ...state,
          };
        }
        return {
          ...state,
          verse: +state.verse - 1,
        };
      case 'INCREASE_VERSE':
        return {
          ...state,
          verse: +state.verse + 1,
        };
      case 'MAKE_BLANK':
        return {
          ...state,

          book: 1,
          chapter: null,
          verse: null,
          versemde: null,
          separate: true,
        };
      case 'PHRASE_INPUT':
        return {
          ...state,
          phrase: payload.event.target.value,
        };
      case 'SEPARATE_PREVIEW':
        const { wigni, tavi, muxli } = payload;

        searchParams.delete('book');
        searchParams.delete('chapter');
        searchParams.delete('verse');
        searchParams.delete('versemde');

        searchParams.append('book', +wigni + 3);
        searchParams.append('chapter', tavi);
        searchParams.append('verse', muxli);

        return {
          ...state,
          book: +wigni + 3,
          chapter: +tavi,
          verse: muxli,
          phrase: '',
          separate: false,
        };

      default:
        return state;
    }
  };

  const [inputValues, inputDispatch] = useReducer(bibleDataReducer, inputValueInitial);
  const [filteredData, setfilteredData] = useState(initialState);
  const queryClient = useQueryClient();

  const params = {
    w: inputValues.book,
    t: inputValues.chapter,
    m: '',
    s: inputValues.phrase,
    mv: inputValues.version || '',
    language: inputValues.language,
    page: 1,
  };

  const { verse, versemde, separate, ...newInputValues } = inputValues;

  const {
    data: previousFilteredData,
    refetch,
    isFetched,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['getBibleData', newInputValues],
    queryFn: () => fetchData(params),
    enabled: false,
  });

  useEffect(() => {
    if (isFetched) setfilteredData(previousFilteredData);
  }, [previousFilteredData, isFetched]);

  useEffect(() => {
    if (!queryClient.getQueryData(['getBibleData', newInputValues]) && !inputValues.separate) refetch();
  }, [inputValues.version, inputValues.book, inputValues.chapter, inputValues.language]);

  useEffect(() => {
    setSearchParams(searchParams);
  }, [inputValues]);

  return (
    <BibleContext.Provider
      value={{
        filteredData,
        inputDispatch,
        inputValues,
        isFetching,
        refetch,
        setfilteredData,
      }}
    >
      <div>
        <div>
          {!error ? (
            children
          ) : (
            <div className="w-full flex h-screen justify-center items-center">
              <h3 className="bold text-3xl">Network Error</h3>
              <a href="/" className="p-4 m-3 bg-gray-300 rounded-sm text-black">
                refresh
              </a>
            </div>
          )}
        </div>
      </div>
    </BibleContext.Provider>
  );
};

export default InputValuesProvider;
