import React, { useEffect, useRef, useState } from 'react';
import { GripHorizontal, Maximize2, Minimize2, Minus, Plus, RotateCcw } from 'lucide-react';

interface MovableGlassPanelProps {
  id: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  resetTrigger?: number;
  defaultMinimized?: boolean;
  allowMinimize?: boolean;
  allowExpand?: boolean;
  compactHandle?: boolean;
}

export const MovableGlassPanel: React.FC<MovableGlassPanelProps> = ({
  id,
  title,
  subtitle,
  headerRight,
  children,
  className = '',
  bodyClassName = '',
  resetTrigger = 0,
  defaultMinimized = false,
  allowMinimize = true,
  allowExpand = false,
  compactHandle = false
}) => {
  const storageKey = `matibox_panel_pos_${id}`;

  const [offset, setOffset] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    return { x: 0, y: 0 };
  });

  const [dragging, setDragging] = useState(false);
  const [minimized, setMinimized] = useState(defaultMinimized);
  const [expanded, setExpanded] = useState(false);
  const [zIndexBoost, setZIndexBoost] = useState(false);

  const startRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  // Reset position when parent triggers layout reset
  useEffect(() => {
    if (resetTrigger > 0) {
      setOffset({ x: 0, y: 0 });
      setMinimized(false);
      setExpanded(false);
      setZIndexBoost(false);
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  }, [resetTrigger, storageKey]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Do not start drag if clicking a button, input, select, or link inside header
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [data-no-drag="true"]')) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setZIndexBoost(true);
    startRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: offset.x,
      origY: offset.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !startRef.current) return;
    const dx = e.clientX - startRef.current.startX;
    const dy = e.clientY - startRef.current.startY;
    const next = {
      x: Math.round(startRef.current.origX + dx),
      y: Math.round(startRef.current.origY + dy)
    };
    setOffset(next);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDragging(false);
    startRef.current = null;
    try {
      localStorage.setItem(storageKey, JSON.stringify(offset));
    } catch {
      // ignore
    }
  };

  const resetPosition = () => {
    setOffset({ x: 0, y: 0 });
    setZIndexBoost(false);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const isMoved = offset.x !== 0 || offset.y !== 0;

  return (
    <div
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: dragging
          ? 'none'
          : 'transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease',
        zIndex: dragging ? 60 : zIndexBoost && isMoved ? 35 : undefined
      }}
      onMouseDown={() => {
        if (isMoved) setZIndexBoost(true);
      }}
      className={`liquid-glass rounded-3xl overflow-hidden ${
        dragging ? 'ring-2 ring-[#E97905] shadow-2xl scale-[1.008]' : ''
      } ${expanded ? 'fixed inset-4 z-50 flex flex-col !transform-none' : ''} ${className}`}
    >
      {/* Apple Liquid Glass Top Drag Handle Bar */}
      {compactHandle && !title ? (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Drag to move this glass card anywhere"
          className="flex items-center justify-between px-3 pt-2 pb-1 cursor-grab active:cursor-grabbing select-none group"
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-55 group-hover:opacity-95 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <GripHorizontal className="w-3.5 h-3.5 text-[#E97905]" />
            <span>Drag</span>
          </div>
          {isMoved && (
            <button
              type="button"
              onClick={resetPosition}
              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E97905]/15 text-[#E97905] hover:bg-[#E97905]/25 transition cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Snap Back
            </button>
          )}
        </div>
      ) : (
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Grab anywhere on this glass bar to move panel"
          className="px-4 py-3 border-b border-white/30 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 cursor-grab active:cursor-grabbing select-none bg-white/25 dark:bg-black/15"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition"
              style={{
                background: 'rgba(233, 121, 5, 0.14)',
                border: '1px solid rgba(233, 121, 5, 0.32)',
                color: '#E97905'
              }}
            >
              <GripHorizontal className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              {title && (
                <div
                  className="text-sm font-bold tracking-tight truncate flex items-center gap-2"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5" data-no-drag="true">
            {headerRight}

            {isMoved && (
              <button
                type="button"
                onClick={resetPosition}
                title="Snap panel back to default slot"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E97905]/15 text-[#E97905] border border-[#E97905]/30 hover:bg-[#E97905]/25 transition cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Snap Back
              </button>
            )}

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

            {allowMinimize && (
              <button
                type="button"
                onClick={() => setMinimized((prev) => !prev)}
                title={minimized ? 'Expand Content' : 'Collapse into Floating Pill'}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                style={{ color: 'var(--text-body)' }}
              >
                {minimized ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Panel Body */}
      {!minimized && (
        <div className={`${expanded ? 'flex-1 overflow-auto' : ''} ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  );
};
