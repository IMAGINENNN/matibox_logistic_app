import React from 'react';
import { Edit3, Phone, Radio, Trash2, Truck, Users } from 'lucide-react';
import { DeliveryAssignment, Driver } from '../../types';
import { GlassPanel } from '../GlassPanel';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

export const DRIVER_COLOR_SWATCHES = [
  '#276EF1',
  '#A855F7',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#EAB308',
  '#14B8A6',
  '#6366F1'
];

interface DriversViewProps {
  drivers: Driver[];
  assignments: DeliveryAssignment[];
  onChangeColor: (driverId: string, color: string) => void;
  onEdit: (driver: Driver) => void;
  onDelete: (driver: Driver) => void;
  onCreate: () => void;
}

export const DriversView: React.FC<DriversViewProps> = ({
  drivers,
  assignments,
  onChangeColor,
  onEdit,
  onDelete,
  onCreate
}) => {
  return (
    <GlassPanel
      title={`Delivery Drivers (${drivers.length})`}
      subtitle="Manage driver accounts, route map colors, live GPS status, and route progress"
      bodyClassName="p-0"
    >
      {drivers.length === 0 ? (
        <EmptyState
          icon={<Users className="w-5 h-5" />}
          title="No drivers registered"
          description="Create a driver account so they can sign in, share live GPS, and claim delivery stops."
          action={
            <Button variant="primary" size="sm" onClick={onCreate}>
              Add Driver
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wider surface-elevated"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3 px-4">Driver & Status</th>
                  <th className="py-3 px-4">Map Route Color</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Today's Route</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {drivers.map((drv) => {
                  const drvStops = assignments.filter((a) => a.driverId === drv.id);
                  const drvDone = drvStops.filter((a) => a.isDelivered).length;
                  const drvColor = drv.color || '#276EF1';

                  return (
                    <tr key={drv.id} className="hover:bg-[var(--surface-hover)]/45 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                            {drv.name}
                          </span>
                          {drv.isOnline ? (
                            <Badge tone="success" dot pulse>
                              Live GPS
                            </Badge>
                          ) : (
                            <Badge tone="neutral">Offline</Badge>
                          )}
                        </div>
                        {drv.isOnline && drv.lastLatitude && drv.lastLongitude && (
                          <div className="text-[11px] text-[var(--status-success)] mt-0.5 tabular-nums">
                            {drv.lastLatitude.toFixed(4)}, {drv.lastLongitude.toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            aria-label={`Route color for ${drv.name}`}
                            value={drvColor}
                            onChange={(e) => onChangeColor(drv.id, e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-[var(--border-strong)] bg-transparent"
                          />
                          <div className="flex items-center gap-1">
                            {DRIVER_COLOR_SWATCHES.slice(0, 5).map((sw) => (
                              <button
                                key={sw}
                                type="button"
                                aria-label={`Set ${drv.name} color to ${sw}`}
                                onClick={() => onChangeColor(drv.id, sw)}
                                className={`w-4 h-4 rounded-full border cursor-pointer transition ${
                                  drvColor === sw
                                    ? 'border-white scale-110 ring-2 ring-[var(--accent-primary)]'
                                    : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: sw }}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div style={{ color: 'var(--text-body-color)' }}>{drv.email}</div>
                        <a
                          href={`tel:${drv.contact}`}
                          className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                        >
                          <Phone className="w-3 h-3" />
                          {drv.contact}
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge tone="neutral">
                          <Truck className="w-3.5 h-3.5" style={{ color: drvColor }} />
                          {drv.car || 'Unassigned Vehicle'}
                        </Badge>
                      </td>
                      <td
                        className="py-3.5 px-4 text-xs font-bold tabular-nums"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        {drvDone} / {drvStops.length} delivered
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <Button variant="secondary" size="xs" onClick={() => onEdit(drv)}>
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button variant="danger" size="xs" onClick={() => onDelete(drv)}>
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Cards (< lg) */}
          <div className="lg:hidden divide-y divide-[var(--border-subtle)]">
            {drivers.map((drv) => {
              const drvStops = assignments.filter((a) => a.driverId === drv.id);
              const drvDone = drvStops.filter((a) => a.isDelivered).length;
              const drvColor = drv.color || '#276EF1';

              return (
                <div key={drv.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-3 h-3 rounded-full border border-white shrink-0"
                          style={{ backgroundColor: drvColor }}
                        />
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                          {drv.name}
                        </h3>
                        {drv.isOnline ? (
                          <Badge tone="success" dot pulse>
                            <Radio className="w-2.5 h-2.5" />
                            Live GPS
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Offline</Badge>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {drv.email}
                      </p>
                      <a
                        href={`tel:${drv.contact}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                      >
                        <Phone className="w-3 h-3" />
                        {drv.contact}
                      </a>
                    </div>
                    <span
                      className="text-xs font-bold tabular-nums shrink-0"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {drvDone}/{drvStops.length} done
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold surface-elevated border border-[var(--border-subtle)] rounded-xl px-2.5 py-1.5 cursor-pointer">
                        <input
                          type="color"
                          aria-label={`Route color for ${drv.name}`}
                          value={drvColor}
                          onChange={(e) => onChangeColor(drv.id, e.target.value)}
                          className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span style={{ color: 'var(--text-heading)' }}>Route Color</span>
                      </label>
                      <Badge tone="neutral" className="max-w-[180px] truncate">
                        <Truck className="w-3 h-3 shrink-0" style={{ color: drvColor }} />
                        <span className="truncate">{drv.car || 'No Car'}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button variant="secondary" size="xs" onClick={() => onEdit(drv)}>
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        aria-label={`Delete ${drv.name}`}
                        onClick={() => onDelete(drv)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </GlassPanel>
  );
};
