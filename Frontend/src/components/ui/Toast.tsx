import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onDismiss?: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 glass-floating-strong px-4 py-3 rounded-2xl flex items-center justify-between gap-3 animate-toast"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--status-success)]" />
        <span
          className="text-xs font-semibold truncate"
          style={{ color: 'var(--text-heading)' }}
        >
          {message}
        </span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer shrink-0"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
