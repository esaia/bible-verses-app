import Modal from './Modal';
import Button from './Button';

/**
 * A yes/no gate in front of something that cannot be undone. The confirming
 * button carries the action's own wording, so the dialog reads as a sentence
 * rather than as an OK/Cancel pair.
 */
const ConfirmDialog = ({ open, title, message, confirmLabel = 'Delete', variant = 'danger', onConfirm, onCancel }) => (
  <Modal
    open={open}
    onClose={onCancel}
    title={title}
    width="max-w-md"
    footer={
      <>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </>
    }
  >
    <p className="py-1 text-sm leading-relaxed text-studio-muted">{message}</p>
  </Modal>
);

export default ConfirmDialog;
