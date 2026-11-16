import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface GlassPanelProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  allowExpand?: boolean;
}

export const GlassPanel: React.FC<GlassPanelProps> = ({
  title,
  subtitle,
  headerRight,
  children,
  className = '',
  bodyClassName = '',
  allowExpand = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasHeader = Boolean(title || subtitle || headerRight || allowExpand);

  return (
    <div
      className={`liquid-glass rounded-3xl overflow-hidden ${
        expanded ? 'fixed inset-4 z-50 flex flex-col' : ''
      } ${className}`}
    >
      {hasHeader && (
        <div className="px-4 py-3 border-b border-white/30 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/25 dark:bg-black/15">
          <div className="min-w-0 flex-1">
            {title && (
              <div
                className="text-sm font-bold tracking-tight flex flex-wrap items-center gap-2 min-w-0"
                style={{ color: 'var(--text-heading)' }}
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-[11px] break-words" style={{ color: 'var(--text-muted)' }}>
                {subtitle}
              </div>
            )}
          </div>

          {(headerRight || allowExpand) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {headerRight}
              {allowExpand && (
                <button
                  type="button"
                  onClick={() => setExpanded((prev) => !prev)}
                  title={expanded ? 'Exit Fullscreen' : 'Expand Panel'}
                  className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                  style={{ color: 'var(--text-body)' }}
                >
                  {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`${expanded ? 'flex-1 overflow-auto' : ''} ${bodyClassName}`}>
        {children}
      </div>
    </div>
  );
};
