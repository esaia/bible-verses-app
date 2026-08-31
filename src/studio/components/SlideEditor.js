import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Edit the words of a single slide.
 *
 * `SongEditor` rewrites a whole song and re-splits it into slides, which is the
 * right tool for importing or restructuring but far too much machinery for
 * fixing one typo mid-service. This touches only the slide it was opened on and
 * leaves every other slide, and the slide breaks, exactly as they were.
 */
const SlideEditor = ({ open, slide, index, onSave, onClose }) => {
  const [text, setText] = useState('');

  // Reset whenever a different slide is opened, so the box never shows the
  // previous slide's words for a frame.
  useEffect(() => {
    if (open) {
      setText(slide?.text || '');
    }
  }, [open, slide]);

  const dirty = text !== (slide?.text || '');

  const save = () => {
    onSave(text);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit slide ${index + 1}`}
      width="max-w-lg"
      footer={
        <>
          <Button variant="ghost" size="md" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" size="md" onClick={save} disabled={!text.trim() || !dirty}>
            Save
          </Button>
        </>
      }
    >
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={5}
        autoFocus
        // Ctrl/Cmd+Enter saves: the operator is often mid-service and reaching
        // for the mouse costs more than the edit did.
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && text.trim() && dirty) {
            save();
          }
        }}
        className="w-full resize-y rounded-studio border border-studio-border p-3 text-sm leading-relaxed
          text-studio-text focus:outline-none focus-visible:ring-2 focus-visible:ring-studio-accent/40"
      />

      <p className="mt-2 text-xs text-studio-muted">
        Line breaks are kept for the slide list but ignored on screen, where the text is re-wrapped to fit.
      </p>
    </Modal>
  );
};

export default SlideEditor;
