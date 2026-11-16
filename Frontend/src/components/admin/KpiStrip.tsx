import React from 'react';
import { Building2, CheckCircle2, Clock, Package, Truck } from 'lucide-react';

interface KpiStripProps {
  totalStops: number;
  unassignedCount: number;
  inTransitCount: number;
  deliveredCount: number;
  totalCrates: number;
  driversCount: number;
  selectedDate: string;
  driverFilter: string;
  onFilterChange: (filter: string) => void;
}

export const KpiStrip: React.FC<KpiStripProps> = ({
  totalStops,
  unassignedCount,
  inTransitCount,
  deliveredCount,
  totalCrates,
  driversCount,
  selectedDate,
  driverFilter,
  onFilterChange
}) => {
  const completionPct = totalStops > 0 ? Math.round((deliveredCount / totalStops) * 100) : 0;

  const cards = [
    {
      id: 'total',
      label: 'Total Stops',
      value: totalStops,
      sub: selectedDate,
      icon: Building2,
      toneClass: 'text-[var(--text-heading)]',
      iconColor: 'var(--accent-primary-vivid)',
      onClick: () => onFilterChange('ALL'),
      active: driverFilter === 'ALL'
    },
    {
      id: 'unassigned',
      label: 'Unassigned',
      value: unassignedCount,
      sub: 'Pool · Ready',
      icon: Clock,
      toneClass: 'text-[var(--status-warning)]',
      iconColor: 'var(--status-warning)',
      onClick: () => onFilterChange('UNASSIGNED'),
      active: driverFilter === 'UNASSIGNED'
    },
    {
      id: 'transit',
      label: 'In Transit',
      value: inTransitCount,
      sub: 'On active routes',
      icon: Truck,
      toneClass: 'text-[var(--accent-primary-vivid)]',
      iconColor: 'var(--accent-primary-vivid)'
    },
    {
      id: 'delivered',
      label: 'Delivered',
      value: (
        <span>
          {deliveredCount}
          <span className="text-sm font-medium opacity-50"> / {totalStops}</span>
        </span>
      ),
      sub: `${completionPct}% completed`,
      icon: CheckCircle2,
      toneClass: 'text-[var(--status-success)]',
      iconColor: 'var(--status-success)'
    },
    {
      id: 'units',
      label: 'Total Units',
      value: totalCrates,
      sub: `${driversCount} active drivers`,
      icon: Package,
      toneClass: 'text-[var(--text-heading)]',
      iconColor: 'var(--text-muted)',
      spanMobile: true
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        const isInteractive = Boolean(card.onClick);
        return (
          <div
            key={card.id}
            onClick={card.onClick}
            role={isInteractive ? 'button' : undefined}
            tabIndex={isInteractive ? 0 : undefined}
            onKeyDown={
              isInteractive
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      card.onClick?.();
                    }
                  }
                : undefined
            }
            className={`surface-card rounded-2xl px-3 sm:px-4 py-3 sm:py-3.5 transition-all ${
              card.spanMobile ? 'col-span-2 sm:col-span-1' : ''
            } ${isInteractive ? 'cursor-pointer hover:border-[var(--accent-primary)]/50' : ''} ${
              card.active ? 'ring-2 ring-[var(--accent-primary)] border-transparent' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-xs font-semibold truncate"
                style={{ color: 'var(--text-muted)' }}
              >
                {card.label}
              </span>
              <Icon className="w-4 h-4 shrink-0" style={{ color: card.iconColor }} />
            </div>
            <div
              className={`text-2xl font-bold mt-1.5 tracking-tight tabular-nums ${card.toneClass}`}
            >
              {card.value}
            </div>
            <div
              className="text-[11px] font-medium mt-0.5 tabular-nums truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              {card.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
};
