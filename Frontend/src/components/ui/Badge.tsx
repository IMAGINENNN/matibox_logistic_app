import React from 'react';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
  pulse?: boolean;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral:
    'bg-[var(--surface-subtle)] text-[var(--text-body-color)] border-[var(--border-subtle)]',
  accent:
    'bg-[var(--accent-primary-soft)] text-[var(--accent-primary-vivid)] border-[var(--accent-primary)]/30',
  success:
    'bg-[var(--status-success-soft)] text-[var(--status-success)] border-[var(--status-success)]/30',
  warning:
    'bg-[var(--status-warning-soft)] text-[var(--status-warning)] border-[var(--status-warning)]/30',
  danger:
    'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger)]/30'
};

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  className = '',
  dot = false,
  pulse = false
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tabular-nums ${TONE_CLASSES[tone]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full bg-current shrink-0 ${pulse ? 'animate-pulse' : ''}`}
        />
      )}
      {children}
    </span>
  );
};
