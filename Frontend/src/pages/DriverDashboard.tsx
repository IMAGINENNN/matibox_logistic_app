import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useGlassTheme } from '../context/ThemeContext';
import { useLogisticsHub } from '../hooks/useLogisticsHub';
import { Car, DeliveryAssignment, Driver } from '../types';
import { LogisticsMap } from '../components/LogisticsMap';
import { MatiboxLogo } from '../components/MatiboxLogo';
import { GlassPanel } from '../components/GlassPanel';
import {
  ArrowDown,
  ArrowUp,
  CarFront,
  CheckCircle2,
  Clock,
  Compass,
  ExternalLink,
  GripVertical,
  ListChecks,
  LogOut,
  Map as MapIcon,
  Moon,
  Navigation,
  Package,
  Phone,
  PlusCircle,
  Radio,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Truck,
  UserCheck,
  UserMinus,
  X
} from 'lucide-react';

type DriverViewTab = 'route' | 'pool' | 'cars';

// Oslo Central Hub fallback coordinates (Maridalsveien 300, Oslo)
const HUB_LAT = 59.953677;
const HUB_LNG = 10.760444;

export const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useGlassTheme();
  const accentHex = theme === 'dark' ? '#276EF1' : '#E97905';

  const [activeTab, setActiveTab] = useState<DriverViewTab>('route');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gpsSharingActive, setGpsSharingActive] = useState<boolean>(false);

  // Drag & drop state for driver route reordering and claiming
  const [draggedStopId, setDraggedStopId] = useState<number | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);
  const [dragOverRouteTab, setDragOverRouteTab] = useState<boolean>(false);

  const today = new Date().toISOString().split('T')[0];

  const fetchDeliveries = useCallback(async () => {
    try {
      const [delivData, carData, driverData] = await Promise.all([
        api.deliveries.getByDate(today),
        api.cars.getAll().catch(() => [] as Car[]),
        api.drivers.getAll().catch(() => [] as Driver[])
      ]);
      setAssignments(delivData);
      setCars(carData);
      setDrivers(driverData);
    } catch (err: any) {
      setStatusMsg(err.message || 'Could not load deliveries');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const { connected } = useLogisticsHub(fetchDeliveries);

  const myDriverRecord = useMemo(
    () => drivers.find((d) => d.id === user?.id) || null,
    [drivers, user?.id]
  );

  const myColor = myDriverRecord?.color || user?.color || accentHex;

  // All cars currently taken by this driver
  const myTakenCars = useMemo(
    () => cars.filter((c) => (c.drivers || []).some((d) => d.id === user?.id)),
    [cars, user?.id]
  );

  // Driver's claimed/assigned stops ordered by SequenceOrder
  const myStops = useMemo(
    () =>
      assignments
        .filter((a) => a.driverId === user?.id)
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [assignments, user?.id]
  );

  // Unassigned stops in general pool ordered by deadline Time
  const poolStops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return assignments
      .filter((a) => !a.driverId)
      .filter((a) => {
        if (!q) return true;
        const k = a.kindergarten;
        return (
          k.name.toLowerCase().includes(q) ||
          k.address.toLowerCase().includes(q) ||
          k.contact.toLowerCase().includes(q) ||
          k.time.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.kindergarten.time.localeCompare(b.kindergarten.time));
  }, [assignments, searchQuery]);

  // Next upcoming undelivered stop for the Spotlight Hero Card
  const nextActiveStop = useMemo(
    () => myStops.find((s) => !s.isDelivered) || null,
    [myStops]
  );

  // Live GPS Location Sharing while Driver is Online
  useEffect(() => {
    if (!user?.id) return;

    let watchId: number | null = null;
    let isMounted = true;

    // Deterministic slight offset around hub or next stop if browser GPS is unavailable on desktop
    const hashOffset =
      ((user.id.charCodeAt(0) + user.id.charCodeAt(user.id.length - 1)) % 12) * 0.0022;

    const sendCoords = async (lat: number, lng: number) => {
      if (!isMounted) return;
      try {
        await api.drivers.updateLocation(lat, lng);
        if (isMounted) setGpsSharingActive(true);
      } catch {
        // ignore transient network errors
      }
    };

    const reportFallbackOrCurrentGps = () => {
      if (!navigator.geolocation) {
        sendCoords(HUB_LAT - 0.015 + hashOffset, HUB_LNG - 0.015 + hashOffset);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sendCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // If browser blocks geolocation on desktop, share fallback coordinates so Dispatch sees the online driver on map
          sendCoords(HUB_LAT - 0.015 + hashOffset, HUB_LNG - 0.015 + hashOffset);
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 10000 }
      );
    };

    reportFallbackOrCurrentGps();

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          sendCoords(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // handled by interval fallback
        },
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }

    const intervalId = window.setInterval(reportFallbackOrCurrentGps, 15000);

    return () => {
      isMounted = false;
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      window.clearInterval(intervalId);
    };
  }, [user?.id]);

  const handleExit = async () => {
    try {
      await api.drivers.goOffline();
    } catch {
      // ignore
    }
    logout();
  };

  const deliveredCount = myStops.filter((s) => s.isDelivered).length;
  const totalStops = myStops.length;
  const remainingCrates = myStops
    .filter((s) => !s.isDelivered)
    .reduce((sum, s) => sum + s.kindergarten.total, 0);
  const progressPct = totalStops > 0 ? Math.round((deliveredCount / totalStops) * 100) : 0;

  // Helper to obtain browser GPS with fast timeout fallback
  const getDriverCoordinates = (): Promise<{ lat?: number; lng?: number }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 3500 }
      );
    });
  };

  const handleClaimStop = async (assignmentId: number) => {
    setStatusMsg(null);
    try {
      const coords = await getDriverCoordinates();
      await api.deliveries.claim(assignmentId, coords.lat, coords.lng);
      await fetchDeliveries();
      setStatusMsg('Stop added to your route & auto-sequenced!');
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  const handleUnclaimStop = async (assignmentId: number) => {
    setStatusMsg(null);
    try {
      await api.deliveries.unclaim(assignmentId);
      await fetchDeliveries();
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  const handleToggleDelivered = async (stop: DeliveryAssignment) => {
    setStatusMsg(null);
    try {
      await api.deliveries.toggleDelivered(stop.id, !stop.isDelivered);
      await fetchDeliveries();
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    setStatusMsg(null);
    try {
      const coords = await getDriverCoordinates();
      await api.deliveries.optimize({
        date: today,
        startLatitude: coords.lat,
        startLongitude: coords.lng
      });
      await fetchDeliveries();
      setStatusMsg(
        coords.lat
          ? 'Route optimized by deadline priority + your live GPS distance!'
          : 'Route optimized by deadline priority + distance from Matibox Hub!'
      );
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err: any) {
      setStatusMsg(err.message);
    } finally {
      setOptimizing(false);
    }
  };

  const handleMoveStop = async (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= myStops.length) return;

    const updated = [...myStops];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIdx, 0, moved);

    try {
      await api.deliveries.reorder({
        date: today,
        orderedAssignmentIds: updated.map((s) => s.id)
      });
      await fetchDeliveries();
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  const handleDropReorderStop = async (targetStopId: number) => {
    if (draggedStopId === null || draggedStopId === targetStopId) {
      setDragOverStopId(null);
      return;
    }

    const fromIdx = myStops.findIndex((s) => s.id === draggedStopId);
    const toIdx = myStops.findIndex((s) => s.id === targetStopId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedStopId(null);
      setDragOverStopId(null);
      return;
    }

    const updated = [...myStops];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);

    setDraggedStopId(null);
    setDragOverStopId(null);

    try {
      await api.deliveries.reorder({
        date: today,
        orderedAssignmentIds: updated.map((s) => s.id)
      });
      await fetchDeliveries();
      setStatusMsg('Route order updated!');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  // --- CAR TAKE / DROP HANDLERS FOR DRIVERS ---
  const handleTakeCar = async (car: Car) => {
    setStatusMsg(null);
    try {
      await api.cars.take(car.id);
      await fetchDeliveries();
      setStatusMsg(`You took "${car.name}" (${car.numberPlate})!`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  const handleDropCar = async (car: Car) => {
    setStatusMsg(null);
    try {
      await api.cars.drop(car.id);
      await fetchDeliveries();
      setStatusMsg(`You dropped "${car.name}" (${car.numberPlate}).`);
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg(err.message);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Floating Apple Liquid Glass Top Driver Header */}
      <header className="sticky top-0 z-40 px-2.5 sm:px-3 pt-2.5 sm:pt-3">
        <div className="w-full max-w-2xl mx-auto liquid-glass-strong rounded-3xl px-3 sm:px-4 py-3 space-y-2.5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 min-w-0">
            <div className="shrink-0">
              <MatiboxLogo size="sm" darkText={theme === 'dark'} />
            </div>

            <div className="flex items-center gap-1.5 shrink-0 sm:order-3">
              <button
                onClick={toggleTheme}
                title="Toggle Daylight / Uber Night Drive Glass"
                className="p-2 rounded-full liquid-glass-subtle hover:border-[#276EF1] transition cursor-pointer"
                style={{ color: 'var(--text-heading)' }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-[#FCB900]" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#276EF1]" />
                )}
              </button>

              <button
                onClick={handleExit}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full liquid-btn-red text-xs font-bold cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>

            <div className="w-full sm:w-auto sm:flex-1 sm:order-2 min-w-0 sm:pl-3 sm:border-l sm:border-white/15">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  className="w-3 h-3 rounded-full border border-white shrink-0"
                  style={{ backgroundColor: myColor }}
                  title="Your Route Color"
                />
                <span
                  className="font-extrabold text-xs sm:text-sm truncate"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {user?.name}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    gpsSharingActive
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/35'
                      : 'bg-[#FCB900]/20 text-[#FCB900]'
                  }`}
                >
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  {gpsSharingActive ? 'GPS Live' : 'Connecting GPS'}
                </span>
              </div>
              <p
                className="text-[11px] font-semibold flex items-center gap-1 mt-0.5 min-w-0"
                style={{ color: 'var(--text-muted)' }}
              >
                <Truck className="w-3 h-3 shrink-0" style={{ color: myColor }} />
                <span className="truncate">
                  {myTakenCars.length > 0
                    ? myTakenCars.map((c) => `${c.name} (${c.numberPlate})`).join(', ')
                    : 'No Car Taken — Tap Cars Tab to Take a Vehicle'}
                </span>
              </p>
            </div>
          </div>

          {/* Segmented View Switcher */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 liquid-glass-subtle p-1 rounded-2xl">
            <button
              onClick={() => setActiveTab('route')}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverRouteTab(true);
              }}
              onDragLeave={() => setDragOverRouteTab(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOverRouteTab(false);
                if (draggedStopId !== null) {
                  await handleClaimStop(draggedStopId);
                  setDraggedStopId(null);
                  setActiveTab('route');
                }
              }}
              className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-normal sm:tracking-wider leading-tight text-center transition cursor-pointer ${
                dragOverRouteTab ? 'drop-zone-active scale-105' : ''
              } ${
                activeTab === 'route' ? 'liquid-btn-orange' : 'hover:bg-white/10'
              }`}
              style={activeTab !== 'route' ? { color: 'var(--text-heading)' } : undefined}
            >
              <ListChecks className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-full">My Route ({myStops.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pool')}
              className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-normal sm:tracking-wider leading-tight text-center transition cursor-pointer ${
                activeTab === 'pool' ? 'liquid-btn-orange' : 'hover:bg-white/10'
              }`}
              style={activeTab !== 'pool' ? { color: 'var(--text-heading)' } : undefined}
            >
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-[#FCB900]" />
              <span className="truncate max-w-full">Pick Stops ({poolStops.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cars')}
              className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-2 sm:py-2.5 px-1 sm:px-2 rounded-xl text-[10px] sm:text-xs font-extrabold uppercase tracking-normal sm:tracking-wider leading-tight text-center transition cursor-pointer ${
                activeTab === 'cars' ? 'liquid-btn-orange' : 'hover:bg-white/10'
              }`}
              style={activeTab !== 'cars' ? { color: 'var(--text-heading)' } : undefined}
            >
              <CarFront className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate max-w-full">Cars ({cars.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Driver Workspace */}
      <main className="max-w-2xl mx-auto px-3 pt-4 space-y-4">
        {statusMsg && (
          <div className="p-3.5 rounded-2xl liquid-glass-strong border border-[#276EF1]/50 text-xs font-bold flex items-center justify-between shadow-lg">
            <span className="inline-flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
              <Sparkles className="w-4 h-4 shrink-0" style={{ color: accentHex }} />
              {statusMsg}
            </span>
            <button
              onClick={() => setStatusMsg(null)}
              className="ml-2 font-extrabold cursor-pointer"
              style={{ color: accentHex }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Route Progress Liquid Glass Card */}
        <GlassPanel bodyClassName="px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs gap-2">
            <span className="font-extrabold" style={{ color: 'var(--text-heading)' }}>
              Today's Route: {deliveredCount} of {totalStops} Delivered ({progressPct}%)
            </span>
            <span className="font-extrabold shrink-0" style={{ color: myColor }}>
              {remainingCrates} units left
            </span>
          </div>
          <div className="w-full h-3 bg-black/40 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: myColor
              }}
            />
          </div>
        </GlassPanel>

        {/* NEXT STOP SPOTLIGHT HERO CARD */}
        {activeTab === 'route' && nextActiveStop && (
          <GlassPanel
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider shrink-0"
                  style={{ backgroundColor: myColor }}
                >
                  Next Up #{nextActiveStop.sequenceOrder || 1}
                </span>
                <span>{nextActiveStop.kindergarten.name}</span>
              </span>
            }
            subtitle="One-tap glove-friendly driver controls"
            className="ring-2 ring-[#276EF1]/60"
            bodyClassName="p-4 space-y-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                {nextActiveStop.kindergarten.contact && (
                  <a
                    href={`tel:${nextActiveStop.kindergarten.contact}`}
                    className="inline-flex items-center gap-1.5 text-sm font-extrabold hover:underline"
                    style={{ color: accentHex }}
                  >
                    <Phone className="w-4 h-4" />
                    {nextActiveStop.kindergarten.contact}
                  </a>
                )}
                <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--text-body)' }}>
                  {nextActiveStop.kindergarten.address}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-[#FCB900]/25 text-[#FCB900] border border-[#FCB900]/50 text-xs font-extrabold">
                  By {nextActiveStop.kindergarten.time}
                </span>
                <span
                  className="px-3 py-1 rounded-xl liquid-glass-subtle text-xs font-extrabold"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {nextActiveStop.kindergarten.total} units
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <a
                href={
                  nextActiveStop.kindergarten.googleMapsUrl ||
                  `https://www.google.com/maps/dir/?api=1&destination=${nextActiveStop.kindergarten.latitude},${nextActiveStop.kindergarten.longitude}`
                }
                target="_blank"
                rel="noreferrer"
                className="py-3 px-4 rounded-2xl liquid-btn-espresso text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4 text-[#FCB900]" />
                Start GPS Nav
              </a>

              {nextActiveStop.kindergarten.contact && (
                <a
                  href={`tel:${nextActiveStop.kindergarten.contact}`}
                  className="py-3 px-4 rounded-2xl liquid-glass-subtle hover:border-[#276EF1] text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2"
                  style={{ color: 'var(--text-heading)' }}
                >
                  <Phone className="w-4 h-4" style={{ color: accentHex }} />
                  Call Contact
                </a>
              )}

              <button
                onClick={() => handleToggleDelivered(nextActiveStop)}
                className="py-3 px-4 rounded-2xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer sm:col-span-1"
              >
                <CheckCircle2 className="w-4 h-4" />
                Complete Stop ✓
              </button>
            </div>
          </GlassPanel>
        )}

        {/* Action Toolbar: Optimize + Search + Map Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {activeTab === 'route' ? (
            <button
              onClick={handleOptimizeRoute}
              disabled={optimizing || myStops.length < 2}
              className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl liquid-btn-orange disabled:opacity-40 text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <Compass className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
              {optimizing ? 'Optimizing GPS Route...' : 'Auto-Optimize Route (Deadline + GPS)'}
            </button>
          ) : (
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
                style={{ color: accentHex }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search available kindergartens or phone..."
                className="w-full pl-9 pr-8 py-2.5 rounded-2xl liquid-glass text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                style={{ color: 'var(--text-heading)' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  style={{ color: 'var(--text-heading)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setShowMap(!showMap)}
            className={`inline-flex items-center gap-1.5 py-2.5 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
              showMap ? 'liquid-btn-espresso' : 'liquid-glass hover:border-[#276EF1]'
            }`}
            style={!showMap ? { color: 'var(--text-heading)' } : undefined}
          >
            <MapIcon className="w-4 h-4" style={{ color: accentHex }} />
            {showMap ? 'Hide Map' : 'Live Map'}
          </button>
        </div>

        {/* Collapsible Interactive Leaflet Map */}
        {showMap && (
          <GlassPanel
            allowExpand
            title="Live Route & Pool Map"
            subtitle="Your live GPS position is shared with Dispatch"
            bodyClassName="p-3"
          >
            <LogisticsMap
              assignments={activeTab === 'route' ? myStops : poolStops}
              drivers={drivers}
              onClaim={handleClaimStop}
              onToggleDelivered={handleToggleDelivered}
              heightClass="h-[340px]"
            />
          </GlassPanel>
        )}

        {/* TAB 1: DRIVER'S DRAGGABLE ROUTE CHECKLIST */}
        {activeTab === 'route' && (
          <GlassPanel
            title={`My Delivery Sequence (${myStops.length} Stops)`}
            subtitle="Drag any stop card to reorder your sequence, or use Up/Down arrows"
            bodyClassName="p-3 space-y-3"
          >
            {loading ? (
              <div className="p-8 text-center text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                Loading your route...
              </div>
            ) : myStops.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#276EF1]/15 text-[#276EF1] flex items-center justify-center mx-auto">
                  <PlusCircle className="w-6 h-6" />
                </div>
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-heading)' }}>
                  Your route is empty
                </h3>
                <p className="text-xs max-w-xs mx-auto" style={{ color: 'var(--text-body)' }}>
                  Browse the general pool of unassigned kindergartens and claim stops for today's
                  delivery run.
                </p>
                <button
                  onClick={() => setActiveTab('pool')}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                >
                  Browse Available Kindergartens ({poolStops.length})
                </button>
              </div>
            ) : (
              myStops.map((stop, idx) => {
                const k = stop.kindergarten;
                const isDraggingThis = draggedStopId === stop.id;
                const isDropTargetThis = dragOverStopId === stop.id;

                return (
                  <div
                    key={stop.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(stop.id));
                      setDraggedStopId(stop.id);
                    }}
                    onDragEnd={() => {
                      setDraggedStopId(null);
                      setDragOverStopId(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverStopId !== stop.id) setDragOverStopId(stop.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDropReorderStop(stop.id);
                    }}
                    className={`rounded-2xl p-4 draggable-item cursor-grab active:cursor-grabbing space-y-3 ${
                      isDraggingThis ? 'is-dragging' : ''
                    } ${isDropTargetThis ? 'drop-zone-active' : ''} ${
                      stop.isDelivered
                        ? 'bg-emerald-500/15 border border-emerald-500/35'
                        : 'liquid-glass-subtle hover:border-[#276EF1]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className="mt-2 opacity-75 hover:opacity-100 shrink-0"
                          style={{ color: myColor }}
                          title="Drag to reorder stop"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-sm shrink-0 shadow-sm text-white"
                          style={{
                            backgroundColor: stop.isDelivered ? '#16A34A' : myColor
                          }}
                        >
                          {stop.isDelivered ? '✓' : `#${stop.sequenceOrder || idx + 1}`}
                        </div>

                        <div className="min-w-0">
                          <h3
                            className={`font-extrabold text-sm sm:text-base leading-snug ${
                              stop.isDelivered ? 'line-through opacity-60' : ''
                            }`}
                            style={{ color: 'var(--text-heading)' }}
                          >
                            {k.name}
                          </h3>

                          {k.contact && (
                            <a
                              href={`tel:${k.contact}`}
                              className="inline-flex items-center gap-1 text-xs font-extrabold hover:underline mt-0.5"
                              style={{ color: accentHex }}
                            >
                              <Phone className="w-3 h-3" />
                              {k.contact}
                            </a>
                          )}

                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-body)' }}>
                            {k.address}
                          </p>
                        </div>
                      </div>

                      {/* Manual Up / Down Reorder Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleMoveStop(idx, -1)}
                          disabled={idx === 0}
                          title="Move Earlier"
                          className="p-2 rounded-xl liquid-glass hover:border-[#276EF1] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
                        </button>
                        <button
                          onClick={() => handleMoveStop(idx, 1)}
                          disabled={idx === myStops.length - 1}
                          title="Move Later"
                          className="p-2 rounded-xl liquid-glass hover:border-[#276EF1] disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-4 h-4" style={{ color: 'var(--text-heading)' }} />
                        </button>
                      </div>
                    </div>

                    {/* Badges: Deadline Time, Meals/Crates */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#FCB900]/25 text-[#FCB900] border border-[#FCB900]/45 font-extrabold">
                        <Clock className="w-3.5 h-3.5" />
                        Deliver by {k.time}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-glass font-bold"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <Package className="w-3.5 h-3.5" style={{ color: accentHex }} />
                        {k.total} units
                      </span>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="pt-2 border-t border-white/10 grid grid-cols-12 gap-1.5 sm:gap-2">
                      <a
                        href={
                          k.googleMapsUrl ||
                          `https://www.google.com/maps/dir/?api=1&destination=${k.latitude},${k.longitude}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="col-span-5 inline-flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-2 sm:px-3 rounded-xl liquid-btn-espresso text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition"
                      >
                        <Navigation className="w-3.5 h-3.5 text-[#FCB900] shrink-0" />
                        <span>Navigate</span>
                        <ExternalLink className="w-3 h-3 opacity-70 shrink-0 hidden sm:inline" />
                      </a>

                      <button
                        onClick={() => handleToggleDelivered(stop)}
                        className={`col-span-5 inline-flex items-center justify-center gap-1 sm:gap-1.5 py-2.5 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                          stop.isDelivered
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'liquid-btn-orange'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                        <span>{stop.isDelivered ? 'Delivered ✓' : 'Mark Done'}</span>
                      </button>

                      <button
                        onClick={() => handleUnclaimStop(stop.id)}
                        title="Release stop back to unassigned pool"
                        className="col-span-2 inline-flex items-center justify-center py-2.5 rounded-xl bg-[#F01111]/15 hover:bg-[#F01111]/25 text-[#F01111] text-xs font-bold transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </GlassPanel>
        )}

        {/* TAB 2: AVAILABLE POOL (SELF-PICK KINDERGARTENS) */}
        {activeTab === 'pool' && (
          <GlassPanel
            title={`Available Kindergarten Pool (${poolStops.length})`}
            subtitle="Tap Claim or drag any stop onto the 'My Route' tab above"
            bodyClassName="p-3 space-y-3"
          >
            {poolStops.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-heading)' }}>
                  No Matching Unassigned Kindergartens
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                  {searchQuery
                    ? 'Try clearing your search filter above.'
                    : 'Every kindergarten for today has been assigned to a driver.'}
                </p>
              </div>
            ) : (
              poolStops.map((stop) => {
                const k = stop.kindergarten;
                return (
                  <div
                    key={stop.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(stop.id));
                      setDraggedStopId(stop.id);
                    }}
                    onDragEnd={() => {
                      setDraggedStopId(null);
                      setDragOverRouteTab(false);
                    }}
                    className="rounded-2xl liquid-glass-subtle hover:border-[#276EF1] p-4 space-y-3 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-sm sm:text-base" style={{ color: 'var(--text-heading)' }}>
                          {k.name}
                        </h3>
                        {k.contact && (
                          <a
                            href={`tel:${k.contact}`}
                            className="inline-flex items-center gap-1 text-xs font-extrabold hover:underline mt-0.5"
                            style={{ color: accentHex }}
                          >
                            <Phone className="w-3 h-3" />
                            {k.contact}
                          </a>
                        )}
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-body)' }}>
                          {k.address}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#FCB900]/25 text-[#FCB900] border border-[#FCB900]/45 text-xs font-extrabold shrink-0">
                        By {k.time}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-glass font-bold"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <Package className="w-3.5 h-3.5" style={{ color: accentHex }} />
                        {k.total} units
                      </span>
                      <a
                        href={k.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold hover:underline ml-auto"
                        style={{ color: accentHex }}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View on Map
                      </a>
                    </div>

                    <button
                      onClick={() => handleClaimStop(stop.id)}
                      className="w-full py-3 rounded-2xl liquid-btn-orange font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Claim Stop for My Route
                    </button>
                  </div>
                );
              })
            )}
          </GlassPanel>
        )}

        {/* TAB 3: CARS FLEET (DRIVERS CAN ONLY TAKE OR DROP CARS — MULTIPLE DRIVERS CAN SHARE A CAR) */}
        {activeTab === 'cars' && (
          <GlassPanel
            title={`Delivery Cars (${cars.length})`}
            subtitle="Take or drop your delivery car • Several drivers can take the same car"
            bodyClassName="p-3 space-y-3"
          >
            {cars.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <CarFront className="w-10 h-10 mx-auto" style={{ color: accentHex }} />
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-heading)' }}>
                  No Cars Registered Yet
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                  Ask Dispatch to add fleet vehicles.
                </p>
              </div>
            ) : (
              cars.map((c) => {
                const carDrivers = c.drivers || [];
                const isTakenByMe = carDrivers.some((d) => d.id === user?.id);

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl p-4 space-y-3 transition ${
                      isTakenByMe
                        ? 'bg-[#276EF1]/15 border border-[#276EF1]/60'
                        : 'liquid-glass-subtle hover:border-[#276EF1]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[#276EF1]/15 border border-[#276EF1]/35 flex items-center justify-center shrink-0">
                          <CarFront className="w-5 h-5" style={{ color: accentHex }} />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-extrabold text-sm sm:text-base truncate"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            {c.name}
                          </div>
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-[#FCB900]/20 text-[#FCB900] border border-[#FCB900]/40 font-mono text-xs font-extrabold tracking-wider mt-0.5">
                            {c.numberPlate || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Driver Action: ONLY Take Car or Drop Car */}
                      <div className="shrink-0">
                        {isTakenByMe ? (
                          <button
                            onClick={() => handleDropCar(c)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl liquid-btn-red text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            <UserMinus className="w-4 h-4" />
                            Drop Car
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTakeCar(c)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                          >
                            <UserCheck className="w-4 h-4" />
                            Take Car
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Drivers Currently Sharing / Using This Car */}
                    <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2">
                      <span
                        className="text-[11px] font-extrabold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Current Drivers:
                      </span>
                      {carDrivers.length === 0 ? (
                        <span className="text-xs opacity-60" style={{ color: 'var(--text-body)' }}>
                          None — Available to take
                        </span>
                      ) : (
                        carDrivers.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-sm"
                            style={{ backgroundColor: d.color || '#276EF1' }}
                          >
                            <span>{d.name}</span>
                            {d.id === user?.id && (
                              <span className="text-[10px] opacity-90">(You)</span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </GlassPanel>
        )}
      </main>

      {/* Bottom Floating Liquid Glass Live Status Pill */}
      <footer className="fixed bottom-3 inset-x-3 z-30 pointer-events-none">
        <div className="max-w-md mx-auto liquid-glass-strong rounded-full py-2.5 px-5 flex items-center justify-between text-xs pointer-events-auto">
          <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: 'var(--text-body)' }}>
            <Radio
              className={`w-3.5 h-3.5 ${
                connected ? 'text-emerald-400 animate-pulse' : 'text-[#FCB900]'
              }`}
            />
            {connected ? 'Live Dispatch & GPS Sharing Active' : 'Syncing with Dispatch...'}
          </span>
          <span className="font-extrabold" style={{ color: myColor }}>
            {deliveredCount}/{totalStops} Done
          </span>
        </div>
      </footer>
    </div>
  );
};
