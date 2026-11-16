import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { DeliveryAssignment, Driver } from '../types';
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  Package,
  Phone,
  User,
  Truck,
  Radio,
  LocateFixed,
  Layers
} from 'lucide-react';

// Matibox Central Dispatch Hub coordinates — Maridalsveien 300, 0872 Oslo
const OSLO_KITCHEN: [number, number] = [59.953677, 10.760444];

const FALLBACK_COLORS = ['#276EF1', '#A855F7', '#EC4899', '#06B6D4', '#F97316', '#EAB308'];

function createPinIcon(assignment: DeliveryAssignment, driverColor?: string | null) {
  const resolvedDriverColor = driverColor || assignment.driverColor || '#276EF1';

  let bgStyle = '#F59E0B';
  let ringColor = '#92400E';
  let textColor = '#111827';
  let label = '•';

  if (assignment.isDelivered) {
    bgStyle = '#10B981';
    ringColor = assignment.driverId ? resolvedDriverColor : '#065F46';
    textColor = '#FFFFFF';
    label = '✓';
  } else if (assignment.driverId) {
    bgStyle = resolvedDriverColor;
    ringColor = resolvedDriverColor;
    textColor = '#FFFFFF';
    label = assignment.sequenceOrder > 0 ? String(assignment.sequenceOrder) : '•';
  }

  const html = `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:32px;
      height:32px;
      border-radius:9999px;
      background:${bgStyle};
      border:2.5px solid #FFFFFF;
      box-shadow:0 4px 12px rgba(0,0,0,0.38), 0 0 0 2px ${ringColor};
      color:${textColor};
      font-family:-apple-system, BlinkMacSystemFont, sans-serif;
      font-weight:700;
      font-size:12px;
    ">
      ${label}
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-icon',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function createLiveDriverIcon(driver: Driver) {
  const color = driver.color || '#276EF1';
  const shortName = driver.name.split(' ')[0];

  const html = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; width:74px; height:58px;">
      <div style="position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center;">
        <div class="driver-gps-pulse" style="
          position:absolute;
          inset:0;
          border-radius:9999px;
          background:${color};
        "></div>
        <div style="
          position:relative;
          z-index:2;
          display:flex;
          align-items:center;
          justify-content:center;
          width:34px;
          height:34px;
          border-radius:9999px;
          background:${color};
          border:2.5px solid #FFFFFF;
          box-shadow:0 6px 16px rgba(0,0,0,0.48);
          color:#FFFFFF;
          font-size:15px;
        ">
          🚚
        </div>
      </div>
      <div style="
        margin-top:2px;
        padding:1px 7px;
        border-radius:9999px;
        background:#090E1A;
        border:1.5px solid ${color};
        color:#FFFFFF;
        font-family:-apple-system, BlinkMacSystemFont, sans-serif;
        font-weight:700;
        font-size:10px;
        white-space:nowrap;
        box-shadow:0 3px 8px rgba(0,0,0,0.45);
      ">
        ● ${shortName}
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-icon',
    html,
    iconSize: [74, 58],
    iconAnchor: [37, 25],
    popupAnchor: [0, -24]
  });
}

const kitchenIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      width:38px;
      height:38px;
      border-radius:9999px;
      background:#0B0F17;
      border:2.5px solid #FFFFFF;
      box-shadow:0 6px 16px rgba(0,0,0,0.45), 0 0 0 2px #276EF1;
      color:#FFFFFF;
      font-family:'Montserrat', sans-serif;
      font-weight:800;
      font-size:11px;
      letter-spacing:-0.4px;
    ">
      HQ
    </div>
  `,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -19]
});

