import { useEffect, useRef } from 'react';
import { HiOutlineX } from 'react-icons/hi';
import IconButton from './IconButton';

const Modal = ({ open, onClose, title, children, footer, width = 'max-w-3xl' }) => {
  const cardRef = useRef(null);

  // Held in a ref so this effect keys on `open` alone. Callers pass an inline
  // arrow for onClose, and re-running on every render would yank focus back to
  // the dialog from whatever the content had focused.
  const closeRef = useRef(onClose);

  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeRef.current();
      }
    };

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    cardRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-ui"
      style={{ backgroundColor: 'rgba(16, 24, 40, 0.5)' }}
      onMouseDown={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[86vh] w-full ${width} flex-col overflow-hidden rounded-studio-lg
          bg-white shadow-studio-modal focus:outline-none`}
      >
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-4">
          {typeof title === 'string' ? (
            <h2 className="rounded-studio border border-studio-border px-3 py-1.5 text-sm font-semibold text-studio-text">
              {title}
            </h2>
          ) : (
            title
          )}
          <IconButton label="Close" onClick={onClose}>
            <HiOutlineX className="text-lg" />
          </IconButton>
        </div>

        <div className="studio-scroll flex-1 overflow-y-auto px-5 py-2">{children}</div>

        {footer && <div className="flex items-center justify-end gap-2 px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
