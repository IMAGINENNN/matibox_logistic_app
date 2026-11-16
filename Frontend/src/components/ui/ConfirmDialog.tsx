import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'warning';
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  loading = false
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <div className="space-y-5">
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 ${
            tone === 'danger'
              ? 'bg-[var(--status-danger-soft)] border-[var(--status-danger)]/30'
              : 'bg-[var(--status-warning-soft)] border-[var(--status-warning)]/30'
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              tone === 'danger' ? 'text-[var(--status-danger)]' : 'text-[var(--status-warning)]'
            }`}
          />
          <div className="space-y-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
              {message}
            </p>
            {detail && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-body-color)' }}>
                {detail}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-1">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            className={
              tone === 'danger'
                ? '!bg-[var(--status-danger)] !text-white hover:opacity-90'
                : ''
            }
          >
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