/** Helper component to fit map bounds on explicit user trigger */
const MapFitController: React.FC<{
  fitSignal: number;
  points: [number, number][];
}> = ({ fitSignal, points }) => {
  const map = useMap();

  useEffect(() => {
    if (fitSignal === 0) return;
    if (points.length === 0) {
      map.setView(OSLO_KITCHEN, 10, { animate: true });
      return;
    }
    const bounds = L.latLngBounds([OSLO_KITCHEN, ...points]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
  }, [fitSignal, points, map]);

  return null;
};

interface LogisticsMapProps {
  assignments: DeliveryAssignment[];
  drivers?: Driver[];
  onAssignDriver?: (assignmentId: number, driverId: string | null) => void;
  onClaim?: (id: number) => void;
  onToggleDelivered?: (assignment: DeliveryAssignment) => void;
  heightClass?: string;
}

export const LogisticsMap: React.FC<LogisticsMapProps> = ({
  assignments,
  drivers = [],
  onAssignDriver,
  onClaim,
  onToggleDelivered,
  heightClass = 'h-[480px] sm:h-[540px]'
}) => {
  const [fitSignal, setFitSignal] = useState(0);
  const [mapStyle, setMapStyle] = useState<'street' | 'dark'>('street');

  const getDriverColor = (driverId?: string | null, fallbackIdx = 0): string => {
    if (!driverId) return '#276EF1';
    const found = drivers.find((d) => d.id === driverId);
    if (found?.color) return found.color;
    return FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
  };

  const driverIds = Array.from(
    new Set(assignments.filter((a) => a.driverId).map((a) => a.driverId as string))
  );

  const onlineDriversWithGps = drivers.filter(
    (d) =>
      d.isOnline &&
      typeof d.lastLatitude === 'number' &&
      typeof d.lastLongitude === 'number'
  );

  const allPoints: [number, number][] = [
    ...assignments.map((a): [number, number] => [a.kindergarten.latitude, a.kindergarten.longitude]),
    ...onlineDriversWithGps.map((d): [number, number] => [
      d.lastLatitude as number,
      d.lastLongitude as number
    ])
  ];

  const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-[var(--border-subtle)] ${
        mapStyle === 'dark' ? 'map-tiles-dark' : ''
      }`}
    >
      <MapContainer
        center={OSLO_KITCHEN}
        zoom={10}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} />
        <MapFitController fitSignal={fitSignal} points={allPoints} />

        {/* Central Dispatch Hub Marker — Maridalsveien 300 */}
        <Marker position={OSLO_KITCHEN} icon={kitchenIcon}>
          <Popup>
            <div className="p-1 space-y-1">
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#276EF1] text-white">
                MATiBOX HQ
              </span>
              <p className="font-bold text-slate-900 text-sm">Matibox Central Kitchen</p>
              <p className="text-xs font-medium text-blue-600">Maridalsveien 300, 0872 Oslo</p>
            </div>
          </Popup>
        </Marker>

        {/* Driver Route Polylines */}
        {driverIds.map((dId, idx) => {
          const orderedStops = assignments
            .filter((a) => a.driverId === dId)
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

          if (orderedStops.length === 0) return null;

          const driverObj = drivers.find((d) => d.id === dId);
          const startPoint: [number, number] =
            driverObj?.isOnline &&
            typeof driverObj.lastLatitude === 'number' &&
            typeof driverObj.lastLongitude === 'number'
              ? [driverObj.lastLatitude, driverObj.lastLongitude]
              : OSLO_KITCHEN;

          const positions: [number, number][] = [
            startPoint,
            ...orderedStops.map((s): [number, number] => [
              s.kindergarten.latitude,
              s.kindergarten.longitude
            ])
          ];

          const routeColor =
            driverObj?.color ||
            orderedStops[0]?.driverColor ||
            getDriverColor(dId, idx);

          return (
            <Polyline
              key={dId}
              positions={positions}
              pathOptions={{
                color: routeColor,
                weight: 3.5,
                dashArray: '7 6',
                opacity: 0.9
              }}
            />
          );
        })}

        {/* Live Online Driver GPS Markers */}
        {onlineDriversWithGps.map((drv) => {
          const drvStops = assignments.filter((a) => a.driverId === drv.id);
          const drvDone = drvStops.filter((a) => a.isDelivered).length;
          return (
            <Marker
              key={`live_drv_${drv.id}`}
              position={[drv.lastLatitude as number, drv.lastLongitude as number]}
              icon={createLiveDriverIcon(drv)}
              zIndexOffset={900}
            >
              <Popup>
                <div className="min-w-[215px] space-y-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full shrink-0 border border-white shadow"
                        style={{ backgroundColor: drv.color || '#276EF1' }}
                      />
                      <span className="font-bold text-slate-900 text-sm">{drv.name}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 text-[10px] font-bold">
                      <Radio className="w-2.5 h-2.5 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{drv.car || 'Unassigned Vehicle'}</span>
                    </div>
                    {drv.contact && (
                      <a
                        href={`tel:${drv.contact}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {drv.contact}
                      </a>
                    )}
                    <div className="text-[11px] text-slate-500 tabular-nums">
                      {drv.lastLatitude?.toFixed(5)}, {drv.lastLongitude?.toFixed(5)}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800 tabular-nums">
                    <span>Route Progress</span>
                    <span>
                      {drvDone} / {drvStops.length} Done
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Kindergarten Delivery Markers */}
        {assignments.map((a) => {
          const k = a.kindergarten;
          const assignedDriver = drivers.find((d) => d.id === a.driverId);
          const pinColor = assignedDriver?.color || a.driverColor || '#276EF1';

          return (
            <Marker
              key={a.id}
              position={[k.latitude, k.longitude]}
              icon={createPinIcon(a, pinColor)}
            >
              <Popup>
                <div className="min-w-[235px] space-y-2.5 py-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{k.name}</h4>
                      {k.contact && (
                        <a
                          href={`tel:${k.contact}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline mt-0.5"
                        >
                          <Phone className="w-3 h-3" /> {k.contact}
                        </a>
                      )}
                    </div>
                    {a.sequenceOrder > 0 && (
                      <span
                        className="px-2 py-0.5 text-xs font-bold rounded-full text-white tabular-nums"
                        style={{ backgroundColor: pinColor }}
                      >
                        #{a.sequenceOrder}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">{k.address}</p>

                  <div className="flex flex-wrap gap-1.5 text-xs tabular-nums">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg font-semibold">
                      <Clock className="w-3 h-3 text-amber-600" />
                      By {k.time}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg font-semibold">
                      <Package className="w-3 h-3 text-blue-600" />
                      {k.total} units
                    </span>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 text-xs space-y-1">
                    {onAssignDriver && drivers.length > 0 ? (
                      <div>
                        <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1">
                          <Truck className="w-3 h-3 text-blue-600" />
                          Assigned Driver
                        </label>
                        <select
                          value={a.driverId || ''}
                          onChange={(e) => onAssignDriver(a.id, e.target.value || null)}
                          className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                        >
                          <option value="">Unassigned Pool</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.car ? `(${d.car})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : a.driverName ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: pinColor }}
                        />
                        <User className="w-3.5 h-3.5" />
                        {a.driverName}
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-700">Unassigned Pool</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={
                        k.googleMapsUrl ||
                        `https://www.google.com/maps/dir/?api=1&destination=${k.latitude},${k.longitude}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Maps
                    </a>

                    {!a.driverId && onClaim && (
                      <button
                        type="button"
                        onClick={() => onClaim(a.id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer transition"
                      >
                        Claim Stop
                      </button>
                    )}

                    {a.driverId && onToggleDelivered && (
                      <button
                        type="button"
                        onClick={() => onToggleDelivered(a)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                          a.isDelivered
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {a.isDelivered ? 'Delivered' : 'Mark Delivered'}
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Top-Right Floating Liquid Glass Map Controls (Fit Bounds & Tile Style) */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setMapStyle((s) => (s === 'street' ? 'dark' : 'street'))}
          title="Switch map tile style"
          className="glass-floating-strong px-2.5 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer"
          style={{ color: 'var(--text-heading)' }}
        >
          <Layers className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)]" />
          <span>{mapStyle === 'dark' ? 'Street' : 'Dark'}</span>
        </button>

        <button
          type="button"
          onClick={() => setFitSignal((n) => n + 1)}
          title="Fit all stops in view"
          className="glass-floating-strong px-2.5 py-1.5 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition cursor-pointer"
          style={{ color: 'var(--text-heading)' }}
        >
          <LocateFixed className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)]" />
          <span className="hidden sm:inline">Fit All</span>
        </button>
      </div>

      {/* Bottom Floating Liquid Glass Legend */}
      <div className="absolute bottom-3 left-3 z-[400] glass-floating-strong px-3 py-1.5 rounded-xl flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold select-none max-w-[calc(100%-24px)]">
        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white/60 inline-block" />
          Pool
        </span>
        {drivers.map((drv) => (
          <span
            key={drv.id}
            className="inline-flex items-center gap-1.5"
            style={{ color: 'var(--text-heading)' }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full border border-white inline-block"
              style={{ backgroundColor: drv.color || '#276EF1' }}
            />
            <span>{drv.name.split(' ')[0]}</span>
            {drv.isOnline && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                title="Live GPS Active"
              />
            )}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white inline-block" />
          Delivered
        </span>
      </div>
    </div>
  );
};
