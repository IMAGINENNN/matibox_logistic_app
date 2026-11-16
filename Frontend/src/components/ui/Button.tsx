import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'btn-primary text-white',
  secondary: 'btn-secondary',
  ghost:
    'bg-transparent hover:bg-[var(--surface-hover)] text-[var(--text-body-color)] hover:text-[var(--text-heading)] border border-transparent',
  danger:
    'bg-[var(--status-danger-soft)] hover:bg-[var(--status-danger)] text-[var(--status-danger)] hover:text-white border border-[var(--status-danger)]/25',
  success:
    'bg-[var(--status-success)] hover:opacity-90 text-white border border-transparent shadow-sm'
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'min-h-[32px] px-2.5 py-1 text-xs rounded-lg gap-1',
  sm: 'min-h-[36px] px-3 py-1.5 text-xs rounded-xl gap-1.5',
  md: 'min-h-[42px] px-4 py-2 text-[13px] rounded-xl gap-2',
  lg: 'min-h-[48px] px-5 py-3 text-sm rounded-2xl gap-2'
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...rest
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold tracking-[-0.01em] transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98] ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};
