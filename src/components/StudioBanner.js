import { Link } from 'react-router-dom';

/** Points the classic console at the new /studio design. */
const StudioBanner = () => {
  return (
    <div
      className="mb-2 flex w-full flex-wrap items-center justify-between gap-3 rounded-md border
        border-[#c7d7f5] bg-[#eef4ff] px-4 py-2.5 dark:border-[#2b4372] dark:bg-[#16233d]"
    >
      <p className="text-[15px] text-[#1e3a6e] dark:text-[#c3d5f5]">
        <b>New design available.</b> Browse whole chapters and send verses with one click.
      </p>

      <Link
        to="/studio"
        className="rounded-md bg-[#2256ab] px-3 py-1.5 text-sm font-medium text-white
          transition-colors duration-150 hover:bg-[#1b4489]"
      >
        Try the new Studio →
      </Link>
    </div>
  );
};

export default StudioBanner;
