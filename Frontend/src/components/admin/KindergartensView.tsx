import React from 'react';
import {
  Building2,
  Clock,
  Edit3,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Trash2
} from 'lucide-react';
import { Kindergarten } from '../../types';
import { GlassPanel } from '../GlassPanel';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EmptyState } from '../ui/EmptyState';

interface KindergartensViewProps {
  kindergartens: Kindergarten[];
  onEdit: (kg: Kindergarten) => void;
  onDelete: (kg: Kindergarten) => void;
  onCreate: () => void;
}

export const KindergartensView: React.FC<KindergartensViewProps> = ({
  kindergartens,
  onEdit,
  onDelete,
  onCreate
}) => {
  return (
    <GlassPanel
      title={`Registered Kindergartens (${kindergartens.length})`}
      subtitle="Contact numbers appear directly under each kindergarten name"
      bodyClassName="p-0"
    >
      {kindergartens.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-5 h-5" />}
          title="No kindergartens match your search"
          description="Try clearing the search query or register a new kindergarten delivery stop."
          action={
            <Button variant="primary" size="sm" onClick={onCreate}>
              Add Kindergarten
            </Button>
          }
        />
      ) : (
        <>
          {/* Desktop Table View (md+) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-[var(--border-subtle)] text-[11px] font-semibold uppercase tracking-wider surface-elevated"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3 px-4">Kindergarten & Phone</th>
                  <th className="py-3 px-4">Address</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm">
                {kindergartens.map((kg) => (
                  <tr key={kg.id} className="hover:bg-[var(--surface-hover)]/45 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                        {kg.name}
                      </div>
                      {kg.contact ? (
                        <a
                          href={`tel:${kg.contact}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                        >
                          <Phone className="w-3 h-3" />
                          {kg.contact}
                        </a>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          No phone listed
                        </span>
                      )}
                    </td>
                    <td
                      className="py-3.5 px-4 text-xs font-medium max-w-[260px]"
                      style={{ color: 'var(--text-body-color)' }}
                    >
                      {kg.address}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge tone="warning">
                        <Clock className="w-3 h-3" />
                        {kg.time}
                      </Badge>
                    </td>
                    <td
                      className="py-3.5 px-4 font-bold tabular-nums"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {kg.total}
                    </td>
                    <td className="py-3.5 px-4 text-xs tabular-nums">
                      <a
                        href={kg.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary-vivid)] hover:underline"
                      >
                        {kg.latitude.toFixed(4)}, {kg.longitude.toFixed(4)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      <Button variant="secondary" size="xs" onClick={() => onEdit(kg)}>
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button variant="danger" size="xs" onClick={() => onDelete(kg)}>
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Presentation (< md) — Zero Horizontal Scroll */}
          <div className="md:hidden divide-y divide-[var(--border-subtle)]">
            {kindergartens.map((kg) => (
              <div key={kg.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3
                      className="text-sm font-bold leading-snug"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {kg.name}
                    </h3>
                    {kg.contact ? (
                      <a
                        href={`tel:${kg.contact}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline mt-0.5 tabular-nums"
                      >
                        <Phone className="w-3 h-3" />
                        {kg.contact}
                      </a>
                    ) : (
                      <span className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        No phone listed
                      </span>
                    )}
                  </div>
                  <Badge tone="warning" className="shrink-0">
                    <Clock className="w-3 h-3" />
                    {kg.time}
                  </Badge>
                </div>

                <p
                  className="text-xs flex items-start gap-1.5"
                  style={{ color: 'var(--text-body-color)' }}
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--text-muted)]" />
                  <span>{kg.address}</span>
                </p>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">
                      <Package className="w-3 h-3" />
                      {kg.total} units
                    </Badge>
                    <a
                      href={kg.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline"
                    >
                      Maps
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button variant="secondary" size="xs" onClick={() => onEdit(kg)}>
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="xs"
                      aria-label={`Delete ${kg.name}`}
                      onClick={() => onDelete(kg)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </GlassPanel>
  );
};
