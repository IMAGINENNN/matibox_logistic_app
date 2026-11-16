import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  GripVertical,
  MapPin,
  Package,
  Palette,
  Phone,
  Truck,
  Wand2
} from 'lucide-react';
import { DeliveryAssignment, Driver } from '../../types';
import { GlassPanel } from '../GlassPanel';
import { LogisticsMap } from '../LogisticsMap';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface DispatchWorkspaceProps {
  dispatchMode: 'split' | 'kanban';
  swapSplitPanels: boolean;
  onToggleSwapPanels: () => void;
  loading: boolean;
  assignments: DeliveryAssignment[];
  searchedAssignments: DeliveryAssignment[];
  filteredAssignments: DeliveryAssignment[];
  drivers: Driver[];
  driverFilter: string;
  onDriverFilterChange: (filter: string) => void;
  unassignedCount: number;
  onAssignDriver: (assignmentId: number, driverId: string | null) => Promise<void>;
  onToggleDelivered: (assignment: DeliveryAssignment) => Promise<void>;
  onOptimizeDriver: (driverId: string) => Promise<void>;
  onSmartDistributePool: () => Promise<void>;
  onMoveStop: (driverId: string, index: number, direction: -1 | 1) => Promise<void>;
  onChangeDriverColor: (driverId: string, color: string) => Promise<void>;
  onReorderRoute: (driverId: string, orderedAssignmentIds: number[]) => Promise<void>;
}

