import React, { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface GlassPanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  allowExpand?: boolean;
  variant?: 'surface' | 'glass';
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  title,
  subtitle,
  headerRight,
  children,
  className = '',
  bodyClassName = '',
  allowExpand = false,
  variant = 'surface'
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasHeader = Boolean(title || subtitle || headerRight || allowExpand);

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded]);

  const surfaceClass =
    expanded || variant === 'glass' ? 'glass-floating-strong' : 'surface-card';

  return (
    <section
      className={`${surfaceClass} rounded-2xl overflow-hidden transition-shadow ${
        expanded ? 'fixed inset-3 sm:inset-5 z-50 flex flex-col animate-modal' : ''
      } ${className}`}
    >
      {hasHeader && (
        <div className="px-4 sm:px-5 py-3.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2.5">
          <div className="min-w-0 flex-1">
            {title && (
              <h2
                className="font-bold tracking-[-0.015em] flex flex-wrap items-center gap-2 min-w-0"
                style={{ fontSize: 'var(--text-title)', color: 'var(--text-heading)' }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                className="text-xs mt-0.5 leading-snug break-words"
                style={{ color: 'var(--text-muted)' }}
              >
                {subtitle}
              </p>
            )}
          </div>

          {(headerRight || allowExpand) && (
            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {allowExpand && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  aria-label={expanded ? 'Exit fullscreen' : 'Expand panel'}
                  title={expanded ? 'Exit Fullscreen (Esc)' : 'Expand Panel'}
                  className="p-2 rounded-xl hover:bg-[var(--surface-hover)] transition cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {expanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${expanded ? 'flex-1 overflow-auto' : ''} ${bodyClassName}`}>
        {children}
      </div>
    </section>
  );
};
