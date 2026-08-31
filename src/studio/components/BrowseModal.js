import { useEffect, useRef, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useStudio } from '../StudioProvider';
import { booksOf, bookName, bookMatches, normalizeName } from '../../lib/passage';
import { HiOutlineSearch } from 'react-icons/hi';

const Breadcrumb = ({ parts }) => (
  <div className="flex min-w-0 items-center gap-2 text-sm">
    {parts.map((part, i) => (
      <span key={part.label} className="flex min-w-0 items-center gap-2">
        {i > 0 && <span className="text-studio-faint">›</span>}
        {part.onClick ? (
          <button
            type="button"
            onClick={part.onClick}
            className="truncate text-studio-muted transition-colors duration-150 hover:text-studio-text"
          >
            {part.label}
          </button>
        ) : (
          <span className="truncate font-semibold text-studio-text">{part.label}</span>
        )}
      </span>
    ))}
  </div>
);

const GridButton = ({ state = 'idle', className = '', ...rest }) => {
  const states = {
    idle: 'border-studio-border bg-white text-studio-text hover:border-studio-faint hover:bg-studio-surface',
    edge: 'border-studio-text bg-studio-surface font-semibold text-studio-text',
    inside: 'border-studio-border bg-studio-surface font-semibold text-studio-text',
  };

  return (
    <button
      type="button"
      className={`h-10 rounded-studio border text-sm transition-colors duration-150 focus:outline-none
        focus-visible:ring-2 focus-visible:ring-studio-accent/40 ${states[state]} ${className}`}
      {...rest}
    />
  );
};

const BrowseModal = ({ open, initialBook, onClose, onPick }) => {
  const { admin, loadChapterCount, loadVerseCount } = useStudio();

  const [book, setBook] = useState(null);
  const [chapter, setChapter] = useState(null);
  const [counts, setCounts] = useState({ chapters: 0, verses: 0 });
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState(null);
  const [query, setQuery] = useState('');

  const searchRef = useRef(null);

  const books = booksOf(admin.lang);
  const needle = normalizeName(query);
  const matches = needle ? books.filter(entry => bookMatches(entry.book, needle)) : books;

  const reset = () => {
    setBook(null);
    setChapter(null);
    setRange(null);
    setQuery('');
    setCounts({ chapters: 0, verses: 0 });
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    reset();

    // Opened by typing a book name: go straight to that book's chapters.
    if (initialBook) {
      pickBook(initialBook);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialBook]);

  // Type straight away instead of reaching for the mouse. Runs after Modal's
  // own focus effect, which fires first because it is the child.
  useEffect(() => {
    if (open && !book) {
      searchRef.current?.focus();
    }
  }, [open, book]);

  const pickBook = async next => {
    setBook(next);
    setChapter(null);
    setRange(null);
    setLoading(true);

    try {
      const chapters = await loadChapterCount({ book: next.book, lang: admin.lang, version: admin.version });
      setCounts({ chapters, verses: 0 });
    } catch (e) {
      setCounts({ chapters: 0, verses: 0 });
    } finally {
      setLoading(false);
    }
  };

  const pickChapter = async next => {
    setChapter(next);
    setRange(null);
    setLoading(true);

    try {
      const verses = await loadVerseCount({
        book: book.book,
        chapter: next,
        lang: admin.lang,
        version: admin.version,
      });
      setCounts(current => ({ ...current, verses }));
    } catch (e) {
      setCounts(current => ({ ...current, verses: 0 }));
    } finally {
      setLoading(false);
    }
  };

  /** Tap to select, tap again to extend, tap a third time to start over. */
  const pickVerse = verse =>
    setRange(current =>
      !current || current.complete
        ? { from: verse, to: verse, complete: false }
        : { from: Math.min(current.from, verse), to: Math.max(current.from, verse), complete: true },
    );

  const verseState = verse => {
    if (!range) {
      return 'idle';
    }

    if (verse === range.from || verse === range.to) {
      return 'edge';
    }

    return verse > range.from && verse < range.to ? 'inside' : 'idle';
  };

  const step = !book ? 'books' : !chapter ? 'chapters' : 'verses';

  const rangeLabel = range && (range.to > range.from ? `${range.from}-${range.to}` : `${range.from}`);
  const addLabel =
    step === 'verses' && range
      ? `Add ${bookName(book.book, admin.lang)} ${chapter}:${rangeLabel}`
      : `Add ${book ? bookName(book.book, admin.lang) : ''} ${chapter || ''}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <Breadcrumb
          parts={[
            { label: admin.version, onClick: book ? reset : null },
            ...(book ? [{ label: book.name, onClick: chapter ? () => pickBook(book) : null }] : []),
            ...(chapter ? [{ label: `Chapter ${chapter}` }] : []),
          ]}
        />
      }
      footer={
        <>
          {step === 'verses' && (
            <Button variant="secondary" size="md" onClick={() => onPick({ book: book.book, chapter })}>
              Whole chapter
            </Button>
          )}
          {step === 'verses' && (
            <Button
              variant="success"
              size="md"
              disabled={!range}
              onClick={() => onPick({ book: book.book, chapter, from: range.from, to: range.to })}
            >
              {range ? addLabel : 'Select a verse'}
            </Button>
          )}
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {loading && <p className="py-8 text-center text-sm text-studio-muted">Loading…</p>}

      {!loading && step === 'books' && (
        <>
          <div className="relative mb-3 flex items-center">
            <HiOutlineSearch className="pointer-events-none absolute left-3 text-base text-studio-faint" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              placeholder="Filter books"
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && matches.length > 0) {
                  e.preventDefault();
                  pickBook(matches[0]);
                }
              }}
              className="h-9 w-full rounded-studio border border-studio-border bg-white pl-9 pr-3 text-sm
                text-studio-text placeholder:text-studio-faint focus:outline-none
                focus-visible:ring-2 focus-visible:ring-studio-accent/40"
            />
          </div>

          <div className="studio-scroll h-[58vh] overflow-y-auto pr-1">
            {matches.length === 0 ? (
              <p className="pt-10 text-center text-sm text-studio-muted">No book matches "{query}".</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 pb-2 sm:grid-cols-3 md:grid-cols-4">
                {matches.map(entry => (
                  <GridButton key={entry.book} onClick={() => pickBook(entry)} className="truncate px-3 text-left">
                    {entry.name}
                  </GridButton>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {!loading && step === 'chapters' && (
        <div className="grid grid-cols-6 gap-2 pb-2 sm:grid-cols-8 md:grid-cols-10">
          {Array.from({ length: counts.chapters }, (_, i) => i + 1).map(n => (
            <GridButton key={n} onClick={() => pickChapter(n)}>
              {n}
            </GridButton>
          ))}
        </div>
      )}

      {!loading && step === 'verses' && (
        <div className="pb-2">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
            {Array.from({ length: counts.verses }, (_, i) => i + 1).map(n => (
              <GridButton key={n} state={verseState(n)} onClick={() => pickVerse(n)}>
                {n}
              </GridButton>
            ))}
          </div>
          <p className="mt-4 text-sm text-studio-muted">
            Tap a verse to select it, tap another to extend the range, then tap again to start over.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default BrowseModal;