export const DispatchWorkspace: React.FC<DispatchWorkspaceProps> = ({
  dispatchMode,
  swapSplitPanels,
  onToggleSwapPanels,
  loading,
  assignments,
  searchedAssignments,
  filteredAssignments,
  drivers,
  driverFilter,
  onDriverFilterChange,
  unassignedCount,
  onAssignDriver,
  onToggleDelivered,
  onOptimizeDriver,
  onSmartDistributePool,
  onMoveStop,
  onChangeDriverColor,
  onReorderRoute
}) => {
  const [draggedAssignmentId, setDraggedAssignmentId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);

  const handleDropOnStop = async (targetStop: DeliveryAssignment) => {
    if (draggedAssignmentId === null || draggedAssignmentId === targetStop.id) {
      setDragOverStopId(null);
      return;
    }

    const draggedStop = assignments.find((a) => a.id === draggedAssignmentId);
    if (!draggedStop) return;

    const targetDriverId = targetStop.driverId;

    if (draggedStop.driverId !== targetDriverId) {
      await onAssignDriver(draggedStop.id, targetDriverId);
      setDraggedAssignmentId(null);
      setDragOverStopId(null);
      return;
    }

    if (!targetDriverId) {
      setDraggedAssignmentId(null);
      setDragOverStopId(null);
      return;
    }

    const driverStops = assignments
      .filter((a) => a.driverId === targetDriverId)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const fromIdx = driverStops.findIndex((s) => s.id === draggedAssignmentId);
    const toIdx = driverStops.findIndex((s) => s.id === targetStop.id);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...driverStops];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    setDraggedAssignmentId(null);
    setDragOverStopId(null);

    await onReorderRoute(
      targetDriverId,
      reordered.map((x) => x.id)
    );
  };

  // Map Panel
  const mapPanelNode = (
    <GlassPanel
      allowExpand
      title={
        <span className="inline-flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[var(--accent-primary-vivid)]" />
          <span>Oslo & Viken Live Map</span>
        </span>
      }
      subtitle="Color-coded driver routes · Online drivers share live GPS"
      headerRight={
        <Button
          variant="secondary"
          size="xs"
          onClick={onToggleSwapPanels}
          title="Swap Map & Queue sides"
          className="hidden lg:inline-flex"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)]" />
          Swap
        </Button>
      }
      bodyClassName="p-3.5 sm:p-4 space-y-3"
    >
      {/* Driver Filter Pills + Inline Color Pickers + Drag Drop Targets */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onDriverFilterChange('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tabular-nums ${
            driverFilter === 'ALL'
              ? 'btn-primary'
              : 'surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50'
          }`}
          style={driverFilter !== 'ALL' ? { color: 'var(--text-heading)' } : undefined}
        >
          All ({assignments.length})
        </button>

        <button
          type="button"
          onClick={() => onDriverFilterChange('UNASSIGNED')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTarget('UNASSIGNED');
          }}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOverTarget(null);
            if (draggedAssignmentId !== null) {
              await onAssignDriver(draggedAssignmentId, null);
              setDraggedAssignmentId(null);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer tabular-nums ${
            dragOverTarget === 'UNASSIGNED' ? 'drop-zone-active scale-105' : ''
          } ${
            driverFilter === 'UNASSIGNED'
              ? 'btn-primary'
              : 'surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50'
          }`}
          style={driverFilter !== 'UNASSIGNED' ? { color: 'var(--text-heading)' } : undefined}
        >
          Pool ({unassignedCount})
        </button>

        {drivers.map((drv) => {
          const count = assignments.filter((a) => a.driverId === drv.id).length;
          const isDropActive = dragOverTarget === drv.id;
          const isSelected = driverFilter === drv.id;
          const drvColor = drv.color || '#276EF1';

          return (
            <div
              key={drv.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTarget(drv.id);
              }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverTarget(null);
                if (draggedAssignmentId !== null) {
                  await onAssignDriver(draggedAssignmentId, drv.id);
                  setDraggedAssignmentId(null);
                }
              }}
              className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                isDropActive ? 'drop-zone-active scale-105' : ''
              } ${
                isSelected
                  ? 'border-white/50 shadow-sm text-white'
                  : 'surface-elevated border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
              }`}
              style={
                isSelected
                  ? { backgroundColor: drvColor, color: '#FFFFFF' }
                  : { color: 'var(--text-heading)' }
              }
            >
              <label
                title={`Change route color for ${drv.name}`}
                className="relative w-3.5 h-3.5 rounded-full border border-white/80 cursor-pointer shrink-0 overflow-hidden"
                style={{ backgroundColor: drvColor }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="color"
                  aria-label={`Change map color for ${drv.name}`}
                  value={drvColor}
                  onChange={(e) => onChangeDriverColor(drv.id, e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => onDriverFilterChange(drv.id)}
                className="cursor-pointer inline-flex items-center gap-1 tabular-nums"
              >
                <span>
                  {drv.name.split(' ')[0]} ({count})
                </span>
                {drv.isOnline && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                    title="Online & sharing live GPS"
                  />
                )}
              </button>
            </div>
          );
        })}
      </div>

      <LogisticsMap
        assignments={filteredAssignments}
        drivers={drivers}
        onAssignDriver={onAssignDriver}
        onToggleDelivered={onToggleDelivered}
        heightClass="h-[360px] sm:h-[440px] lg:h-[520px]"
      />
    </GlassPanel>
  );

  // Queue Panel
  const queuePanelNode = (
    <GlassPanel
      allowExpand
      title={
        driverFilter === 'ALL'
          ? 'Scheduled Deliveries'
          : driverFilter === 'UNASSIGNED'
          ? 'Unassigned Pool'
          : `${drivers.find((d) => d.id === driverFilter)?.name || 'Driver'}'s Route`
      }
      subtitle="Drag stops to reorder or drop onto driver pills"
      headerRight={
        <div className="flex items-center gap-1.5">
          {driverFilter === 'UNASSIGNED' && unassignedCount > 0 && (
            <Button variant="primary" size="xs" onClick={onSmartDistributePool}>
              <Wand2 className="w-3.5 h-3.5" />
              Auto-Assign
            </Button>
          )}
          {driverFilter !== 'ALL' && driverFilter !== 'UNASSIGNED' && (
            <Button
              variant="primary"
              size="xs"
              onClick={() => onOptimizeDriver(driverFilter)}
            >
              <Compass className="w-3.5 h-3.5" />
              Optimize
            </Button>
          )}
        </div>
      }
      bodyClassName="divide-y divide-[var(--border-subtle)] max-h-[580px] overflow-y-auto"
    >
      {loading ? (
        <div className="p-8 text-center text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
          Loading deliveries...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<MapPin className="w-5 h-5" />}
          title="No matching deliveries"
          description="Try adjusting your driver filter or clearing the search query."
        />
      ) : (
        filteredAssignments.map((a, idx) => {
          const k = a.kindergarten;
          const isSpecificDriverView = driverFilter !== 'ALL' && driverFilter !== 'UNASSIGNED';
          const isDraggingThis = draggedAssignmentId === a.id;
          const isDropTargetThis = dragOverStopId === a.id;
          const assignedDriver = drivers.find((d) => d.id === a.driverId);
          const badgeColor = assignedDriver?.color || a.driverColor || '#276EF1';

          return (
            <div
              key={a.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', String(a.id));
                setDraggedAssignmentId(a.id);
              }}
              onDragEnd={() => {
                setDraggedAssignmentId(null);
                setDragOverStopId(null);
                setDragOverTarget(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStopId !== a.id) setDragOverStopId(a.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                handleDropOnStop(a);
              }}
              className={`p-3.5 sm:p-4 draggable-item cursor-grab active:cursor-grabbing ${
                isDraggingThis ? 'is-dragging' : ''
              } ${isDropTargetThis ? 'drop-zone-active' : ''} ${
                a.isDelivered
                  ? 'bg-[var(--status-success-soft)]/50'
                  : 'hover:bg-[var(--surface-hover)]/45'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className="mt-1.5 opacity-60 hover:opacity-100 shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    title="Drag to reorder or assign"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {a.driverId ? (
                    <span
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 text-white tabular-nums shadow-sm"
                      style={{
                        backgroundColor: a.isDelivered ? '#10B981' : badgeColor
                      }}
                    >
                      {a.isDelivered ? '✓' : `#${a.sequenceOrder || idx + 1}`}
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-xl bg-[var(--status-warning-soft)] text-[var(--status-warning)] border border-[var(--status-warning)]/35 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      •
                    </span>
                  )}

                  <div className="min-w-0">
                    <h3
                      className={`text-sm font-bold leading-snug ${
                        a.isDelivered ? 'line-through opacity-60' : ''
                      }`}
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {k.name}
                    </h3>

                    {k.contact && (
                      <a
                        href={`tel:${k.contact}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                      >
                        <Phone className="w-3 h-3" />
                        {k.contact}
                      </a>
                    )}

                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {k.address}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <Badge tone="warning">
                        <Clock className="w-3 h-3" />
                        By {k.time}
                      </Badge>
                      <Badge tone="neutral">
                        <Package className="w-3 h-3" />
                        {k.total} units
                      </Badge>
                      <a
                        href={k.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline px-1.5"
                      >
                        Maps
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                {isSpecificDriverView && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMoveStop(driverFilter, idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move stop earlier"
                      className="p-1.5 rounded-lg surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--text-heading)' }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveStop(driverFilter, idx, 1)}
                      disabled={idx === filteredAssignments.length - 1}
                      aria-label="Move stop later"
                      className="p-1.5 rounded-lg surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--text-heading)' }} />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <select
                    aria-label={`Assign driver for ${k.name}`}
                    value={a.driverId || ''}
                    onChange={(e) => onAssignDriver(a.id, e.target.value || null)}
                    className="input-field text-xs font-semibold rounded-xl px-2.5 py-1.5 max-w-[210px] w-full cursor-pointer"
                  >
                    <option value="">Unassigned Pool</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} {d.car ? `(${d.car})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  variant={a.isDelivered ? 'success' : 'secondary'}
                  size="xs"
                  onClick={() => onToggleDelivered(a)}
                  disabled={!a.driverId}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {a.isDelivered ? 'Delivered' : 'Mark Done'}
                </Button>
              </div>
            </div>
          );
        })
      )}
    </GlassPanel>
  );

  if (dispatchMode === 'kanban') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start animate-enter">
        {/* Column 1: Unassigned Pool */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTarget('UNASSIGNED_COL');
          }}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOverTarget(null);
            if (draggedAssignmentId !== null) {
              await onAssignDriver(draggedAssignmentId, null);
              setDraggedAssignmentId(null);
            }
          }}
          className={`rounded-2xl transition ${
            dragOverTarget === 'UNASSIGNED_COL' ? 'drop-zone-active' : ''
          }`}
        >
          <GlassPanel
            title={
              <span className="inline-flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--status-warning)]" />
                <span>Unassigned Pool ({unassignedCount})</span>
              </span>
            }
            subtitle="Drag stops into any driver column"
            bodyClassName="p-3 space-y-2.5 max-h-[640px] overflow-y-auto"
          >
            {searchedAssignments
              .filter((a) => !a.driverId)
              .map((a) => {
                const k = a.kindergarten;
                return (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(a.id));
                      setDraggedAssignmentId(a.id);
                    }}
                    onDragEnd={() => {
                      setDraggedAssignmentId(null);
                      setDragOverTarget(null);
                    }}
                    className="p-3.5 rounded-xl surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/60 cursor-grab active:cursor-grabbing space-y-2 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4
                          className="text-xs font-bold leading-snug"
                          style={{ color: 'var(--text-heading)' }}
                        >
                          {k.name}
                        </h4>
                        {k.contact && (
                          <a
                            href={`tel:${k.contact}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                          >
                            <Phone className="w-3 h-3" />
                            {k.contact}
                          </a>
                        )}
                      </div>
                      <Badge tone="warning" className="shrink-0">
                        {k.time}
                      </Badge>
                    </div>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {k.address}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span
                        className="text-[11px] font-semibold tabular-nums"
                        style={{ color: 'var(--text-body-color)' }}
                      >
                        {k.total} units
                      </span>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {drivers.map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => onAssignDriver(a.id, d.id)}
                            className="px-2 py-0.5 rounded-lg text-white text-[11px] font-semibold cursor-pointer hover:opacity-90 transition"
                            style={{ backgroundColor: d.color || '#276EF1' }}
                            title={`Assign to ${d.name}`}
                          >
                            + {d.name.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
          </GlassPanel>
        </div>

        {/* Driver Columns */}
        {drivers.map((drv) => {
          const drvStops = searchedAssignments
            .filter((a) => a.driverId === drv.id)
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
          const drvMeals = drvStops.reduce((s, a) => s + a.kindergarten.total, 0);
          const drvDone = drvStops.filter((a) => a.isDelivered).length;
          const drvColor = drv.color || '#276EF1';

          return (
            <div
              key={drv.id}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverTarget(`COL_${drv.id}`);
              }}
              onDragLeave={() => setDragOverTarget(null)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverTarget(null);
                if (draggedAssignmentId !== null) {
                  await onAssignDriver(draggedAssignmentId, drv.id);
                  setDraggedAssignmentId(null);
                }
              }}
              className={`rounded-2xl transition ${
                dragOverTarget === `COL_${drv.id}` ? 'drop-zone-active' : ''
              }`}
            >
              <GlassPanel
                title={
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white shrink-0"
                      style={{ backgroundColor: drvColor }}
                    />
                    <span className="tabular-nums">
                      {drv.name} ({drvStops.length})
                    </span>
                  </span>
                }
                subtitle={`${drv.car || 'No vehicle'} · ${drvMeals} units · ${drvDone}/${drvStops.length} done`}
                headerRight={
                  <button
                    type="button"
                    onClick={() => onOptimizeDriver(drv.id)}
                    className="px-2.5 py-1 rounded-xl text-white text-xs font-semibold cursor-pointer hover:opacity-90 transition"
                    style={{ backgroundColor: drvColor }}
                  >
                    Optimize
                  </button>
                }
                bodyClassName="p-3 space-y-2.5 max-h-[640px] overflow-y-auto"
              >
                {drvStops.length === 0 ? (
                  <div
                    className="p-8 rounded-xl border-2 border-dashed border-[var(--border-subtle)] text-center text-xs font-medium"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Drop kindergartens here to assign to {drv.name.split(' ')[0]}
                  </div>
                ) : (
                  drvStops.map((a, idx) => {
                    const k = a.kindergarten;
                    return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(a.id));
                          setDraggedAssignmentId(a.id);
                        }}
                        onDragEnd={() => {
                          setDraggedAssignmentId(null);
                          setDragOverStopId(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverStopId(a.id);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDropOnStop(a);
                        }}
                        className={`p-3.5 rounded-xl surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/60 cursor-grab active:cursor-grabbing space-y-2 ${
                          dragOverStopId === a.id ? 'drop-zone-active' : ''
                        } ${a.isDelivered ? 'opacity-70 bg-[var(--status-success-soft)]/35' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <span
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 text-white tabular-nums"
                              style={{
                                backgroundColor: a.isDelivered ? '#10B981' : drvColor
                              }}
                            >
                              {a.isDelivered ? '✓' : `#${a.sequenceOrder || idx + 1}`}
                            </span>
                            <div className="min-w-0">
                              <h4
                                className={`text-xs font-bold leading-snug ${
                                  a.isDelivered ? 'line-through' : ''
                                }`}
                                style={{ color: 'var(--text-heading)' }}
                              >
                                {k.name}
                              </h4>
                              {k.contact && (
                                <a
                                  href={`tel:${k.contact}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline tabular-nums"
                                  style={{ color: drvColor }}
                                >
                                  <Phone className="w-3 h-3" />
                                  {k.contact}
                                </a>
                              )}
                            </div>
                          </div>
                          <Badge tone="warning" className="shrink-0">
                            {k.time}
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span
                            className="text-[11px] font-semibold tabular-nums"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {k.total} units
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant={a.isDelivered ? 'success' : 'secondary'}
                              size="xs"
                              onClick={() => onToggleDelivered(a)}
                            >
                              {a.isDelivered ? 'Delivered' : 'Mark Done'}
                            </Button>
                            <Button
                              variant="danger"
                              size="xs"
                              onClick={() => onAssignDriver(a.id, null)}
                              title="Return to pool"
                            >
                              Release
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </GlassPanel>
            </div>
          );
        })}
      </div>
    );
  }

  // Split View + Separate Driver Route Cards Under Map
  return (
    <div className="space-y-6 animate-enter">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {swapSplitPanels ? (
          <>
            <div className="lg:col-span-5">{queuePanelNode}</div>
            <div className="lg:col-span-7">{mapPanelNode}</div>
          </>
        ) : (
          <>
            <div className="lg:col-span-7">{mapPanelNode}</div>
            <div className="lg:col-span-5">{queuePanelNode}</div>
          </>
        )}
      </div>

      {/* Separate Driver Elements Under the Map */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div>
            <h2
              className="font-bold tracking-[-0.015em] flex items-center gap-2"
              style={{ fontSize: 'var(--text-title)', color: 'var(--text-heading)' }}
            >
              <Truck className="w-4 h-4 text-[var(--accent-primary-vivid)]" />
              <span>Drivers on Route</span>
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Dedicated progress & stop sequence for each active driver · Drop stops here to assign
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          {drivers.map((drv) => {
            const drvStops = assignments
              .filter((a) => a.driverId === drv.id)
              .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
            const drvDone = drvStops.filter((a) => a.isDelivered).length;
            const drvTotal = drvStops.length;
            const drvPct = drvTotal > 0 ? Math.round((drvDone / drvTotal) * 100) : 0;
            const drvUnitsTotal = drvStops.reduce((s, a) => s + a.kindergarten.total, 0);
            const drvUnitsRemaining = drvStops
              .filter((a) => !a.isDelivered)
              .reduce((s, a) => s + a.kindergarten.total, 0);
            const driverColor = drv.color || '#276EF1';

            return (
              <div
                key={`under_map_drv_${drv.id}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverTarget(`UNDER_MAP_${drv.id}`);
                }}
                onDragLeave={() => setDragOverTarget(null)}
                onDrop={async (e) => {
                  e.preventDefault();
                  setDragOverTarget(null);
                  if (draggedAssignmentId !== null) {
                    await onAssignDriver(draggedAssignmentId, drv.id);
                    setDraggedAssignmentId(null);
                  }
                }}
                className={`rounded-2xl transition ${
                  dragOverTarget === `UNDER_MAP_${drv.id}` ? 'drop-zone-active' : ''
                }`}
              >
                <GlassPanel
                  title={
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="w-3 h-3 rounded-full border border-white shrink-0"
                        style={{ backgroundColor: driverColor }}
                      />
                      <span>{drv.name}</span>
                      {drv.isOnline ? (
                        <Badge tone="success" dot pulse>
                          Live GPS
                        </Badge>
                      ) : (
                        <Badge tone="neutral">Offline</Badge>
                      )}
                    </div>
                  }
                  subtitle={`${drv.car || 'No Vehicle'} · ${drv.contact}`}
                  headerRight={
                    <div className="flex items-center gap-1.5">
                      <label
                        title="Change driver's map & route color"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl surface-elevated border border-[var(--border-subtle)] hover:border-[var(--border-strong)] text-xs font-semibold cursor-pointer"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <Palette className="w-3.5 h-3.5" style={{ color: driverColor }} />
                        <span className="hidden sm:inline">Color</span>
                        <input
                          type="color"
                          aria-label={`Change color for ${drv.name}`}
                          value={driverColor}
                          onChange={(e) => onChangeDriverColor(drv.id, e.target.value)}
                          className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent"
                        />
                      </label>

                      {drvTotal > 1 && (
                        <button
                          type="button"
                          onClick={() => onOptimizeDriver(drv.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-white cursor-pointer hover:opacity-90 transition shadow-sm"
                          style={{ backgroundColor: driverColor }}
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>Optimize</span>
                        </button>
                      )}
                    </div>
                  }
                  bodyClassName="p-4 space-y-3.5"
                >
                  {/* Progress Bar */}
                  <div className="p-3 rounded-xl surface-elevated border border-[var(--border-subtle)] space-y-2">
                    <div className="flex items-center justify-between text-xs gap-2 tabular-nums">
                      <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                        Progress: {drvDone} / {drvTotal} stops ({drvPct}%)
                      </span>
                      <span className="font-bold shrink-0" style={{ color: driverColor }}>
                        {drvUnitsRemaining} / {drvUnitsTotal} units left
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${drvPct}%`,
                          backgroundColor: driverColor
                        }}
                      />
                    </div>
                  </div>

                  {/* Assigned Kindergartens List */}
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-0.5">
                    {drvStops.length === 0 ? (
                      <div
                        className="p-6 rounded-xl border-2 border-dashed border-[var(--border-subtle)] text-center text-xs font-medium"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        No stops assigned to {drv.name.split(' ')[0]} yet. Drag stops here or assign from the pool.
                      </div>
                    ) : (
                      drvStops.map((stop, idx) => {
                        const k = stop.kindergarten;
                        return (
                          <div
                            key={stop.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              e.dataTransfer.setData('text/plain', String(stop.id));
                              setDraggedAssignmentId(stop.id);
                            }}
                            onDragEnd={() => {
                              setDraggedAssignmentId(null);
                              setDragOverStopId(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setDragOverStopId(stop.id);
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDropOnStop(stop);
                            }}
                            className={`p-3 rounded-xl surface-elevated border border-[var(--border-subtle)] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 cursor-grab active:cursor-grabbing ${
                              stop.isDelivered ? 'opacity-65 bg-[var(--status-success-soft)]/35' : ''
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 tabular-nums"
                                style={{
                                  backgroundColor: stop.isDelivered ? '#10B981' : driverColor
                                }}
                              >
                                {stop.isDelivered ? '✓' : `#${stop.sequenceOrder || idx + 1}`}
                              </span>

                              <div className="min-w-0">
                                <div
                                  className={`text-xs font-bold truncate ${
                                    stop.isDelivered ? 'line-through' : ''
                                  }`}
                                  style={{ color: 'var(--text-heading)' }}
                                >
                                  {k.name}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] mt-0.5 tabular-nums">
                                  {k.contact && (
                                    <a
                                      href={`tel:${k.contact}`}
                                      className="font-semibold hover:underline"
                                      style={{ color: driverColor }}
                                    >
                                      {k.contact}
                                    </a>
                                  )}
                                  <span style={{ color: 'var(--text-muted)' }}>By {k.time}</span>
                                  <span className="font-semibold" style={{ color: 'var(--text-body-color)' }}>
                                    {k.total} units
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0 ml-auto">
                              <button
                                type="button"
                                onClick={() => onMoveStop(drv.id, idx, -1)}
                                disabled={idx === 0}
                                aria-label="Move stop up"
                                className="p-1.5 rounded-lg surface-card border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" style={{ color: 'var(--text-heading)' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onMoveStop(drv.id, idx, 1)}
                                disabled={idx === drvStops.length - 1}
                                aria-label="Move stop down"
                                className="p-1.5 rounded-lg surface-card border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" style={{ color: 'var(--text-heading)' }} />
                              </button>
                              <Button
                                variant={stop.isDelivered ? 'success' : 'secondary'}
                                size="xs"
                                onClick={() => onToggleDelivered(stop)}
                              >
                                {stop.isDelivered ? 'Done' : 'Deliver'}
                              </Button>
                              <Button
                                variant="danger"
                                size="xs"
                                aria-label={`Unassign ${k.name}`}
                                onClick={() => onAssignDriver(stop.id, null)}
                              >
                                ✕
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </GlassPanel>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
