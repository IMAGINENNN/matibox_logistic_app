import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Sun,
  Truck,
  UserCheck,
  UserMinus,
  X
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useGlassTheme } from '../context/ThemeContext';
import { useLogisticsHub } from '../hooks/useLogisticsHub';
import { Car, DeliveryAssignment, Driver } from '../types';
import { LogisticsMap } from '../components/LogisticsMap';
import { MatiboxLogo } from '../components/MatiboxLogo';
import { GlassPanel } from '../components/GlassPanel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Toast } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';

type DriverViewTab = 'route' | 'pool' | 'cars';

// Oslo Central Hub fallback coordinates (Maridalsveien 300, Oslo)
const HUB_LAT = 59.953677;
const HUB_LNG = 10.760444;

export const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useGlassTheme();

  const [activeTab, setActiveTab] = useState<DriverViewTab>('route');
  const [showMap, setShowMap] = useState<boolean>(false);
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [optimizing, setOptimizing] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gpsSharingActive, setGpsSharingActive] = useState<boolean>(false);
  const [busyAssignmentId, setBusyAssignmentId] = useState<number | null>(null);

  // Drag & drop state for driver route reordering and claiming
  const [draggedStopId, setDraggedStopId] = useState<number | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);
  const [dragOverRouteTab, setDragOverRouteTab] = useState<boolean>(false);

  const today = new Date().toISOString().split('T')[0];

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg((cur) => (cur === msg ? null : cur)), 3200);
  };

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
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not load deliveries');
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

  const myColor = myDriverRecord?.color || user?.color || '#276EF1';

  const myTakenCars = useMemo(
    () => cars.filter((c) => (c.drivers || []).some((d) => d.id === user?.id)),
    [cars, user?.id]
  );

  const myStops = useMemo(
    () =>
      assignments
        .filter((a) => a.driverId === user?.id)
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder),
    [assignments, user?.id]
  );

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

  const nextActiveStop = useMemo(
    () => myStops.find((s) => !s.isDelivered) || null,
    [myStops]
  );

  // Live GPS Location Sharing while Driver is Online
  useEffect(() => {
    if (!user?.id) return;

    let watchId: number | null = null;
    let isMounted = true;

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
    if (busyAssignmentId === assignmentId) return;
    setBusyAssignmentId(assignmentId);
    setErrorMsg(null);
    try {
      const coords = await getDriverCoordinates();
      await api.deliveries.claim(assignmentId, coords.lat, coords.lng);
      await fetchDeliveries();
      showToast('Stop added to your route & auto-sequenced!');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBusyAssignmentId((cur) => (cur === assignmentId ? null : cur));
    }
  };

  const handleUnclaimStop = async (assignmentId: number) => {
    if (busyAssignmentId === assignmentId) return;
    setBusyAssignmentId(assignmentId);
    setErrorMsg(null);
    try {
      await api.deliveries.unclaim(assignmentId);
      await fetchDeliveries();
      showToast('Stop returned to Unassigned Pool');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBusyAssignmentId((cur) => (cur === assignmentId ? null : cur));
    }
  };

  const handleToggleDelivered = async (stop: DeliveryAssignment) => {
    if (busyAssignmentId === stop.id) return;
    setBusyAssignmentId(stop.id);
    setErrorMsg(null);
    try {
      await api.deliveries.toggleDelivered(stop.id, !stop.isDelivered);
      await fetchDeliveries();
      showToast(!stop.isDelivered ? `Marked "${stop.kindergarten.name}" delivered` : 'Marked pending');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setBusyAssignmentId((cur) => (cur === stop.id ? null : cur));
    }
  };

  const handleOptimizeRoute = async () => {
    setOptimizing(true);
    setErrorMsg(null);
    try {
      const coords = await getDriverCoordinates();
      await api.deliveries.optimize({
        date: today,
        startLatitude: coords.lat,
        startLongitude: coords.lng
      });
      await fetchDeliveries();
      showToast(
        coords.lat
          ? 'Route optimized by deadline & live GPS!'
          : 'Route optimized by deadline & hub distance!'
      );
    } catch (err: any) {
      setErrorMsg(err.message);
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
      setErrorMsg(err.message);
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
      showToast('Route order updated!');
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleTakeCar = async (car: Car) => {
    setErrorMsg(null);
    try {
      await api.cars.take(car.id);
      await fetchDeliveries();
      showToast(`Assigned "${car.name}" (${car.numberPlate}) to your shift`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleDropCar = async (car: Car) => {
    setErrorMsg(null);
    try {
      await api.cars.drop(car.id);
      await fetchDeliveries();
      showToast(`Dropped "${car.name}" (${car.numberPlate})`);
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const navItems: { id: DriverViewTab; label: string; count: number; icon: React.ElementType }[] = [
    { id: 'route', label: 'My Route', count: myStops.length, icon: ListChecks },
    { id: 'pool', label: 'Pick Stops', count: poolStops.length, icon: PlusCircle },
    { id: 'cars', label: 'Cars', count: cars.length, icon: CarFront }
  ];

  return (
    <div className="min-h-[100dvh] pb-28 lg:pb-10 flex flex-col">
      {/* Sticky Apple Liquid Glass Driver Header */}
      <header className="sticky top-0 z-40 px-2.5 sm:px-6 pt-2 sm:pt-3">
        <div className="max-w-5xl mx-auto glass-floating-strong rounded-2xl sm:rounded-3xl px-3 sm:px-5 py-2.5 sm:py-3 space-y-2 lg:space-y-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            {/* Brand + Desktop Driver Identity */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <MatiboxLogo size="sm" darkText={theme === 'dark'} />
              </div>

              <div className="hidden lg:block min-w-0 pl-3 border-l border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-white shrink-0"
                    style={{ backgroundColor: myColor }}
                  />
                  <span
                    className="font-bold text-sm truncate"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    {user?.name}
                  </span>
                  <Badge
                    tone={gpsSharingActive ? 'success' : 'warning'}
                    dot
                    pulse={gpsSharingActive}
                    className="shrink-0"
                  >
                    {gpsSharingActive ? 'GPS Live' : 'GPS'}
                  </Badge>
                </div>
                <p
                  className="text-[11px] font-medium flex items-center gap-1 mt-0.5 truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Truck className="w-3 h-3 shrink-0" style={{ color: myColor }} />
                  <span className="truncate">
                    {myTakenCars.length > 0
                      ? myTakenCars.map((c) => `${c.name} (${c.numberPlate})`).join(', ')
                      : 'No car selected · Tap Cars'}
                  </span>
                </p>
              </div>
            </div>

            {/* Desktop Tab Switcher (Hidden on Mobile, shown in Bottom Dock instead) */}
            <div
              role="tablist"
              aria-label="Driver sections"
              className="hidden lg:flex items-center surface-elevated border border-[var(--border-subtle)] p-1 rounded-xl gap-1"
            >
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isRouteDrop = item.id === 'route' && dragOverRouteTab;
                return (
                  <button
                    key={item.id}
                    role="tab"
                    aria-selected={isActive}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    onDragOver={
                      item.id === 'route'
                        ? (e) => {
                            e.preventDefault();
                            setDragOverRouteTab(true);
                          }
                        : undefined
                    }
                    onDragLeave={
                      item.id === 'route' ? () => setDragOverRouteTab(false) : undefined
                    }
                    onDrop={
                      item.id === 'route'
                        ? async (e) => {
                            e.preventDefault();
                            setDragOverRouteTab(false);
                            if (draggedStopId !== null) {
                              await handleClaimStop(draggedStopId);
                              setDraggedStopId(null);
                              setActiveTab('route');
                            }
                          }
                        : undefined
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer tabular-nums ${
                      isRouteDrop ? 'drop-zone-active scale-105' : ''
                    } ${
                      isActive
                        ? 'btn-primary'
                        : 'text-[var(--text-body-color)] hover:text-[var(--text-heading)] hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                    <span
                      className={`text-[11px] px-1.5 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'surface-subtle text-[var(--text-muted)]'
                      }`}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Controls: Sync/GPS Indicator, Theme, Exit */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <span
                className="inline-flex lg:hidden items-center gap-1 px-2 py-1.5 rounded-full text-[11px] font-semibold border shrink-0"
                style={{
                  background: gpsSharingActive ? 'var(--status-success-soft)' : 'var(--status-warning-soft)',
                  borderColor: 'var(--border-subtle)',
                  color: gpsSharingActive ? 'var(--status-success)' : 'var(--status-warning)'
                }}
                title={gpsSharingActive ? 'Live GPS Sharing Active' : 'Connecting GPS'}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    gpsSharingActive ? 'bg-[var(--status-success)] animate-pulse' : 'bg-[var(--status-warning)]'
                  }`}
                />
                <span className="hidden xs:inline">{gpsSharingActive ? 'GPS Live' : 'GPS'}</span>
              </span>

              <span
                className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl surface-elevated border border-[var(--border-subtle)] text-[11px] font-semibold"
                style={{ color: 'var(--text-muted)' }}
                title={connected ? 'Live Dispatch Connected' : 'Syncing...'}
              >
                <Radio
                  className={`w-3 h-3 ${
                    connected ? 'text-[var(--status-success)] animate-pulse' : 'text-[var(--status-warning)]'
                  }`}
                />
                <span>{connected ? 'Live' : 'Sync'}</span>
              </span>

              <button
                type="button"
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to Daylight mode' : 'Switch to Dark mode'}
                className="p-2 rounded-xl surface-elevated border border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition cursor-pointer"
                style={{ color: 'var(--text-heading)' }}
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-[#276EF1]" />
                )}
              </button>

              <button
                type="button"
                onClick={handleExit}
                aria-label="Sign out"
                className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl bg-[var(--status-danger-soft)] hover:bg-[var(--status-danger)] text-[var(--status-danger)] hover:text-white border border-[var(--status-danger)]/25 text-xs font-semibold transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Exit</span>
              </button>
            </div>
          </div>

          {/* Mobile & Tablet Driver Identity Strip — Full-Width & Zero Truncation */}
          <div className="lg:hidden pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full border border-white shrink-0"
                style={{ backgroundColor: myColor }}
              />
              <span
                className="font-bold text-xs sm:text-sm truncate"
                style={{ color: 'var(--text-heading)' }}
              >
                {user?.name}
              </span>
            </div>

            <div
              className="flex items-center gap-1.5 text-[11px] font-medium min-w-0 max-w-[58%]"
              style={{ color: 'var(--text-muted)' }}
            >
              <Truck className="w-3 h-3 shrink-0" style={{ color: myColor }} />
              <span className="truncate">
                {myTakenCars.length > 0
                  ? myTakenCars.map((c) => `${c.name} (${c.numberPlate})`).join(', ')
                  : 'No car selected'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <Toast message={statusMsg} onDismiss={() => setStatusMsg(null)} />

      {/* Main Responsive Driver Cockpit */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 pt-4 space-y-4">
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-[var(--status-danger-soft)] border border-[var(--status-danger)]/35 text-[var(--status-danger)] text-xs font-semibold flex items-center justify-between gap-2"
          >
            <span>{errorMsg}</span>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              aria-label="Dismiss error"
              className="p-1 rounded-lg hover:bg-black/10 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Shift Progress Card */}
        <GlassPanel bodyClassName="px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs gap-2 tabular-nums">
            <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
              Today's Route: {deliveredCount} of {totalStops} Delivered ({progressPct}%)
            </span>
            <span className="font-bold shrink-0" style={{ color: myColor }}>
              {remainingCrates} units left
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--surface-subtle)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                backgroundColor: myColor
              }}
            />
          </div>
        </GlassPanel>

        {/* NEXT STOP SPOTLIGHT HERO CARD (Uber Trip Card Ergonomics) */}
        {activeTab === 'route' && nextActiveStop && (
          <GlassPanel
            title={
              <span className="inline-flex flex-wrap items-center gap-2">
                <span
                  className="px-2.5 py-0.5 rounded-full text-white text-[11px] font-bold shrink-0 tabular-nums"
                  style={{ backgroundColor: myColor }}
                >
                  Next #{nextActiveStop.sequenceOrder || 1}
                </span>
                <span>{nextActiveStop.kindergarten.name}</span>
              </span>
            }
            subtitle="Priority next stop · Large touch controls"
            className="ring-2 ring-[var(--accent-primary)]/45 animate-enter"
            bodyClassName="p-4 space-y-3.5"
          >
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                {nextActiveStop.kindergarten.contact && (
                  <a
                    href={`tel:${nextActiveStop.kindergarten.contact}`}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-[var(--accent-primary-vivid)] hover:underline tabular-nums"
                  >
                    <Phone className="w-4 h-4" />
                    {nextActiveStop.kindergarten.contact}
                  </a>
                )}
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-body-color)' }}>
                  {nextActiveStop.kindergarten.address}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Badge tone="warning">
                  <Clock className="w-3 h-3" />
                  By {nextActiveStop.kindergarten.time}
                </Badge>
                <Badge tone="neutral">
                  <Package className="w-3 h-3" />
                  {nextActiveStop.kindergarten.total} units
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <a
                href={
                  nextActiveStop.kindergarten.googleMapsUrl ||
                  `https://www.google.com/maps/dir/?api=1&destination=${nextActiveStop.kindergarten.latitude},${nextActiveStop.kindergarten.longitude}`
                }
                target="_blank"
                rel="noreferrer"
                className="btn-secondary min-h-[46px] px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2"
              >
                <Navigation className="w-4 h-4 text-[var(--accent-primary-vivid)]" />
                <span>Start GPS Navigation</span>
              </a>

              {nextActiveStop.kindergarten.contact && (
                <a
                  href={`tel:${nextActiveStop.kindergarten.contact}`}
                  className="btn-secondary min-h-[46px] px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4 text-[var(--status-success)]" />
                  <span>Call Kindergarten</span>
                </a>
              )}

              <Button
                variant="primary"
                size="lg"
                disabled={busyAssignmentId === nextActiveStop.id}
                loading={busyAssignmentId === nextActiveStop.id}
                onClick={() => handleToggleDelivered(nextActiveStop)}
                className="min-h-[46px]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Stop</span>
              </Button>
            </div>
          </GlassPanel>
        )}

        {/* Action Toolbar: Optimize / Search + Map Toggle */}
        {activeTab !== 'cars' && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            {activeTab === 'route' ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleOptimizeRoute}
                disabled={optimizing || myStops.length < 2}
                loading={optimizing}
                className="flex-1 min-w-0"
              >
                <Compass className={`w-4 h-4 ${optimizing ? 'animate-spin' : ''}`} />
                <span className="truncate">
                  {optimizing ? 'Optimizing Route...' : 'Auto-Optimize Route (Deadline + GPS)'}
                </span>
              </Button>
            ) : (
              <div className="relative flex-1 min-w-[180px]">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search available kindergartens or phone..."
                  aria-label="Search available kindergartens"
                  className="input-field w-full pl-9 pr-8 py-2.5 rounded-xl text-xs font-medium min-h-[42px]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-[var(--surface-hover)] cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            <Button
              variant={showMap ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setShowMap((s) => !s)}
              className="shrink-0"
            >
              <MapIcon className="w-4 h-4" />
              <span>{showMap ? 'Hide Map' : 'Map'}</span>
            </Button>
          </div>
        )}

        {/* Responsive Split Grid on Desktop when Map is open */}
        {activeTab !== 'cars' && (
          <div
            className={`grid grid-cols-1 gap-4 items-start ${
              showMap ? 'lg:grid-cols-12' : ''
            }`}
          >
            {showMap && (
              <div className="lg:col-span-5 lg:sticky lg:top-24 animate-enter">
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
                    heightClass="h-[320px] sm:h-[380px] lg:h-[500px]"
                  />
                </GlassPanel>
              </div>
            )}

            <div className={showMap ? 'lg:col-span-7' : ''}>
              {/* TAB 1: DRIVER'S ROUTE CHECKLIST */}
              {activeTab === 'route' && (
                <GlassPanel
                  title={`My Delivery Sequence (${myStops.length})`}
                  subtitle="Drag stop cards or use arrows to adjust your delivery order"
                  bodyClassName="p-3 space-y-2.5"
                >
                  {loading ? (
                    <div
                      className="p-8 text-center text-xs font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Loading your route...
                    </div>
                  ) : myStops.length === 0 ? (
                    <EmptyState
                      icon={<PlusCircle className="w-5 h-5" />}
                      title="Your route is empty"
                      description="Browse unassigned kindergartens in the pool to claim stops for today's delivery run."
                      action={
                        <Button variant="primary" size="md" onClick={() => setActiveTab('pool')}>
                          Browse Available Stops ({poolStops.length})
                        </Button>
                      }
                    />
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
                          className={`rounded-2xl p-3.5 sm:p-4 draggable-item cursor-grab active:cursor-grabbing space-y-3 border ${
                            isDraggingThis ? 'is-dragging' : ''
                          } ${isDropTargetThis ? 'drop-zone-active' : ''} ${
                            stop.isDelivered
                              ? 'bg-[var(--status-success-soft)]/50 border-[var(--status-success)]/30'
                              : 'surface-elevated border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <div
                                className="mt-2 opacity-60 hover:opacity-100 shrink-0 hidden sm:block"
                                style={{ color: 'var(--text-muted)' }}
                                title="Drag to reorder stop"
                              >
                                <GripVertical className="w-4 h-4" />
                              </div>

                              <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white tabular-nums shadow-sm"
                                style={{
                                  backgroundColor: stop.isDelivered ? '#10B981' : myColor
                                }}
                              >
                                {stop.isDelivered ? '✓' : `#${stop.sequenceOrder || idx + 1}`}
                              </div>

                              <div className="min-w-0">
                                <h3
                                  className={`font-bold text-sm sm:text-base leading-snug ${
                                    stop.isDelivered ? 'line-through opacity-60' : ''
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

                                <p
                                  className="text-xs mt-0.5"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {k.address}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMoveStop(idx, -1)}
                                disabled={idx === 0}
                                aria-label="Move stop earlier"
                                className="p-2 rounded-xl surface-card border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--text-heading)' }} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveStop(idx, 1)}
                                disabled={idx === myStops.length - 1}
                                aria-label="Move stop later"
                                className="p-2 rounded-xl surface-card border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] disabled:opacity-30 cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--text-heading)' }} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge tone="warning">
                              <Clock className="w-3 h-3" />
                              By {k.time}
                            </Badge>
                            <Badge tone="neutral">
                              <Package className="w-3 h-3" />
                              {k.total} units
                            </Badge>
                          </div>

                          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap sm:flex-nowrap items-center gap-2">
                            <a
                              href={
                                k.googleMapsUrl ||
                                `https://www.google.com/maps/dir/?api=1&destination=${k.latitude},${k.longitude}`
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary flex-1 min-h-[42px] px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                            >
                              <Navigation className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)] shrink-0" />
                              <span>Navigate</span>
                              <ExternalLink className="w-3 h-3 opacity-60 shrink-0 hidden sm:inline" />
                            </a>

                            <Button
                              variant={stop.isDelivered ? 'success' : 'primary'}
                              size="md"
                              disabled={busyAssignmentId === stop.id}
                              loading={busyAssignmentId === stop.id}
                              onClick={() => handleToggleDelivered(stop)}
                              className="flex-1 min-h-[42px]"
                            >
                              <CheckCircle2 className="w-4 h-4 shrink-0" />
                              <span>{stop.isDelivered ? 'Delivered ✓' : 'Mark Done'}</span>
                            </Button>

                            <Button
                              variant="danger"
                              size="md"
                              disabled={busyAssignmentId === stop.id}
                              onClick={() => handleUnclaimStop(stop.id)}
                              aria-label={`Release ${k.name} back to pool`}
                              title="Release stop back to unassigned pool"
                              className="min-h-[42px] px-3 shrink-0"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </GlassPanel>
              )}

              {/* TAB 2: AVAILABLE POOL */}
              {activeTab === 'pool' && (
                <GlassPanel
                  title={`Available Kindergarten Pool (${poolStops.length})`}
                  subtitle="Claim stops to add them to your optimized route"
                  bodyClassName="p-3 space-y-2.5"
                >
                  {poolStops.length === 0 ? (
                    <EmptyState
                      icon={<CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />}
                      title="No Matching Unassigned Stops"
                      description={
                        searchQuery
                          ? 'Try clearing your search filter above.'
                          : 'Every kindergarten for today has been assigned to a driver.'
                      }
                    />
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
                          className="rounded-2xl surface-elevated border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 p-4 space-y-3 cursor-grab active:cursor-grabbing transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3
                                className="font-bold text-sm sm:text-base leading-snug"
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
                            </div>
                            <Badge tone="warning" className="shrink-0">
                              By {k.time}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <Badge tone="neutral">
                              <Package className="w-3 h-3" />
                              {k.total} units
                            </Badge>
                            <a
                              href={k.googleMapsUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary-vivid)] hover:underline"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              View on Map
                            </a>
                          </div>

                          <Button
                            variant="primary"
                            size="lg"
                            fullWidth
                            disabled={busyAssignmentId === stop.id}
                            loading={busyAssignmentId === stop.id}
                            onClick={() => handleClaimStop(stop.id)}
                          >
                            <PlusCircle className="w-4 h-4" />
                            <span>Claim Stop for My Route</span>
                          </Button>
                        </div>
                      );
                    })
                  )}
                </GlassPanel>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CARS FLEET (TAKE / DROP ONLY) */}
        {activeTab === 'cars' && (
          <GlassPanel
            title={`Fleet Vehicles (${cars.length})`}
            subtitle="Take or drop a vehicle for your shift · Several drivers can share the same car"
            bodyClassName="p-3 space-y-2.5"
          >
            {cars.length === 0 ? (
              <EmptyState
                icon={<CarFront className="w-5 h-5" />}
                title="No Vehicles Registered"
                description="Ask Dispatch to add fleet vehicles."
              />
            ) : (
              cars.map((c) => {
                const carDrivers = c.drivers || [];
                const isTakenByMe = carDrivers.some((d) => d.id === user?.id);

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl p-4 space-y-3 border transition ${
                      isTakenByMe
                        ? 'bg-[var(--accent-primary-soft)] border-[var(--accent-primary)]/50'
                        : 'surface-elevated border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)]/25 flex items-center justify-center shrink-0">
                          <CarFront className="w-5 h-5 text-[var(--accent-primary-vivid)]" />
                        </div>
                        <div className="min-w-0">
                          <div
                            className="font-bold text-sm sm:text-base truncate"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            {c.name}
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-lg bg-[var(--status-warning-soft)] text-[var(--status-warning)] border border-[var(--status-warning)]/30 font-mono text-xs font-bold tracking-wider">
                            {c.numberPlate || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 w-full sm:w-auto">
                        {isTakenByMe ? (
                          <Button
                            variant="danger"
                            size="md"
                            fullWidth
                            onClick={() => handleDropCar(c)}
                          >
                            <UserMinus className="w-4 h-4" />
                            Drop Car
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="md"
                            fullWidth
                            onClick={() => handleTakeCar(c)}
                          >
                            <UserCheck className="w-4 h-4" />
                            Take Car
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Active drivers:
                      </span>
                      {carDrivers.length === 0 ? (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Available
                        </span>
                      ) : (
                        carDrivers.map((d) => (
                          <span
                            key={d.id}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
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

      {/* Mobile Native-Feel Floating Apple Liquid Glass Bottom Navigation Dock (< lg) */}
      <nav
        aria-label="Driver navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pt-2 pb-safe pointer-events-none"
      >
        <div className="max-w-md mx-auto glass-floating-strong rounded-2xl p-1.5 grid grid-cols-3 gap-1 pointer-events-auto shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isRouteDrop = item.id === 'route' && dragOverRouteTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                onDragOver={
                  item.id === 'route'
                    ? (e) => {
                        e.preventDefault();
                        setDragOverRouteTab(true);
                      }
                    : undefined
                }
                onDragLeave={
                  item.id === 'route' ? () => setDragOverRouteTab(false) : undefined
                }
                onDrop={
                  item.id === 'route'
                    ? async (e) => {
                        e.preventDefault();
                        setDragOverRouteTab(false);
                        if (draggedStopId !== null) {
                          await handleClaimStop(draggedStopId);
                          setDraggedStopId(null);
                          setActiveTab('route');
                        }
                      }
                    : undefined
                }
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer tabular-nums ${
                  isRouteDrop ? 'drop-zone-active scale-105' : ''
                } ${
                  isActive
                    ? 'btn-primary'
                    : 'text-[var(--text-body-color)] hover:bg-[var(--surface-hover)]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-full">
                  {item.label} ({item.count})
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
