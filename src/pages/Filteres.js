import React from 'react';
import 'react-awesome-button/dist/styles.css';
import FixedDetails from '../components/FixedDetails';
import Versions from '../components/Versions';
import Header from '../components/Header';
import useBibleContext from '../hooks/useBibleContext';
import Skeleton from '../components/Skeleton';
import VerseArrows from '../components/VerseArrows';
import Preview from '../components/Preview';
import StudioBanner from '../components/StudioBanner';

const Filteres = () => {
  const { filteredData, inputValues, isFetching } = useBibleContext();

  return (
    <div className=" w-full min-h-[100vh] flex justify-start items-center flex-col p-4   max-w-[2000px] m-auto ">
      <div className="flex flex-col items-center w-full ">
        <StudioBanner />
        <Header />

        <div className="min-h-[200px] w-full">
          {isFetching ? (
            <Skeleton />
          ) : filteredData && filteredData?.bibleData?.length === 0 && inputValues.phrase ? (
            <p className="dark:text-white p-3 text-2xl text-center mt-10">No matches found: "{inputValues.phrase}"</p>
          ) : (
            <>
              {!inputValues.versemde && <VerseArrows />}
              <Preview />
            </>
          )}
        </div>

        <Versions />
        <FixedDetails />
      </div>
    </div>
  );
};

export default Filteres;
