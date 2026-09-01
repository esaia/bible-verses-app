import { useState } from 'react';
import {
  HiOutlineSearch,
  HiOutlineMenuAlt2,
  HiPlus,
  HiOutlineChevronDoubleDown,
  HiOutlineChevronDoubleUp,
} from 'react-icons/hi';
import Button from '../ui/Button';
import BrowseModal from './BrowseModal';
import { useStudio } from '../StudioProvider';
import { findBook, parseReference } from '../../lib/passage';

const SearchBar = () => {
  const { admin, addPassage, loading, blocks, setAllCollapsed } = useStudio();

  const [query, setQuery] = useState('');
  const [hint, setHint] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [jumpToBook, setJumpToBook] = useState(null);

  // One button for both directions: while anything is still open it folds
  // everything, and only offers to unfold once the list is fully collapsed.
  const allCollapsed = blocks.length > 0 && blocks.every(block => block.collapsed);

  const submit = async e => {
    e.preventDefault();

    const parsed = parseReference(query, admin.lang);

    if (!parsed) {
      // A bare book name is a reasonable thing to type: open Browse on that
      // book's chapters rather than rejecting it.
      const book = findBook(query, admin.lang);

      if (book) {
        setHint('');
        setQuery('');
        setJumpToBook(book);
        setBrowsing(true);
        return;
      }

      setHint('Could not read that reference. Try a book, chapter and verse — or use Browse.');
      return;
    }

    setHint('');
    setQuery('');
    await addPassage({
      book: parsed.book,
      chapter: parsed.chapter,
      from: parsed.verse,
      to: parsed.verseTo || parsed.verse,
    });
  };

  return (
    <>
      <div className="border-b border-studio-divider bg-white px-3 py-3 sm:px-4">
        <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
          <div className="relative flex w-full min-w-0 basis-full items-center sm:w-auto sm:flex-1 sm:basis-0">
            <HiOutlineSearch className="pointer-events-none absolute left-3 text-base text-studio-faint" />
            <input
              type="text"
              value={query}
              placeholder="Search a passage, e.g. John 3:16-18"
              onChange={e => {
                setQuery(e.target.value);
                setHint('');
              }}
              className="h-9 w-full rounded-studio border border-studio-border bg-white pl-9 pr-3 text-sm
                text-studio-text placeholder:text-studio-faint focus:outline-none
                focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />
          </div>

          <Button
            type="submit"
            variant="accent"
            size="md"
            disabled={!query.trim() || loading}
            icon={<HiPlus className="text-sm" />}
          >
            Add
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => setBrowsing(true)}
            icon={<HiOutlineMenuAlt2 className="text-sm" />}
          >
            Browse
          </Button>

          {blocks.length > 0 && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => setAllCollapsed(!allCollapsed)}
              icon={
                allCollapsed ? (
                  <HiOutlineChevronDoubleDown className="text-sm" />
                ) : (
                  <HiOutlineChevronDoubleUp className="text-sm" />
                )
              }
            >
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </Button>
          )}
        </form>

        {hint && <p className="mt-2 text-xs text-studio-danger">{hint}</p>}
      </div>

      <BrowseModal
        open={browsing}
        initialBook={jumpToBook}
        onClose={() => {
          setBrowsing(false);
          setJumpToBook(null);
        }}
        onPick={async passage => {
          setBrowsing(false);
          setJumpToBook(null);
          await addPassage(passage);
        }}
      />
    </>
  );
};

export default SearchBar;
