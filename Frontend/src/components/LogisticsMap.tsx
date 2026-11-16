import React, { useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { DeliveryAssignment, Driver } from '../types';
import {
  ExternalLink,
  CheckCircle2,
  Clock,
  Package,
  Phone,
  User,
  GripHorizontal,
  Truck,
  Radio
} from 'lucide-react';

// Matibox Central Dispatch Hub coordinates — Maridalsveien 300, 0872 Oslo
const OSLO_KITCHEN: [number, number] = [59.953677, 10.760444];

const FALLBACK_COLORS = ['#276EF1', '#A855F7', '#EC4899', '#06B6D4', '#F97316', '#EAB308'];

function createPinIcon(assignment: DeliveryAssignment, driverColor?: string | null) {
  const resolvedDriverColor = driverColor || assignment.driverColor || '#276EF1';

  // Default: Unassigned Pool (Warm Gold)
  let bgStyle = 'linear-gradient(145deg, #FFD03B 0%, #FCB900 55%, #D98A00 100%)';
  let ringColor = '#865B31';
  let textColor = '#3E2000';
  let label = '•';

  if (assignment.isDelivered) {
    // Delivered: Emerald green fill with outer ring in the assigned driver's color
    bgStyle = 'linear-gradient(145deg, #22C55E 0%, #16A34A 65%, #15803D 100%)';
    ringColor = assignment.driverId ? resolvedDriverColor : '#14532D';
    textColor = '#FFFFFF';
    label = '✓';
  } else if (assignment.driverId) {
    // Assigned / In Transit: Driver's custom color!
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
      width:36px;
      height:36px;
      border-radius:9999px;
      background:${bgStyle};
      border:2.5px solid rgba(255,255,255,0.95);
      box-shadow:0 6px 14px rgba(0,0,0,0.42), 0 0 0 2px ${ringColor}, inset 0 1.5px 1px rgba(255,255,255,0.55);
      color:${textColor};
      font-family:'Montserrat', sans-serif;
      font-weight:800;
      font-size:13px;
    ">
      ${label}
    </div>
  `;

  return L.divIcon({
    className: 'custom-pin-icon',
    html,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
}

function createLiveDriverIcon(driver: Driver) {
  const color = driver.color || '#276EF1';
  const shortName = driver.name.split(' ')[0];

  const html = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; width:72px; height:58px;">
      <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
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
          width:38px;
          height:38px;
          border-radius:9999px;
          background:${color};
          border:2.5px solid #FFFFFF;
          box-shadow:0 8px 20px rgba(0,0,0,0.55);
          color:#FFFFFF;
          font-size:16px;
        ">
          🚚
        </div>
      </div>
      <div style="
        margin-top:2px;
        padding:1px 6px;
        border-radius:9999px;
        background:#090E1A;
        border:1.5px solid ${color};
        color:#FFFFFF;
        font-family:'Montserrat', sans-serif;
        font-weight:800;
        font-size:9px;
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
    iconSize: [72, 58],
    iconAnchor: [36, 26],
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
      width:42px;
      height:42px;
      border-radius:9999px;
      background:linear-gradient(145deg, #3B82F6 0%, #276EF1 60%, #090E1A 100%);
      border:3px solid #FFFFFF;
      box-shadow:0 8px 18px rgba(0,0,0,0.55), 0 0 0 2px #276EF1;
      color:#FFFFFF;
      font-family:'Montserrat', sans-serif;
      font-weight:900;
      font-size:12px;
      letter-spacing:-0.5px;
    ">
      MB
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -20]
});

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
  heightClass = 'h-[540px]'
}) => {
  // Draggable Legend State inside the Map
  const [legendPos, setLegendPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggingLegend, setDraggingLegend] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  );

  const handleLegendPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingLegend(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: legendPos.x,
      origY: legendPos.y
    };
  };

  const handleLegendPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingLegend || !dragRef.current) return;
    e.stopPropagation();
    setLegendPos({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY)
    });
  };

  const handleLegendPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingLegend) return;
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setDraggingLegend(false);
    dragRef.current = null;
  };

  const getDriverColor = (driverId?: string | null, fallbackIdx = 0): string => {
    if (!driverId) return '#276EF1';
    const found = drivers.find((d) => d.id === driverId);
    if (found?.color) return found.color;
    return FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
  };

  // Group assigned stops by driverId to draw route polylines
  const driverIds = Array.from(
    new Set(assignments.filter((a) => a.driverId).map((a) => a.driverId as string))
  );

  // Online drivers who are sharing their live GPS location
  const onlineDriversWithGps = drivers.filter(
    (d) =>
      d.isOnline &&
      typeof d.lastLatitude === 'number' &&
      typeof d.lastLongitude === 'number'
  );

  return (
    <div
      className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-white/25 shadow-inner`}
    >
      <MapContainer
        center={OSLO_KITCHEN}
        zoom={10}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Central Dispatch Hub Marker — Maridalsveien 300 */}
        <Marker position={OSLO_KITCHEN} icon={kitchenIcon}>
          <Popup>
            <div className="p-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#276EF1] text-white">
                  MATiBOX HQ
                </span>
              </div>
              <p className="font-extrabold text-[#0F172A] text-sm">Matibox Central Dispatch Hub</p>
              <p className="text-xs font-semibold text-[#276EF1]">Maridalsveien 300, 0872 Oslo</p>
              <p className="text-[11px] text-slate-600">Oslo & Akershus Route Departure Point</p>
            </div>
          </Popup>
        </Marker>

        {/* Driver Route Polylines (Each in that Driver's Custom Color!) */}
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
                weight: 4,
                dashArray: '8 6',
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
                <div className="min-w-[220px] space-y-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-white shadow"
                        style={{ backgroundColor: drv.color || '#276EF1' }}
                      />
                      <span className="font-extrabold text-slate-900 text-sm">{drv.name}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 text-[10px] font-extrabold">
                      <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
                      LIVE GPS
                    </span>
                  </div>

                  <div className="text-xs text-slate-700 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Truck className="w-3.5 h-3.5 text-[#276EF1]" />
                      <span>{drv.car || 'Unassigned Vehicle'}</span>
                    </div>
                    {drv.contact && (
                      <a
                        href={`tel:${drv.contact}`}
                        className="inline-flex items-center gap-1 font-bold text-[#276EF1] hover:underline"
                      >
                        <Phone className="w-3 h-3" />
                        {drv.contact}
                      </a>
                    )}
                    <div className="text-[11px] text-slate-500">
                      Coords: {drv.lastLatitude?.toFixed(5)}, {drv.lastLongitude?.toFixed(5)}
                    </div>
                    {drv.locationUpdatedAt && (
                      <div className="text-[10px] text-slate-400">
                        Updated: {new Date(drv.locationUpdatedAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-xs font-extrabold text-slate-800">
                    <span>Route Progress:</span>
                    <span>
                      {drvDone} / {drvStops.length} Stops Done
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
                <div className="min-w-[245px] space-y-2.5 py-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-[#0F172A] text-sm leading-snug">
                        {k.name}
                      </h4>
                      {k.contact && (
                        <a
                          href={`tel:${k.contact}`}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#276EF1] hover:underline mt-0.5"
                        >
                          <Phone className="w-3 h-3" /> {k.contact}
                        </a>
                      )}
                    </div>
                    {a.sequenceOrder > 0 && (
                      <span
                        className="px-2.5 py-0.5 text-xs font-extrabold rounded-full text-white"
                        style={{ backgroundColor: pinColor }}
                      >
                        #{a.sequenceOrder}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 font-medium">{k.address}</p>

                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-900 border border-amber-500/40 px-2 py-0.5 rounded-lg font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      By {k.time}
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-200/80 text-slate-800 px-2 py-0.5 rounded-lg font-bold">
                      <Package className="w-3.5 h-3.5 text-[#276EF1]" />
                      {k.total} units
                    </span>
                  </div>

                  {/* Driver Assignment / Change Selector inside Map Pin Popup */}
                  <div className="pt-1.5 border-t border-slate-200 text-xs space-y-1">
                    {onAssignDriver && drivers.length > 0 ? (
                      <div>
                        <label className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                          <Truck className="w-3 h-3 text-[#276EF1]" />
                          Assign / Change Driver:
                        </label>
                        <select
                          value={a.driverId || ''}
                          onChange={(e) => onAssignDriver(a.id, e.target.value || null)}
                          className="w-full text-xs font-bold bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#276EF1] cursor-pointer"
                        >
                          <option value="">-- Unassigned Pool --</option>
                          {drivers.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.car ? `(${d.car})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : a.driverName ? (
                      <span className="inline-flex items-center gap-1.5 font-bold text-slate-900">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: pinColor }}
                        />
                        <User className="w-3.5 h-3.5" />
                        Driver: {a.driverName}
                      </span>
                    ) : (
                      <span className="font-bold text-amber-700">
                        Unassigned (In General Pool)
                      </span>
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
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#FCB900]" />
                      Maps
                    </a>

                    {!a.driverId && onClaim && (
                      <button
                        onClick={() => onClaim(a.id)}
                        className="px-3 py-1.5 rounded-xl liquid-btn-orange text-white text-xs font-bold cursor-pointer"
                      >
                        Claim Stop
                      </button>
                    )}

                    {a.driverId && onToggleDelivered && (
                      <button
                        onClick={() => onToggleDelivered(a)}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition ${
                          a.isDelivered
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'liquid-btn-orange text-white'
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

      {/* Draggable Liquid Glass Map Legend Overlay (Shows Pool, Delivered & Each Driver's Color!) */}
      <div
        onPointerDown={handleLegendPointerDown}
        onPointerMove={handleLegendPointerMove}
        onPointerUp={handleLegendPointerUp}
        style={{
          transform: `translate3d(${legendPos.x}px, ${legendPos.y}px, 0)`
        }}
        title="Drag this Liquid Glass legend anywhere on the map"
        className="absolute bottom-3 left-3 z-[400] liquid-glass-strong px-3.5 py-2 rounded-2xl flex flex-wrap items-center gap-3 text-xs font-bold cursor-grab active:cursor-grabbing select-none max-w-[92%]"
      >
        <span className="inline-flex items-center gap-1 text-[#276EF1] opacity-85">
          <GripHorizontal className="w-3.5 h-3.5" />
        </span>
        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
          <span className="w-3 h-3 rounded-full bg-[#FCB900] border border-white/60 inline-block shadow-sm" />
          Pool
        </span>
        {drivers.map((drv) => (
          <span
            key={drv.id}
            className="inline-flex items-center gap-1.5"
            style={{ color: 'var(--text-heading)' }}
          >
            <span
              className="w-3 h-3 rounded-full border border-white inline-block shadow-sm"
              style={{ backgroundColor: drv.color || '#276EF1' }}
            />
            <span>{drv.name.split(' ')[0]}</span>
            {drv.isOnline && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"
                title="Sharing Live GPS Location"
              />
            )}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-heading)' }}>
          <span className="w-3 h-3 rounded-full bg-emerald-600 border border-white inline-block shadow-sm" />
          Delivered
        </span>
      </div>
    </div>
  );
};
