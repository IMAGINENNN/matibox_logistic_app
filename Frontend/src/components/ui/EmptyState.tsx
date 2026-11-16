import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action
}) => {
  return (
    <div className="px-6 py-10 text-center flex flex-col items-center justify-center gap-2.5">
      <div className="w-11 h-11 rounded-2xl surface-subtle flex items-center justify-center text-[var(--accent-primary-vivid)]">
        {icon}
      </div>
      <h3 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h3>
      <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
      {action && <div className="pt-1.5">{action}</div>}
    </div>
  );
};
