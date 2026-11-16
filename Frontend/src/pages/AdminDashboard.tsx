import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useGlassTheme } from '../context/ThemeContext';
import { useLogisticsHub } from '../hooks/useLogisticsHub';
import {
  Car,
  DeliveryAssignment,
  Dispatcher,
  Driver,
  Kindergarten,
  SaveCarPayload,
  SaveKindergartenPayload
} from '../types';
import { AdminHeader } from '../components/admin/AdminHeader';
import { KpiStrip } from '../components/admin/KpiStrip';
import { DispatchWorkspace } from '../components/admin/DispatchWorkspace';
import { KindergartensView } from '../components/admin/KindergartensView';
import { DriversView, DRIVER_COLOR_SWATCHES } from '../components/admin/DriversView';
import { CarsView } from '../components/admin/CarsView';
import { DispatchersView } from '../components/admin/DispatchersView';
import { AdminModals } from '../components/admin/AdminModals';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import {
  Building2,
  Car as CarIcon,
  Columns3,
  LayoutGrid,
  MapPin,
  Plus,
  ShieldCheck,
  Users,
  Wand2,
  X
} from 'lucide-react';

type AdminTab = 'dispatch' | 'kindergartens' | 'drivers' | 'cars' | 'dispatchers';
type DispatchLayoutMode = 'split' | 'kanban';

