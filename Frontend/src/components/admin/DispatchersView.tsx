import React from 'react';
import { Edit3, Phone, ShieldCheck, Trash2 } from 'lucide-react';
import { Dispatcher } from '../../types';
import { GlassPanel } from '../GlassPanel';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

interface DispatchersViewProps {
  dispatchers: Dispatcher[];
  isMasterAdmin: boolean;
  onEdit: (dispatcher: Dispatcher) => void;
  onDelete: (dispatcher: Dispatcher) => void;
  onCreate: () => void;
}

export const DispatchersView: React.FC<DispatchersViewProps> = ({
  dispatchers,
  isMasterAdmin,
  onEdit,
  onDelete,
  onCreate
}) => {
  return (
    <GlassPanel
      title={`Dispatchers (${dispatchers.length})`}
      subtitle={
        isMasterAdmin
          ? 'Dispatchers share full operational control except creating or removing dispatchers'
          : 'Signed in as Dispatcher · Only the Master Administrator can manage dispatchers'
      }
      bodyClassName="p-0"
    >
      {dispatchers.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="w-5 h-5" />}
          title="No dispatchers created yet"
          description={
            isMasterAdmin
              ? 'Create dispatcher accounts to delegate daily route and fleet operations.'
              : 'No additional dispatchers are registered.'
          }
          action={
            isMasterAdmin ? (
              <Button variant="primary" size="sm" onClick={onCreate}>
                Add Dispatcher
              </Button>
            ) : undefined
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
                  <th className="py-3 px-4">Dispatcher Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Phone Contact</th>
                  <th className="py-3 px-4">Permissions</th>
                  {isMasterAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {dispatchers.map((disp) => (
                  <tr key={disp.id} className="hover:bg-[var(--surface-hover)]/45 transition-colors">
                    <td className="py-3.5 px-4 font-semibold" style={{ color: 'var(--text-heading)' }}>
                      {disp.name}
                    </td>
                    <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--text-body-color)' }}>
                      {disp.email}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold tabular-nums">
                      {disp.contact ? (
                        <a
                          href={`tel:${disp.contact}`}
                          className="inline-flex items-center gap-1 text-[var(--accent-primary-vivid)] hover:underline"
                        >
                          <Phone className="w-3 h-3" />
                          {disp.contact}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge tone="accent">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Dispatcher Access
                      </Badge>
                    </td>
                    {isMasterAdmin && (
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                        <Button variant="secondary" size="xs" onClick={() => onEdit(disp)}>
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </Button>
                        <Button variant="danger" size="xs" onClick={() => onDelete(disp)}>
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards (< md) */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {dispatchers.map((disp) => (
              <div key={disp.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                      {disp.name}
                    </h3>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {disp.email}
                    </p>
                    {disp.contact && (
                      <a
                        href={`tel:${disp.contact}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                      >
                        <Phone className="w-3 h-3" />
                        {disp.contact}
                      </a>
                    )}
                  </div>
                  <Badge tone="accent" className="shrink-0">
                    <ShieldCheck className="w-3 h-3" />
                    Dispatcher
                  </Badge>
                </div>

                {isMasterAdmin && (
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button variant="secondary" size="xs" onClick={() => onEdit(disp)}>
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button variant="danger" size="xs" onClick={() => onDelete(disp)}>
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </GlassPanel>
  );
};
