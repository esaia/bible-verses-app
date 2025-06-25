import { Link } from 'react-router-dom';

const FixedButton = ({ to, title, target }) => {
  return (
    <>
      <Link
        to={to}
        target={target}
        className=" px-4 py-2 mx-5 rounded-md dark:bg-[#374151] hover:shadow-lg dark:text-white bg-white text-black border-[#cccccc] dark:border-gray-600  border-[1px]"
      >
        {title}
      </Link>
    </>
  );
};

export default FixedButton;