interface PendingDeleteState {
  type: 'kg' | 'driver' | 'car' | 'dispatcher';
  id: string | number;
  title: string;
  message: string;
}

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useGlassTheme();
  const isMasterAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<AdminTab>('dispatch');
  const [dispatchMode, setDispatchMode] = useState<DispatchLayoutMode>('split');
  const [swapSplitPanels, setSwapSplitPanels] = useState<boolean>(false);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [kindergartens, setKindergartens] = useState<Kindergarten[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [dispatchers, setDispatchers] = useState<Dispatcher[]>([]);
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Confirm Dialog States
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState<boolean>(false);
  const [refreshingData, setRefreshingData] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null);
  const [deletingItem, setDeletingItem] = useState<boolean>(false);

  // Kindergarten Modal State
  const [kgModalOpen, setKgModalOpen] = useState(false);
  const [editingKg, setEditingKg] = useState<Kindergarten | null>(null);
  const [kgForm, setKgForm] = useState<SaveKindergartenPayload>({
    name: '',
    address: '',
    contact: '',
    time: '08:30',
    total: 40,
    latitude: 59.953677,
    longitude: 10.760444,
    googleMapsUrl: ''
  });

  // Driver Modal State
  const [driverModalOpen, setDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [driverForm, setDriverForm] = useState({
    name: '',
    email: '',
    password: '',
    contact: '',
    car: '',
    color: '#276EF1'
  });

  // Dispatcher Modal State
  const [dispatcherModalOpen, setDispatcherModalOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState<Dispatcher | null>(null);
  const [dispatcherForm, setDispatcherForm] = useState({
    name: '',
    email: '',
    password: '',
    contact: ''
  });

  // Car Modal State
  const [carModalOpen, setCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [carForm, setCarForm] = useState<SaveCarPayload>({
    name: '',
    numberPlate: '',
    driverIds: []
  });

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast((cur) => (cur === msg ? null : cur)), 3500);
  };

  const fetchAllData = useCallback(async () => {
    try {
      const [delivData, kgData, drvData, carData, dispData] = await Promise.all([
        api.deliveries.getByDate(selectedDate),
        api.kindergartens.getAll(),
        api.drivers.getAll(),
        api.cars.getAll(),
        api.dispatchers.getAll().catch(() => [] as Dispatcher[])
      ]);
      setAssignments(delivData);
      setKindergartens(kgData);
      setDrivers(drvData);
      setCars(carData);
      setDispatchers(dispData);
      setActionError(null);
    } catch (err: any) {
      setActionError(err.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const { connected } = useLogisticsHub(fetchAllData);

  const searchedAssignments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) => {
      const k = a.kindergarten;
      return (
        k.name.toLowerCase().includes(q) ||
        k.address.toLowerCase().includes(q) ||
        k.contact.toLowerCase().includes(q) ||
        k.time.toLowerCase().includes(q) ||
        (a.driverName && a.driverName.toLowerCase().includes(q))
      );
    });
  }, [assignments, searchQuery]);

  const filteredAssignments = useMemo(() => {
    return searchedAssignments.filter((a) => {
      if (driverFilter === 'ALL') return true;
      if (driverFilter === 'UNASSIGNED') return !a.driverId;
      return a.driverId === driverFilter;
    });
  }, [searchedAssignments, driverFilter]);

  const filteredKindergartens = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return kindergartens;
    return kindergartens.filter(
      (k) =>
        k.name.toLowerCase().includes(q) ||
        k.address.toLowerCase().includes(q) ||
        k.contact.toLowerCase().includes(q) ||
        k.time.toLowerCase().includes(q)
    );
  }, [kindergartens, searchQuery]);

  const filteredCars = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.numberPlate.toLowerCase().includes(q) ||
        (c.driverName && c.driverName.toLowerCase().includes(q))
    );
  }, [cars, searchQuery]);

  const totalStops = assignments.length;
  const unassignedCount = assignments.filter((a) => !a.driverId).length;
  const deliveredCount = assignments.filter((a) => a.isDelivered).length;
  const inTransitCount = assignments.filter((a) => a.driverId && !a.isDelivered).length;
  const totalCrates = assignments.reduce((acc, a) => acc + a.kindergarten.total, 0);

  // Dispatch Actions
  const handleAssignDriver = async (assignmentId: number, driverId: string | null) => {
    setActionError(null);
    const targetDriver = drivers.find((d) => d.id === driverId);
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === assignmentId
          ? {
              ...a,
              driverId: driverId || null,
              driverName: targetDriver ? targetDriver.name : null,
              driverCar: targetDriver ? targetDriver.car : null,
              driverColor: targetDriver ? targetDriver.color : null
            }
          : a
      )
    );
    try {
      await api.deliveries.assign(assignmentId, driverId || null);
      await fetchAllData();
      showToast(
        driverId
          ? `Assigned stop to ${targetDriver?.name || 'Driver'}`
          : 'Returned stop to Unassigned Pool'
      );
    } catch (err: any) {
      setActionError(err.message);
      await fetchAllData();
    }
  };

  const handleChangeDriverColor = async (driverId: string, newColor: string) => {
    setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, color: newColor } : d)));
    setAssignments((prev) =>
      prev.map((a) => (a.driverId === driverId ? { ...a, driverColor: newColor } : a))
    );
    try {
      await api.drivers.updateColor(driverId, newColor);
      await fetchAllData();
      const drv = drivers.find((d) => d.id === driverId);
      showToast(`Updated route color for ${drv?.name || 'Driver'}`);
    } catch (err: any) {
      setActionError(err.message);
      await fetchAllData();
    }
  };

  const handleToggleDelivered = async (assignment: DeliveryAssignment) => {
    setActionError(null);
    try {
      await api.deliveries.toggleDelivered(assignment.id, !assignment.isDelivered);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleOptimizeDriver = async (driverId: string) => {
    setActionError(null);
    try {
      await api.deliveries.optimize({ driverId, date: selectedDate });
      await fetchAllData();
      const drv = drivers.find((d) => d.id === driverId);
      showToast(`Optimized route for ${drv?.name || 'driver'} by deadline & GPS!`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleSmartDistributePool = async () => {
    if (drivers.length === 0) return;
    const pool = assignments
      .filter((a) => !a.driverId)
      .sort(
        (a, b) =>
          a.kindergarten.time.localeCompare(b.kindergarten.time) ||
          a.kindergarten.latitude - b.kindergarten.latitude
      );
    if (pool.length === 0) {
      showToast('No unassigned stops in the pool to distribute.');
      return;
    }

    setActionError(null);
    try {
      await Promise.all(
        pool.map((stop, idx) => {
          const targetDriver = drivers[idx % drivers.length];
          return api.deliveries.assign(stop.id, targetDriver.id);
        })
      );
      await Promise.all(
        drivers.map((d) => api.deliveries.optimize({ driverId: d.id, date: selectedDate }))
      );
      await fetchAllData();
      showToast(`Auto-assigned ${pool.length} stops across ${drivers.length} drivers!`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleMoveStop = async (driverId: string, index: number, direction: -1 | 1) => {
    const driverStops = assignments
      .filter((a) => a.driverId === driverId)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= driverStops.length) return;

    const reordered = [...driverStops];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);

    try {
      await api.deliveries.reorder({
        driverId,
        date: selectedDate,
        orderedAssignmentIds: reordered.map((x) => x.id)
      });
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleReorderRoute = async (driverId: string, orderedAssignmentIds: number[]) => {
    try {
      await api.deliveries.reorder({
        driverId,
        date: selectedDate,
        orderedAssignmentIds
      });
      await fetchAllData();
      showToast('Route stop order updated!');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleConfirmRefreshData = async () => {
    setRefreshingData(true);
    setActionError(null);
    try {
      await api.deliveries.reset(selectedDate);
      setSwapSplitPanels(false);
      setDriverFilter('ALL');
      await fetchAllData();
      setRefreshConfirmOpen(false);
      showToast('All assignments for today have been reset to Unassigned.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset assignments');
    } finally {
      setRefreshingData(false);
    }
  };

  // Kindergarten CRUD Handlers
  const openCreateKg = () => {
    setEditingKg(null);
    setKgForm({
      name: '',
      address: '',
      contact: '',
      time: '09:00',
      total: 10,
      latitude: 59.953677,
      longitude: 10.760444,
      googleMapsUrl: ''
    });
    setKgModalOpen(true);
  };

  const openEditKg = (kg: Kindergarten) => {
    setEditingKg(kg);
    setKgForm({
      name: kg.name,
      address: kg.address,
      contact: kg.contact,
      time: kg.time,
      total: kg.total,
      latitude: kg.latitude,
      longitude: kg.longitude,
      googleMapsUrl: kg.googleMapsUrl
    });
    setKgModalOpen(true);
  };

  const handleSaveKg = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (editingKg) {
        await api.kindergartens.update(editingKg.id, kgForm);
        showToast(`Updated "${kgForm.name}"`);
      } else {
        await api.kindergartens.create(kgForm);
        showToast(`Created "${kgForm.name}"`);
      }
      setKgModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Driver CRUD Handlers
  const openCreateDriver = () => {
    setEditingDriver(null);
    const nextColor = DRIVER_COLOR_SWATCHES[drivers.length % DRIVER_COLOR_SWATCHES.length];
    setDriverForm({
      name: '',
      email: '',
      password: 'Driver123!',
      contact: '+47 ',
      car: 'Unassigned Vehicle',
      color: nextColor
    });
    setDriverModalOpen(true);
  };

  const openEditDriver = (drv: Driver) => {
    setEditingDriver(drv);
    setDriverForm({
      name: drv.name,
      email: drv.email,
      password: '',
      contact: drv.contact,
      car: drv.car,
      color: drv.color || '#276EF1'
    });
    setDriverModalOpen(true);
  };

  const handleSaveDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (editingDriver) {
        await api.drivers.update(editingDriver.id, {
          name: driverForm.name,
          email: driverForm.email,
          password: driverForm.password.trim() ? driverForm.password.trim() : undefined,
          contact: driverForm.contact,
          car: driverForm.car,
          color: driverForm.color
        });
        showToast(`Updated driver ${driverForm.name}`);
      } else {
        await api.drivers.create(driverForm);
        showToast(`Created driver ${driverForm.name}`);
      }
      setDriverModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Dispatcher CRUD Handlers
  const openCreateDispatcher = () => {
    setEditingDispatcher(null);
    setDispatcherForm({
      name: '',
      email: '',
      password: '',
      contact: '+47 '
    });
    setDispatcherModalOpen(true);
  };

  const openEditDispatcher = (disp: Dispatcher) => {
    setEditingDispatcher(disp);
    setDispatcherForm({
      name: disp.name,
      email: disp.email,
      password: '',
      contact: disp.contact
    });
    setDispatcherModalOpen(true);
  };

  const handleSaveDispatcher = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (editingDispatcher) {
        await api.dispatchers.update(editingDispatcher.id, {
          name: dispatcherForm.name,
          email: dispatcherForm.email,
          password: dispatcherForm.password.trim() ? dispatcherForm.password.trim() : undefined,
          contact: dispatcherForm.contact
        });
        showToast(`Updated dispatcher ${dispatcherForm.name}`);
      } else {
        await api.dispatchers.create(dispatcherForm);
        showToast(`Created dispatcher ${dispatcherForm.name}`);
      }
      setDispatcherModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Car CRUD Handlers
  const openCreateCar = () => {
    setEditingCar(null);
    setCarForm({
      name: '',
      numberPlate: '',
      driverIds: []
    });
    setCarModalOpen(true);
  };

  const openEditCar = (car: Car) => {
    setEditingCar(car);
    setCarForm({
      name: car.name,
      numberPlate: car.numberPlate,
      driverIds: (car.drivers || []).map((d) => d.id)
    });
    setCarModalOpen(true);
  };

  const handleSaveCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      if (editingCar) {
        await api.cars.update(editingCar.id, carForm);
        showToast(`Updated car "${carForm.name}" (${carForm.numberPlate})`);
      } else {
        await api.cars.create(carForm);
        showToast(`Added car "${carForm.name}" (${carForm.numberPlate})`);
      }
      setCarModalOpen(false);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleTakeCarForDriver = async (carId: number, driverId: string) => {
    if (!driverId) return;
    setActionError(null);
    try {
      await api.cars.take(carId, driverId);
      await fetchAllData();
      const drv = drivers.find((d) => d.id === driverId);
      showToast(`Added ${drv?.name || 'Driver'} to car`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleDropCarForDriver = async (carId: number, driverId: string) => {
    setActionError(null);
    try {
      await api.cars.drop(carId, driverId);
      await fetchAllData();
      const drv = drivers.find((d) => d.id === driverId);
      showToast(`Removed ${drv?.name || 'Driver'} from car`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Unified Delete Confirmation Executor
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeletingItem(true);
    setActionError(null);
    try {
      if (pendingDelete.type === 'kg') {
        await api.kindergartens.delete(Number(pendingDelete.id));
        showToast(`Deleted "${pendingDelete.title}"`);
      } else if (pendingDelete.type === 'driver') {
        const drvId = String(pendingDelete.id);
        await api.drivers.delete(drvId);
        if (driverFilter === drvId) setDriverFilter('ALL');
        showToast(`Removed driver ${pendingDelete.title}`);
      } else if (pendingDelete.type === 'car') {
        await api.cars.delete(Number(pendingDelete.id));
        showToast(`Deleted vehicle "${pendingDelete.title}"`);
      } else if (pendingDelete.type === 'dispatcher') {
        await api.dispatchers.delete(String(pendingDelete.id));
        showToast(`Deleted dispatcher ${pendingDelete.title}`);
      }
      setPendingDelete(null);
      await fetchAllData();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setDeletingItem(false);
    }
  };

  const tabs: { id: AdminTab; label: string; count: number; icon: React.ElementType }[] = [
    { id: 'dispatch', label: 'Dispatch', count: assignments.length, icon: MapPin },
    { id: 'kindergartens', label: 'Kindergartens', count: kindergartens.length, icon: Building2 },
    { id: 'drivers', label: 'Drivers', count: drivers.length, icon: Users },
    { id: 'cars', label: 'Cars', count: cars.length, icon: CarIcon },
    { id: 'dispatchers', label: 'Dispatchers', count: dispatchers.length, icon: ShieldCheck }
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col pb-10">
      <AdminHeader
        user={user}
        theme={theme}
        toggleTheme={toggleTheme}
        connected={connected}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        onOpenRefreshConfirm={() => setRefreshConfirmOpen(true)}
        onLogout={logout}
      />

      <Toast message={statusToast} onDismiss={() => setStatusToast(null)} />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-5 space-y-4 sm:space-y-5">
        {actionError && (
          <div
            role="alert"
            className="p-3.5 rounded-2xl bg-[var(--status-danger-soft)] border border-[var(--status-danger)]/35 text-[var(--status-danger)] text-xs sm:text-sm font-semibold flex items-center justify-between gap-3"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Dismiss error"
              className="p-1 rounded-lg hover:bg-black/10 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <KpiStrip
          totalStops={totalStops}
          unassignedCount={unassignedCount}
          inTransitCount={inTransitCount}
          deliveredCount={deliveredCount}
          totalCrates={totalCrates}
          driversCount={drivers.length}
          selectedDate={selectedDate}
          driverFilter={driverFilter}
          onFilterChange={setDriverFilter}
        />

        {/* Navigation Tabs & Contextual Action Bar */}
        <div className="surface-card rounded-2xl p-2 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div
            role="tablist"
            aria-label="Dispatch management sections"
            className="flex flex-wrap items-center gap-1.5"
          >
            {tabs.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 tabular-nums ${
                    isActive
                      ? 'btn-primary'
                      : 'hover:bg-[var(--surface-hover)] text-[var(--text-body-color)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{t.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'surface-subtle text-[var(--text-muted)]'
                    }`}
                  >
                    {t.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between md:justify-end gap-2 flex-wrap">
            {activeTab === 'dispatch' && (
              <>
                {unassignedCount > 0 && (
                  <Button variant="secondary" size="sm" onClick={handleSmartDistributePool}>
                    <Wand2 className="w-3.5 h-3.5 text-[var(--accent-primary-vivid)]" />
                    <span>Auto-Assign Pool ({unassignedCount})</span>
                  </Button>
                )}

                <div className="inline-flex items-center surface-elevated border border-[var(--border-subtle)] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDispatchMode('split')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dispatchMode === 'split'
                        ? 'btn-primary'
                        : 'text-[var(--text-body-color)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Split</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchMode('kanban')}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      dispatchMode === 'kanban'
                        ? 'btn-primary'
                        : 'text-[var(--text-body-color)] hover:text-[var(--text-heading)]'
                    }`}
                  >
                    <Columns3 className="w-3.5 h-3.5" />
                    <span>Kanban</span>
                  </button>
                </div>
              </>
            )}

            {activeTab === 'kindergartens' && (
              <Button variant="primary" size="sm" onClick={openCreateKg}>
                <Plus className="w-4 h-4" />
                Add Kindergarten
              </Button>
            )}

            {activeTab === 'drivers' && (
              <Button variant="primary" size="sm" onClick={openCreateDriver}>
                <Plus className="w-4 h-4" />
                Add Driver
              </Button>
            )}

            {activeTab === 'cars' && (
              <Button variant="primary" size="sm" onClick={openCreateCar}>
                <Plus className="w-4 h-4" />
                Add Vehicle
              </Button>
            )}

            {activeTab === 'dispatchers' && isMasterAdmin && (
              <Button variant="primary" size="sm" onClick={openCreateDispatcher}>
                <Plus className="w-4 h-4" />
                Add Dispatcher
              </Button>
            )}
          </div>
        </div>

        {/* Active Tab Views */}
        {activeTab === 'dispatch' && (
          <DispatchWorkspace
            dispatchMode={dispatchMode}
            swapSplitPanels={swapSplitPanels}
            onToggleSwapPanels={() => setSwapSplitPanels((s) => !s)}
            loading={loading}
            assignments={assignments}
            searchedAssignments={searchedAssignments}
            filteredAssignments={filteredAssignments}
            drivers={drivers}
            driverFilter={driverFilter}
            onDriverFilterChange={setDriverFilter}
            unassignedCount={unassignedCount}
            onAssignDriver={handleAssignDriver}
            onToggleDelivered={handleToggleDelivered}
            onOptimizeDriver={handleOptimizeDriver}
            onSmartDistributePool={handleSmartDistributePool}
            onMoveStop={handleMoveStop}
            onChangeDriverColor={handleChangeDriverColor}
            onReorderRoute={handleReorderRoute}
          />
        )}

        {activeTab === 'kindergartens' && (
          <KindergartensView
            kindergartens={filteredKindergartens}
            onEdit={openEditKg}
            onDelete={(kg) =>
              setPendingDelete({
                type: 'kg',
                id: kg.id,
                title: kg.name,
                message: `Delete kindergarten "${kg.name}"?`,
              })
            }
            onCreate={openCreateKg}
          />
        )}

        {activeTab === 'drivers' && (
          <DriversView
            drivers={drivers}
            assignments={assignments}
            onChangeColor={handleChangeDriverColor}
            onEdit={openEditDriver}
            onDelete={(drv) =>
              setPendingDelete({
                type: 'driver',
                id: drv.id,
                title: drv.name,
                message: `Delete driver "${drv.name}"?`
              })
            }
            onCreate={openCreateDriver}
          />
        )}

        {activeTab === 'cars' && (
          <CarsView
            cars={filteredCars}
            drivers={drivers}
            onTakeCarForDriver={handleTakeCarForDriver}
            onDropCarForDriver={handleDropCarForDriver}
            onEdit={openEditCar}
            onDelete={(car) =>
              setPendingDelete({
                type: 'car',
                id: car.id,
                title: `${car.name} (${car.numberPlate})`,
                message: `Delete vehicle "${car.name} (${car.numberPlate})"?`
              })
            }
            onCreate={openCreateCar}
          />
        )}

        {activeTab === 'dispatchers' && (
          <DispatchersView
            dispatchers={dispatchers}
            isMasterAdmin={isMasterAdmin}
            onEdit={openEditDispatcher}
            onDelete={(disp) =>
              setPendingDelete({
                type: 'dispatcher',
                id: disp.id,
                title: disp.name,
                message: `Delete dispatcher "${disp.name}"?`
              })
            }
            onCreate={openCreateDispatcher}
          />
        )}
      </main>

      {/* Reset Day Confirmation */}
      <ConfirmDialog
        open={refreshConfirmOpen}
        onClose={() => setRefreshConfirmOpen(false)}
        onConfirm={handleConfirmRefreshData}
        title="Reset Daily Assignments"
        message={`Restore all assignments for ${selectedDate} to Unassigned Pool?`}
        detail="All assigned drivers, route orders, and delivered checkmarks for this date will be cleared."
        confirmLabel="Yes, Reset Day"
        tone="danger"
        loading={refreshingData}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Confirm Deletion"
        message={pendingDelete?.message || ''}
        detail={
          pendingDelete?.type === 'driver'
            ? 'Any stops currently assigned to this driver will be returned to the Unassigned Pool.'
            : 'This action cannot be undone.'
        }
        confirmLabel="Delete"
        tone="danger"
        loading={deletingItem}
      />

      {/* Entity Forms Modals */}
      <AdminModals
        kgModalOpen={kgModalOpen}
        onCloseKgModal={() => setKgModalOpen(false)}
        editingKg={editingKg}
        kgForm={kgForm}
        setKgForm={setKgForm}
        onSaveKg={handleSaveKg}
        driverModalOpen={driverModalOpen}
        onCloseDriverModal={() => setDriverModalOpen(false)}
        editingDriver={editingDriver}
        driverForm={driverForm}
        setDriverForm={setDriverForm}
        onSaveDriver={handleSaveDriver}
        isMasterAdmin={isMasterAdmin}
        dispatcherModalOpen={dispatcherModalOpen}
        onCloseDispatcherModal={() => setDispatcherModalOpen(false)}
        editingDispatcher={editingDispatcher}
        dispatcherForm={dispatcherForm}
        setDispatcherForm={setDispatcherForm}
        onSaveDispatcher={handleSaveDispatcher}
        carModalOpen={carModalOpen}
        onCloseCarModal={() => setCarModalOpen(false)}
        editingCar={editingCar}
        carForm={carForm}
        setCarForm={setCarForm}
        drivers={drivers}
        onSaveCar={handleSaveCar}
      />
    </div>
  );
};
