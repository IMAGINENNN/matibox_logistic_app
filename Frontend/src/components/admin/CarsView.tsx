import React from 'react';
import { Car as CarIcon, Edit3, Trash2 } from 'lucide-react';
import { Car, Driver } from '../../types';
import { GlassPanel } from '../GlassPanel';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';

interface CarsViewProps {
  cars: Car[];
  drivers: Driver[];
  onTakeCarForDriver: (carId: number, driverId: string) => void;
  onDropCarForDriver: (carId: number, driverId: string) => void;
  onEdit: (car: Car) => void;
  onDelete: (car: Car) => void;
  onCreate: () => void;
}

export const CarsView: React.FC<CarsViewProps> = ({
  cars,
  drivers,
  onTakeCarForDriver,
  onDropCarForDriver,
  onEdit,
  onDelete,
  onCreate
}) => {
  return (
    <GlassPanel
      title={`Fleet Cars (${cars.length})`}
      subtitle="Only Admin & Dispatchers can add, edit, or delete cars · Several drivers can share the same car"
      bodyClassName="p-0"
    >
      {cars.length === 0 ? (
        <EmptyState
          icon={<CarIcon className="w-5 h-5" />}
          title="No fleet vehicles found"
          description="Add a delivery car so drivers can take or drop vehicles for their shift."
          action={
            <Button variant="primary" size="sm" onClick={onCreate}>
              Add Car
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wider surface-elevated"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3 px-4">Vehicle Name</th>
                  <th className="py-3 px-4">Number Plate</th>
                  <th className="py-3 px-4">Active Drivers</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {cars.map((car) => {
                  const assignedDrivers = car.drivers || [];
                  const availableDrivers = drivers.filter(
                    (d) => !assignedDrivers.some((ad) => ad.id === d.id)
                  );

                  return (
                    <tr key={car.id} className="hover:bg-[var(--surface-hover)]/45 transition-colors">
                      <td className="py-3.5 px-4 font-semibold" style={{ color: 'var(--text-heading)' }}>
                        <span className="inline-flex items-center gap-2">
                          <CarIcon className="w-4 h-4 text-[var(--accent-primary-vivid)]" />
                          {car.name}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[var(--status-warning-soft)] text-[var(--status-warning)] border border-[var(--status-warning)]/30 font-mono text-xs font-bold tracking-wider">
                          {car.numberPlate}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {assignedDrivers.length === 0 ? (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              Available
                            </span>
                          ) : (
                            assignedDrivers.map((ad) => (
                              <span
                                key={ad.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
                                style={{ backgroundColor: ad.color || '#276EF1' }}
                              >
                                <span>{ad.name}</span>
                                <button
                                  type="button"
                                  onClick={() => onDropCarForDriver(car.id, ad.id)}
                                  aria-label={`Remove ${ad.name} from ${car.name}`}
                                  className="hover:opacity-75 cursor-pointer font-bold leading-none"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          )}

                          {availableDrivers.length > 0 && (
                            <select
                              value=""
                              aria-label={`Assign driver to ${car.name}`}
                              onChange={(e) => {
                                if (e.target.value) {
                                  onTakeCarForDriver(car.id, e.target.value);
                                }
                              }}
                              className="input-field text-xs font-semibold rounded-xl px-2.5 py-1 cursor-pointer"
                            >
                              <option value="">+ Add driver...</option>
                              {availableDrivers.map((drv) => (
                                <option key={drv.id} value={drv.id}>
                                  {drv.name}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <Button variant="secondary" size="xs" onClick={() => onEdit(car)}>
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button variant="danger" size="xs" onClick={() => onDelete(car)}>
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

          {/* Mobile Cards (< md) */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {cars.map((car) => {
              const assignedDrivers = car.drivers || [];
              const availableDrivers = drivers.filter(
                (d) => !assignedDrivers.some((ad) => ad.id === d.id)
              );

              return (
                <div key={car.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CarIcon className="w-4 h-4 text-[var(--accent-primary-vivid)] shrink-0" />
                        <h3 className="text-sm font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                          {car.name}
                        </h3>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 mt-1.5 rounded-lg bg-[var(--status-warning-soft)] text-[var(--status-warning)] border border-[var(--status-warning)]/30 font-mono text-xs font-bold tracking-wider">
                        {car.numberPlate}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="secondary" size="xs" onClick={() => onEdit(car)}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="danger"
                        size="xs"
                        aria-label={`Delete ${car.name}`}
                        onClick={() => onDelete(car)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {assignedDrivers.map((ad) => (
                      <span
                        key={ad.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: ad.color || '#276EF1' }}
                      >
                        <span>{ad.name}</span>
                        <button
                          type="button"
                          onClick={() => onDropCarForDriver(car.id, ad.id)}
                          aria-label={`Remove ${ad.name}`}
                          className="hover:opacity-75 cursor-pointer font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}

                    {availableDrivers.length > 0 && (
                      <select
                        value=""
                        aria-label={`Assign driver to ${car.name}`}
                        onChange={(e) => {
                          if (e.target.value) {
                            onTakeCarForDriver(car.id, e.target.value);
                          }
                        }}
                        className="input-field text-xs font-semibold rounded-xl px-2.5 py-1.5 cursor-pointer"
                      >
                        <option value="">+ Add driver...</option>
                        {availableDrivers.map((drv) => (
                          <option key={drv.id} value={drv.id}>
                            {drv.name}
                          </option>
                        ))}
                      </select>
                    )}
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
