import { Modal } from './Modal';
import { Button } from './Button';

// =============================================================================
// Types
// =============================================================================

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should close (cancel or backdrop click) */
  onClose: () => void;
  /** Called when the user confirms the action */
  onConfirm: () => void;
  /** Dialog title */
  title: string;
  /** Description of what the action will do */
  message: string;
  /** Label for the confirm button */
  confirmLabel?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Visual variant for the confirm button */
  confirmVariant?: 'danger' | 'primary';
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Confirmation dialog for destructive or important actions.
 * Built on top of Modal with pre-configured footer buttons.
 *
 * @example
 * <ConfirmDialog
 *   isOpen={showDelete}
 *   onClose={() => setShowDelete(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Campaign"
 *   message="This will permanently delete the campaign and all associated messages. This action cannot be undone."
 *   confirmLabel="Delete"
 *   confirmVariant="danger"
 * />
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            size="sm"
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-gray-600">{message}</p>
    </Modal>
  );
}

export default ConfirmDialog;
