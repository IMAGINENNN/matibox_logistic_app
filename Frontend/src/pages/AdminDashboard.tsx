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
import { LogisticsMap } from '../components/LogisticsMap';
import { MatiboxLogo } from '../components/MatiboxLogo';
import { MovableGlassPanel } from '../components/MovableGlassPanel';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Building2,
  Calendar,
  Car as CarIcon,
  CheckCircle2,
  Clock,
  Columns3,
  Compass,
  Edit3,
  ExternalLink,
  GripVertical,
  LayoutGrid,
  LogOut,
  MapPin,
  Moon,
  Package,
  Palette,
  Phone,
  Plus,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Truck,
  Users,
  Wand2,
  X
} from 'lucide-react';

type AdminTab = 'dispatch' | 'kindergartens' | 'drivers' | 'cars' | 'dispatchers';
type DispatchLayoutMode = 'split' | 'kanban';
type KpiId = 'total' | 'unassigned' | 'transit' | 'delivered' | 'meals';

const DRIVER_COLOR_SWATCHES = [
  '#276EF1', // Uber Blue
  '#A855F7', // Vivid Purple
  '#EC4899', // Hot Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EAB308', // Gold
  '#14B8A6', // Teal
  '#6366F1'  // Indigo
];

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useGlassTheme();
  const isMasterAdmin = user?.role === 'Admin';
  const accentHex = theme === 'dark' ? '#276EF1' : '#E97905';

  const [activeTab, setActiveTab] = useState<AdminTab>('dispatch');
  const [dispatchMode, setDispatchMode] = useState<DispatchLayoutMode>('split');
  const [swapSplitPanels, setSwapSplitPanels] = useState<boolean>(false);
  const [resetTrigger, setResetTrigger] = useState<number>(0);

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

  // Confirmation Popup Modal State for "Refresh Data"
  const [refreshConfirmOpen, setRefreshConfirmOpen] = useState<boolean>(false);
  const [refreshingData, setRefreshingData] = useState<boolean>(false);

  // Drag & Drop State for Stops and KPI Cards
  const [draggedAssignmentId, setDraggedAssignmentId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dragOverStopId, setDragOverStopId] = useState<number | null>(null);

  const [kpiOrder, setKpiOrder] = useState<KpiId[]>(() => {
    try {
      const saved = localStorage.getItem('matibox_kpi_order');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return ['total', 'unassigned', 'transit', 'delivered', 'meals'];
  });
  const [draggedKpi, setDraggedKpi] = useState<KpiId | null>(null);

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

  // Dispatcher Modal State (Only Master Admin can create/edit/delete dispatchers)
  const [dispatcherModalOpen, setDispatcherModalOpen] = useState(false);
  const [editingDispatcher, setEditingDispatcher] = useState<Dispatcher | null>(null);
  const [dispatcherForm, setDispatcherForm] = useState({
    name: '',
    email: '',
    password: '',
    contact: ''
  });

  // Car Modal State (Multi-driver support, no duplicate button)
  const [carModalOpen, setCarModalOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [carForm, setCarForm] = useState<SaveCarPayload>({
    name: '',
    numberPlate: '',
    driverIds: []
  });

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 3500);
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
    } catch (err: any) {
      setActionError(err.message || 'Failed to load logistics data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Real-time SignalR subscription
  const { connected } = useLogisticsHub(fetchAllData);

  // Search-filtered assignments
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

  // Filtered assignments for Split Dispatch panel & Map
  const filteredAssignments = useMemo(() => {
    return searchedAssignments.filter((a) => {
      if (driverFilter === 'ALL') return true;
      if (driverFilter === 'UNASSIGNED') return !a.driverId;
      return a.driverId === driverFilter;
    });
  }, [searchedAssignments, driverFilter]);

  // Filtered kindergartens for CRUD table
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

  // Filtered cars for Cars table
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

  // KPI metrics
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
    setDrivers((prev) =>
      prev.map((d) => (d.id === driverId ? { ...d, color: newColor } : d))
    );
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
      showToast(`Optimized route for ${drv?.name || 'driver'} by deadline + GPS!`);
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

  // Drag & Drop Reorder within a Driver's Route
  const handleDropOnStop = async (targetStop: DeliveryAssignment) => {
    if (draggedAssignmentId === null || draggedAssignmentId === targetStop.id) {
      setDragOverStopId(null);
      return;
    }

    const draggedStop = assignments.find((a) => a.id === draggedAssignmentId);
    if (!draggedStop) return;

    const targetDriverId = targetStop.driverId;

    if (draggedStop.driverId !== targetDriverId) {
      await handleAssignDriver(draggedStop.id, targetDriverId);
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

    try {
      await api.deliveries.reorder({
        driverId: targetDriverId,
        date: selectedDate,
        orderedAssignmentIds: reordered.map((x) => x.id)
      });
      await fetchAllData();
      showToast('Route stop order updated!');
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // KPI Card Drag Reorder
  const handleKpiDrop = (targetKpi: KpiId) => {
    if (!draggedKpi || draggedKpi === targetKpi) return;
    const updated = [...kpiOrder];
    const fromIdx = updated.indexOf(draggedKpi);
    const toIdx = updated.indexOf(targetKpi);
    if (fromIdx === -1 || toIdx === -1) return;
    updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, draggedKpi);
    setKpiOrder(updated);
    setDraggedKpi(null);
    try {
      localStorage.setItem('matibox_kpi_order', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Confirm "Refresh Data" -> Reset all assignments for today to default (No assignments)
  const handleConfirmRefreshData = async () => {
    setRefreshingData(true);
    setActionError(null);
    try {
      await api.deliveries.reset(selectedDate);
      const defaultKpi: KpiId[] = ['total', 'unassigned', 'transit', 'delivered', 'meals'];
      setKpiOrder(defaultKpi);
      setSwapSplitPanels(false);
      setDriverFilter('ALL');
      setResetTrigger((n) => n + 1);
      try {
        localStorage.removeItem('matibox_kpi_order');
      } catch {
        // ignore
      }
      await fetchAllData();
      setRefreshConfirmOpen(false);
      showToast('All assignments for today have been reset to default (Unassigned)!');
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

  const handleDeleteKg = async (id: number, name: string) => {
    if (!window.confirm(`Delete kindergarten "${name}"?`)) return;
    setActionError(null);
    try {
      await api.kindergartens.delete(id);
      await fetchAllData();
      showToast(`Deleted "${name}"`);
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

  const handleDeleteDriver = async (id: string, name: string) => {
    if (!window.confirm(`Delete driver "${name}"? Any assigned stops will return to the pool.`))
      return;
    setActionError(null);
    try {
      await api.drivers.delete(id);
      if (driverFilter === id) setDriverFilter('ALL');
      await fetchAllData();
      showToast(`Removed driver ${name}`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Dispatcher CRUD Handlers (Only Master Admin)
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

  const handleDeleteDispatcher = async (id: string, name: string) => {
    if (!window.confirm(`Delete dispatcher "${name}"?`)) return;
    setActionError(null);
    try {
      await api.dispatchers.delete(id);
      await fetchAllData();
      showToast(`Deleted dispatcher ${name}`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Car CRUD & Multi-Driver Assignment Handlers (No Duplicate button)
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

  const handleDeleteCar = async (id: number, name: string, plate: string) => {
    if (!window.confirm(`Delete car "${name} (${plate})"?`)) return;
    setActionError(null);
    try {
      await api.cars.delete(id);
      await fetchAllData();
      showToast(`Deleted car "${name}"`);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const renderKpiCard = (kpiId: KpiId) => {
    const configs: Record<
      KpiId,
      {
        label: string;
        value: React.ReactNode;
        sub: string;
        accentColor: string;
        onClick?: () => void;
        active?: boolean;
      }
    > = {
      total: {
        label: 'Total Kindergartens',
        value: totalStops,
        sub: `Scheduled for ${selectedDate}`,
        accentColor: theme === 'dark' ? '#60A5FA' : '#5A340F',
        onClick: () => setDriverFilter('ALL'),
        active: driverFilter === 'ALL'
      },
      unassigned: {
        label: 'Unassigned Pool',
        value: unassignedCount,
        sub: 'Drag stops to assign',
        accentColor: '#FCB900',
        onClick: () => setDriverFilter('UNASSIGNED'),
        active: driverFilter === 'UNASSIGNED'
      },
      transit: {
        label: 'Assigned / In Transit',
        value: inTransitCount,
        sub: 'Active on driver routes',
        accentColor: '#276EF1'
      },
      delivered: {
        label: 'Delivered Today',
        value: (
          <span>
            {deliveredCount}{' '}
            <span className="text-sm font-semibold opacity-60">/ {totalStops}</span>
          </span>
        ),
        sub: `${totalStops > 0 ? Math.round((deliveredCount / totalStops) * 100) : 0}% completion`,
        accentColor: '#16A34A'
      },
      meals: {
        label: 'Total Boxes / Units',
        value: totalCrates,
        sub: `Across ${drivers.length} active drivers`,
        accentColor: theme === 'dark' ? '#38BDF8' : '#865B31'
      }
    };

    const cfg = configs[kpiId];

    return (
      <div
        key={kpiId}
        draggable
        onDragStart={() => setDraggedKpi(kpiId)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleKpiDrop(kpiId)}
        className="transition-transform"
      >
        <MovableGlassPanel
          id={`admin_kpi_${kpiId}`}
          resetTrigger={resetTrigger}
          compactHandle
          allowMinimize={false}
          className={`cursor-pointer transition ${
            cfg.active ? 'ring-2 ring-[#276EF1]' : 'hover:border-[#276EF1]/50'
          }`}
          bodyClassName="px-4 pb-3.5 pt-0.5"
        >
          <div onClick={cfg.onClick}>
            <div
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {cfg.label}
            </div>
            <div
              className="text-2xl font-extrabold mt-0.5 tracking-tight"
              style={{ color: cfg.accentColor }}
            >
              {cfg.value}
            </div>
            <div className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--text-body)' }}>
              {cfg.sub}
            </div>
          </div>
        </MovableGlassPanel>
      </div>
    );
  };

  // Map Panel Component (reused in Split View left or right)
  const mapPanelNode = (
    <MovableGlassPanel
      id="admin_map_panel"
      resetTrigger={resetTrigger}
      allowExpand
      title={
        <span className="inline-flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#276EF1]" />
          <span>Oslo & Viken Live Delivery Map</span>
        </span>
      }
      subtitle="Each driver has a unique color • Online drivers share live GPS on map"
      headerRight={
        <button
          type="button"
          onClick={() => setSwapSplitPanels((s) => !s)}
          title="Swap Map & Queue Left/Right"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold liquid-glass-subtle hover:border-[#276EF1] transition cursor-pointer"
          style={{ color: 'var(--text-heading)' }}
        >
          <ArrowLeftRight className="w-3 h-3 text-[#276EF1]" />
          Swap Sides
        </button>
      }
      bodyClassName="p-4 space-y-3"
    >
      {/* Driver Filter Pills + Color Picker Swatches (ALSO ACT AS LIVE DRAG-AND-DROP TARGETS!) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => setDriverFilter('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            driverFilter === 'ALL'
              ? 'liquid-btn-orange'
              : 'liquid-glass-subtle hover:border-[#276EF1]/50'
          }`}
          style={driverFilter !== 'ALL' ? { color: 'var(--text-heading)' } : undefined}
        >
          All ({assignments.length})
        </button>

        <button
          onClick={() => setDriverFilter('UNASSIGNED')}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTarget('UNASSIGNED');
          }}
          onDragLeave={() => setDragOverTarget(null)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOverTarget(null);
            if (draggedAssignmentId !== null) {
              await handleAssignDriver(draggedAssignmentId, null);
              setDraggedAssignmentId(null);
            }
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
            dragOverTarget === 'UNASSIGNED' ? 'drop-zone-active scale-105' : ''
          } ${
            driverFilter === 'UNASSIGNED'
              ? 'liquid-btn-orange'
              : 'liquid-glass-subtle hover:border-[#276EF1]'
          }`}
          style={driverFilter !== 'UNASSIGNED' ? { color: 'var(--text-heading)' } : undefined}
        >
          Unassigned Pool ({unassignedCount})
        </button>

        {drivers.map((drv) => {
          const count = assignments.filter((a) => a.driverId === drv.id).length;
          const isDropActive = dragOverTarget === drv.id;
          const isSelected = driverFilter === drv.id;
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
                  await handleAssignDriver(draggedAssignmentId, drv.id);
                  setDraggedAssignmentId(null);
                }
              }}
              className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-xs font-bold transition ${
                isDropActive ? 'drop-zone-active scale-105' : ''
              } ${
                isSelected ? 'ring-2 ring-white shadow-lg' : 'liquid-glass-subtle'
              }`}
              style={
                isSelected
                  ? { backgroundColor: drv.color || '#276EF1', color: '#FFFFFF' }
                  : { color: 'var(--text-heading)' }
              }
            >
              {/* Instant Color Picker for this Driver */}
              <label
                title={`Change map color for ${drv.name}`}
                className="relative w-4 h-4 rounded-full border border-white/80 cursor-pointer shrink-0 shadow-sm overflow-hidden"
                style={{ backgroundColor: drv.color || '#276EF1' }}
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="color"
                  value={drv.color || '#276EF1'}
                  onChange={(e) => handleChangeDriverColor(drv.id, e.target.value)}
                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                />
              </label>

              <button
                type="button"
                onClick={() => setDriverFilter(drv.id)}
                className="cursor-pointer inline-flex items-center gap-1"
              >
                <span>
                  {drv.name.split(' ')[0]} ({count})
                </span>
                {drv.isOnline && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
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
        onAssignDriver={handleAssignDriver}
        onToggleDelivered={handleToggleDelivered}
        heightClass="h-[530px]"
      />
    </MovableGlassPanel>
  );

  // Queue Panel Component
  const queuePanelNode = (
    <MovableGlassPanel
      id="admin_queue_panel"
      resetTrigger={resetTrigger}
      allowExpand
      title={
        driverFilter === 'ALL'
          ? 'All Scheduled Deliveries'
          : driverFilter === 'UNASSIGNED'
          ? 'Unassigned Kindergarten Pool'
          : `${drivers.find((d) => d.id === driverFilter)?.name || 'Driver'}'s Route`
      }
      subtitle="Drag stops by grip handle to reorder or drop onto driver pills"
      headerRight={
        <div className="flex items-center gap-1.5">
          {driverFilter === 'UNASSIGNED' && unassignedCount > 0 && (
            <button
              onClick={handleSmartDistributePool}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full liquid-btn-orange text-[11px] font-bold cursor-pointer"
              title="Automatically distribute unassigned stops across drivers and optimize routes"
            >
              <Wand2 className="w-3 h-3" />
              Auto-Distribute
            </button>
          )}
          {driverFilter !== 'ALL' && driverFilter !== 'UNASSIGNED' && (
            <button
              onClick={() => handleOptimizeDriver(driverFilter)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full liquid-btn-orange text-[11px] font-bold cursor-pointer"
            >
              <Compass className="w-3 h-3" />
              Auto-Optimize
            </button>
          )}
        </div>
      }
      bodyClassName="divide-y divide-white/10 max-h-[580px] overflow-y-auto"
    >
      {loading ? (
        <div className="p-8 text-center text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          Loading deliveries...
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-8 text-center text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          No stops match the current filter.
        </div>
      ) : (
        filteredAssignments.map((a, idx) => {
          const k = a.kindergarten;
          const isSpecificDriverView = driverFilter !== 'ALL' && driverFilter !== 'UNASSIGNED';
          const isDraggingThis = draggedAssignmentId === a.id;
          const isDropTargetThis = dragOverStopId === a.id;
          const assignedDriver = drivers.find((d) => d.id === a.driverId);
          const badgeColor = assignedDriver?.color || a.driverColor || accentHex;

          return (
            <div
              key={a.id}
              draggable
              onDragStart={() => setDraggedAssignmentId(a.id)}
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
              className={`p-4 draggable-item cursor-grab active:cursor-grabbing ${
                isDraggingThis ? 'is-dragging' : ''
              } ${isDropTargetThis ? 'drop-zone-active' : ''} ${
                a.isDelivered ? 'bg-emerald-500/10' : 'hover:bg-white/10'
              }`}
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div
                    className="mt-1 opacity-70 hover:opacity-100 shrink-0"
                    style={{ color: accentHex }}
                    title="Drag stop to reorder or assign to a driver"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {a.driverId ? (
                    <span
                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 shadow-sm text-white"
                      style={{
                        backgroundColor: a.isDelivered ? '#16A34A' : badgeColor
                      }}
                    >
                      {a.isDelivered ? '✓' : `#${a.sequenceOrder || idx + 1}`}
                    </span>
                  ) : (
                    <span className="w-7 h-7 rounded-xl bg-[#FCB900]/25 text-[#FCB900] border border-[#FCB900]/50 flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5">
                      •
                    </span>
                  )}

                  <div className="min-w-0">
                    <h4
                      className={`text-sm font-extrabold leading-snug ${
                        a.isDelivered ? 'line-through opacity-60' : ''
                      }`}
                      style={{ color: 'var(--text-heading)' }}
                    >
                      {k.name}
                    </h4>

                    {k.contact && (
                      <a
                        href={`tel:${k.contact}`}
                        className="inline-flex items-center gap-1 text-xs font-bold hover:underline mt-0.5"
                        style={{ color: accentHex }}
                      >
                        <Phone className="w-3 h-3" />
                        {k.contact}
                      </a>
                    )}

                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-body)' }}>
                      {k.address}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-[#FCB900]/20 text-[#FCB900] border border-[#FCB900]/40 font-bold">
                        <Clock className="w-3 h-3" />
                        By {k.time}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg liquid-glass-subtle font-bold"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <Package className="w-3 h-3" style={{ color: accentHex }} />
                        {k.total} units
                      </span>
                      <a
                        href={k.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline font-bold"
                        style={{ color: accentHex }}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Maps
                      </a>
                    </div>
                  </div>
                </div>

                {/* Sequence Reorder Buttons */}
                {isSpecificDriverView && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveStop(driverFilter, idx, -1)}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1.5 rounded-xl liquid-glass-subtle hover:border-[#276EF1] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" style={{ color: 'var(--text-heading)' }} />
                    </button>
                    <button
                      onClick={() => handleMoveStop(driverFilter, idx, 1)}
                      disabled={idx === filteredAssignments.length - 1}
                      title="Move Down"
                      className="p-1.5 rounded-xl liquid-glass-subtle hover:border-[#276EF1] disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" style={{ color: 'var(--text-heading)' }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Bottom Action Row: Driver Selector + Delivered Toggle */}
              <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Driver:
                  </span>
                  <select
                    value={a.driverId || ''}
                    onChange={(e) => handleAssignDriver(a.id, e.target.value || null)}
                    className="text-xs font-bold liquid-glass-subtle rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    <option value="" className="text-slate-900">
                      -- Unassigned Pool --
                    </option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id} className="text-slate-900">
                        {d.name} ({d.car})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleToggleDelivered(a)}
                  disabled={!a.driverId}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 ${
                    a.isDelivered
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'liquid-glass-subtle hover:border-[#276EF1]'
                  }`}
                  style={!a.isDelivered ? { color: 'var(--text-heading)' } : undefined}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: a.isDelivered ? '#FFF' : accentHex }} />
                  {a.isDelivered ? 'Delivered' : 'Mark Delivered'}
                </button>
              </div>
            </div>
          );
        })
      )}
    </MovableGlassPanel>
  );

  return (
    <div className="min-h-screen flex flex-col pb-12">
      {/* Floating Apple Liquid Glass Top Navbar */}
      <header className="sticky top-0 z-40 px-3 sm:px-6 pt-3">
        <div className="max-w-7xl mx-auto liquid-glass-strong rounded-3xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <MatiboxLogo
            size="md"
            subtitle="Central Dispatch Hub: Maridalsveien 300, Oslo"
            badge={user?.role || 'Admin'}
            darkText={theme === 'dark'}
          />

          {/* Global Instant Search Input */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2"
              style={{ color: accentHex }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search kindergarten, phone, car..."
              className="w-full pl-9 pr-8 py-2 rounded-full liquid-glass-subtle text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
              style={{ color: 'var(--text-heading)' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100 cursor-pointer"
                style={{ color: 'var(--text-heading)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* SignalR Status Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                connected
                  ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
                  : 'bg-[#FCB900]/20 border-[#FCB900]/40 text-[#FCB900]'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${connected ? 'animate-pulse text-emerald-400' : ''}`} />
              <span className="hidden md:inline">{connected ? 'Live Sync' : 'Reconnecting'}</span>
            </div>

            {/* Date Picker */}
            <div className="relative flex items-center liquid-glass-subtle rounded-full px-3 py-1.5 text-xs font-bold">
              <Calendar className="w-3.5 h-3.5 mr-1.5" style={{ color: accentHex }} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent focus:outline-none text-xs font-bold"
                style={{ color: 'var(--text-heading)' }}
              />
            </div>

            {/* Refresh Data Button */}
            <button
              onClick={() => setRefreshConfirmOpen(true)}
              title="Restore all assignments for today to default (Unassigned)"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-glass-subtle hover:border-[#276EF1] text-xs font-bold transition cursor-pointer"
              style={{ color: 'var(--text-heading)' }}
            >
              <RefreshCw className="w-3.5 h-3.5" style={{ color: accentHex }} />
              <span>Refresh Data</span>
            </button>

            {/* Daylight / Uber Dark Glass Theme Toggle */}
            <button
              onClick={toggleTheme}
              title="Switch between Uber Black & Blue Dark Theme and Warm Daylight Theme"
              className="p-2 rounded-full liquid-glass-subtle hover:border-[#276EF1] transition cursor-pointer"
              style={{ color: 'var(--text-heading)' }}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#FCB900]" />
              ) : (
                <Moon className="w-4 h-4 text-[#276EF1]" />
              )}
            </button>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full liquid-btn-red text-xs font-bold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Status Toast */}
      {statusToast && (
        <div className="fixed bottom-5 right-5 z-50 liquid-glass-strong px-4 py-3 rounded-2xl border border-[#276EF1]/50 flex items-center gap-2 text-xs font-bold shadow-2xl animate-bounce">
          <Sparkles className="w-4 h-4 text-[#276EF1]" />
          <span style={{ color: 'var(--text-heading)' }}>{statusToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 pt-5 space-y-5">
        {actionError && (
          <div className="p-4 rounded-2xl liquid-glass border border-[#F01111]/40 text-[#F01111] text-sm font-bold flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="hover:opacity-75 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Draggable & Reorderable KPI Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {kpiOrder.map((kpiId) => renderKpiCard(kpiId))}
        </div>

        {/* Navigation & Mode Switcher Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 liquid-glass rounded-2xl p-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'dispatch'
                  ? 'liquid-btn-orange'
                  : 'hover:bg-white/20 dark:hover:bg-white/10'
              }`}
              style={activeTab !== 'dispatch' ? { color: 'var(--text-heading)' } : undefined}
            >
              <MapPin className="w-4 h-4" />
              Route Dispatch ({assignments.length})
            </button>

            <button
              onClick={() => setActiveTab('kindergartens')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'kindergartens'
                  ? 'liquid-btn-orange'
                  : 'hover:bg-white/20 dark:hover:bg-white/10'
              }`}
              style={activeTab !== 'kindergartens' ? { color: 'var(--text-heading)' } : undefined}
            >
              <Building2 className="w-4 h-4" />
              Kindergartens ({kindergartens.length})
            </button>

            <button
              onClick={() => setActiveTab('drivers')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'drivers'
                  ? 'liquid-btn-orange'
                  : 'hover:bg-white/20 dark:hover:bg-white/10'
              }`}
              style={activeTab !== 'drivers' ? { color: 'var(--text-heading)' } : undefined}
            >
              <Users className="w-4 h-4" />
              Drivers ({drivers.length})
            </button>

            <button
              onClick={() => setActiveTab('cars')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'cars'
                  ? 'liquid-btn-orange'
                  : 'hover:bg-white/20 dark:hover:bg-white/10'
              }`}
              style={activeTab !== 'cars' ? { color: 'var(--text-heading)' } : undefined}
            >
              <CarIcon className="w-4 h-4" />
              Cars ({cars.length})
            </button>

            <button
              onClick={() => setActiveTab('dispatchers')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
                activeTab === 'dispatchers'
                  ? 'liquid-btn-orange'
                  : 'hover:bg-white/20 dark:hover:bg-white/10'
              }`}
              style={activeTab !== 'dispatchers' ? { color: 'var(--text-heading)' } : undefined}
            >
              <ShieldCheck className="w-4 h-4" />
              Dispatchers ({dispatchers.length})
            </button>
          </div>

          {activeTab === 'dispatch' && (
            <div className="flex items-center gap-2 flex-wrap">
              {unassignedCount > 0 && (
                <button
                  onClick={handleSmartDistributePool}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-btn-espresso text-xs font-bold cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 text-[#FCB900]" />
                  Smart Auto-Assign Pool ({unassignedCount})
                </button>
              )}

              <div className="inline-flex items-center liquid-glass-subtle p-1 rounded-xl">
                <button
                  onClick={() => setDispatchMode('split')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    dispatchMode === 'split' ? 'liquid-btn-orange' : ''
                  }`}
                  style={dispatchMode !== 'split' ? { color: 'var(--text-heading)' } : undefined}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Split Map + Queue
                </button>
                <button
                  onClick={() => setDispatchMode('kanban')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    dispatchMode === 'kanban' ? 'liquid-btn-orange' : ''
                  }`}
                  style={dispatchMode !== 'kanban' ? { color: 'var(--text-heading)' } : undefined}
                >
                  <Columns3 className="w-3.5 h-3.5" />
                  Drag & Drop Kanban
                </button>
              </div>
            </div>
          )}

          {activeTab === 'kindergartens' && (
            <button
              onClick={openCreateKg}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Kindergarten
            </button>
          )}

          {activeTab === 'drivers' && (
            <button
              onClick={openCreateDriver}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Driver
            </button>
          )}

          {activeTab === 'cars' && (
            <button
              onClick={openCreateCar}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Car
            </button>
          )}

          {activeTab === 'dispatchers' && isMasterAdmin && (
            <button
              onClick={openCreateDispatcher}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Dispatcher
            </button>
          )}
        </div>

        {/* TAB 1A: SPLIT MAP + ROUTE DISPATCH + SEPARATE DRIVER ELEMENTS UNDER THE MAP */}
        {activeTab === 'dispatch' && dispatchMode === 'split' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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

            {/* UNDER THE MAP: SEPARATE ELEMENTS FOR EACH DRIVER ON THE ROUTE WITH KINDERGARTENS & PROGRESS */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <div>
                  <h2
                    className="text-base font-extrabold tracking-tight flex items-center gap-2"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    <Truck className="w-5 h-5 text-[#276EF1]" />
                    <span>Drivers on Route — Individual Route Progress & Kindergartens</span>
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Separate live element for each driver • Customize driver map color, track progress, and manage assigned kindergartens
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
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
                          await handleAssignDriver(draggedAssignmentId, drv.id);
                          setDraggedAssignmentId(null);
                        }
                      }}
                      className={`rounded-3xl transition ${
                        dragOverTarget === `UNDER_MAP_${drv.id}` ? 'drop-zone-active' : ''
                      }`}
                    >
                      <MovableGlassPanel
                        id={`under_map_driver_card_${drv.id}`}
                        resetTrigger={resetTrigger}
                        title={
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white shadow shrink-0"
                              style={{ backgroundColor: driverColor }}
                            />
                            <span>{drv.name}</span>
                            {drv.isOnline ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-extrabold">
                                <Radio className="w-2.5 h-2.5 animate-pulse" />
                                LIVE GPS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 text-[10px] font-bold">
                                Offline
                              </span>
                            )}
                          </div>
                        }
                        subtitle={`${drv.car || 'Unassigned Vehicle'} • ${drv.contact}`}
                        headerRight={
                          <div className="flex items-center gap-2">
                            {/* Driver Color Picker */}
                            <label
                              title="Change driver's map & route color"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full liquid-glass-subtle text-[11px] font-bold cursor-pointer hover:border-[#276EF1]"
                              style={{ color: 'var(--text-heading)' }}
                            >
                              <Palette className="w-3 h-3" style={{ color: driverColor }} />
                              <span>Color</span>
                              <input
                                type="color"
                                value={driverColor}
                                onChange={(e) => handleChangeDriverColor(drv.id, e.target.value)}
                                className="w-4 h-4 rounded-full cursor-pointer border-0 bg-transparent"
                              />
                            </label>

                            {drvTotal > 1 && (
                              <button
                                onClick={() => handleOptimizeDriver(drv.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white cursor-pointer shadow-sm"
                                style={{ backgroundColor: driverColor }}
                              >
                                <Compass className="w-3 h-3" />
                                Optimize
                              </button>
                            )}
                          </div>
                        }
                        bodyClassName="p-4 space-y-4"
                      >
                        {/* Driver Route Process / Progress Bar */}
                        <div className="p-3.5 rounded-2xl liquid-glass-subtle space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-extrabold" style={{ color: 'var(--text-heading)' }}>
                              Route Progress: {drvDone} / {drvTotal} Kindergartens ({drvPct}%)
                            </span>
                            <span className="font-extrabold" style={{ color: driverColor }}>
                              {drvUnitsRemaining} / {drvUnitsTotal} units left
                            </span>
                          </div>
                          <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${drvPct}%`,
                                backgroundColor: driverColor
                              }}
                            />
                          </div>
                        </div>

                        {/* Kindergartens Assigned to This Driver */}
                        <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                          {drvStops.length === 0 ? (
                            <div
                              className="p-6 rounded-2xl border-2 border-dashed border-white/15 text-center text-xs font-bold"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              No kindergartens assigned to {drv.name.split(' ')[0]} yet. Drag stops here or assign from the map/pool.
                            </div>
                          ) : (
                            drvStops.map((stop, idx) => {
                              const k = stop.kindergarten;
                              return (
                                <div
                                  key={stop.id}
                                  draggable
                                  onDragStart={() => setDraggedAssignmentId(stop.id)}
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
                                  className={`p-3 rounded-2xl liquid-glass-subtle flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing ${
                                    stop.isDelivered ? 'opacity-70 bg-emerald-500/10' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className="w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0 shadow-sm"
                                      style={{
                                        backgroundColor: stop.isDelivered ? '#16A34A' : driverColor
                                      }}
                                    >
                                      {stop.isDelivered ? '✓' : `#${stop.sequenceOrder || idx + 1}`}
                                    </span>

                                    <div className="min-w-0">
                                      <div
                                        className={`text-xs font-extrabold truncate ${
                                          stop.isDelivered ? 'line-through' : ''
                                        }`}
                                        style={{ color: 'var(--text-heading)' }}
                                      >
                                        {k.name}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 text-[11px] mt-0.5">
                                        {k.contact && (
                                          <a
                                            href={`tel:${k.contact}`}
                                            className="font-bold hover:underline"
                                            style={{ color: driverColor }}
                                          >
                                            {k.contact}
                                          </a>
                                        )}
                                        <span style={{ color: 'var(--text-muted)' }}>• By {k.time}</span>
                                        <span className="font-bold" style={{ color: 'var(--text-body)' }}>
                                          • {k.total} units
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleMoveStop(drv.id, idx, -1)}
                                      disabled={idx === 0}
                                      className="p-1 rounded-lg liquid-glass hover:border-[#276EF1] disabled:opacity-30 cursor-pointer"
                                      title="Move earlier"
                                    >
                                      <ArrowUp className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveStop(drv.id, idx, 1)}
                                      disabled={idx === drvStops.length - 1}
                                      className="p-1 rounded-lg liquid-glass hover:border-[#276EF1] disabled:opacity-30 cursor-pointer"
                                      title="Move later"
                                    >
                                      <ArrowDown className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleToggleDelivered(stop)}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer ${
                                        stop.isDelivered
                                          ? 'bg-emerald-600 text-white'
                                          : 'liquid-glass hover:border-[#276EF1]'
                                      }`}
                                    >
                                      {stop.isDelivered ? 'Done' : 'Deliver'}
                                    </button>
                                    <button
                                      onClick={() => handleAssignDriver(stop.id, null)}
                                      className="px-2 py-1 rounded-lg bg-[#F01111]/15 text-[#F01111] text-[10px] font-bold hover:bg-[#F01111]/25 cursor-pointer"
                                      title="Return to pool"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </MovableGlassPanel>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 1B: KANBAN DRAG-AND-DROP BOARD */}
        {activeTab === 'dispatch' && dispatchMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
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
                  await handleAssignDriver(draggedAssignmentId, null);
                  setDraggedAssignmentId(null);
                }
              }}
              className={`rounded-3xl transition ${
                dragOverTarget === 'UNASSIGNED_COL' ? 'drop-zone-active' : ''
              }`}
            >
              <MovableGlassPanel
                id="kanban_col_unassigned"
                resetTrigger={resetTrigger}
                title={
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FCB900]" />
                    <span>Unassigned Pool ({unassignedCount})</span>
                  </span>
                }
                subtitle="Drag stops from here into any Driver column"
                bodyClassName="p-3 space-y-2.5 max-h-[620px] overflow-y-auto"
              >
                {searchedAssignments
                  .filter((a) => !a.driverId)
                  .map((a) => {
                    const k = a.kindergarten;
                    return (
                      <div
                        key={a.id}
                        draggable
                        onDragStart={() => setDraggedAssignmentId(a.id)}
                        onDragEnd={() => {
                          setDraggedAssignmentId(null);
                          setDragOverTarget(null);
                        }}
                        className="p-3.5 rounded-2xl liquid-glass-subtle hover:border-[#276EF1] cursor-grab active:cursor-grabbing space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4
                              className="text-xs font-extrabold leading-snug"
                              style={{ color: 'var(--text-heading)' }}
                            >
                              {k.name}
                            </h4>
                            {k.contact && (
                              <a
                                href={`tel:${k.contact}`}
                                className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline"
                                style={{ color: accentHex }}
                              >
                                <Phone className="w-3 h-3" />
                                {k.contact}
                              </a>
                            )}
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-[#FCB900]/25 text-[#FCB900] text-[10px] font-extrabold shrink-0">
                            By {k.time}
                          </span>
                        </div>
                        <p className="text-[11px] truncate" style={{ color: 'var(--text-body)' }}>
                          {k.address}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span
                            className="text-[11px] font-bold"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            {k.total} units
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {drivers.map((d) => (
                              <button
                                key={d.id}
                                onClick={() => handleAssignDriver(a.id, d.id)}
                                className="px-2 py-0.5 rounded-lg text-white text-[10px] font-bold cursor-pointer"
                                style={{ backgroundColor: d.color || '#276EF1' }}
                                title={`Quick assign to ${d.name}`}
                              >
                                + {d.name.split(' ')[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </MovableGlassPanel>
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
                      await handleAssignDriver(draggedAssignmentId, drv.id);
                      setDraggedAssignmentId(null);
                    }
                  }}
                  className={`rounded-3xl transition ${
                    dragOverTarget === `COL_${drv.id}` ? 'drop-zone-active' : ''
                  }`}
                >
                  <MovableGlassPanel
                    id={`kanban_col_${drv.id}`}
                    resetTrigger={resetTrigger}
                    title={
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-white"
                          style={{ backgroundColor: drvColor }}
                        />
                        <span>
                          {drv.name} ({drvStops.length})
                        </span>
                      </span>
                    }
                    subtitle={`${drv.car} • ${drvMeals} units • ${drvDone}/${drvStops.length} done`}
                    headerRight={
                      <button
                        onClick={() => handleOptimizeDriver(drv.id)}
                        className="px-2.5 py-1 rounded-full text-white text-[10px] font-bold cursor-pointer"
                        style={{ backgroundColor: drvColor }}
                        title="Optimize driver route"
                      >
                        Optimize
                      </button>
                    }
                    bodyClassName="p-3 space-y-2.5 max-h-[620px] overflow-y-auto"
                  >
                    {drvStops.length === 0 ? (
                      <div
                        className="p-8 rounded-2xl border-2 border-dashed border-white/20 text-center text-xs font-bold"
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
                            onDragStart={() => setDraggedAssignmentId(a.id)}
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
                            className={`p-3.5 rounded-2xl liquid-glass-subtle hover:border-[#276EF1] cursor-grab active:cursor-grabbing space-y-1.5 ${
                              dragOverStopId === a.id ? 'drop-zone-active' : ''
                            } ${a.isDelivered ? 'opacity-70 bg-emerald-500/10' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                <span
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-extrabold shrink-0 text-white"
                                  style={{
                                    backgroundColor: a.isDelivered ? '#16A34A' : drvColor
                                  }}
                                >
                                  {a.isDelivered ? '✓' : `#${a.sequenceOrder || idx + 1}`}
                                </span>
                                <div>
                                  <h4
                                    className={`text-xs font-extrabold leading-snug ${
                                      a.isDelivered ? 'line-through' : ''
                                    }`}
                                    style={{ color: 'var(--text-heading)' }}
                                  >
                                    {k.name}
                                  </h4>
                                  {k.contact && (
                                    <a
                                      href={`tel:${k.contact}`}
                                      className="inline-flex items-center gap-1 text-[11px] font-bold hover:underline"
                                      style={{ color: drvColor }}
                                    >
                                      <Phone className="w-3 h-3" />
                                      {k.contact}
                                    </a>
                                  )}
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full bg-[#FCB900]/20 text-[#FCB900] text-[10px] font-bold shrink-0">
                                {k.time}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[11px]">
                              <span className="font-bold" style={{ color: 'var(--text-body)' }}>
                                {k.total} units
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleToggleDelivered(a)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold cursor-pointer ${
                                    a.isDelivered
                                      ? 'bg-emerald-600 text-white'
                                      : 'liquid-glass hover:border-[#276EF1]'
                                  }`}
                                >
                                  {a.isDelivered ? 'Delivered' : 'Mark Done'}
                                </button>
                                <button
                                  onClick={() => handleAssignDriver(a.id, null)}
                                  className="px-2 py-0.5 rounded-lg bg-[#F01111]/15 text-[#F01111] text-[10px] font-bold hover:bg-[#F01111]/25 cursor-pointer"
                                  title="Unassign back to pool"
                                >
                                  Release
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </MovableGlassPanel>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: KINDERGARTENS CRUD */}
        {activeTab === 'kindergartens' && (
          <MovableGlassPanel
            id="admin_kindergartens_table"
            resetTrigger={resetTrigger}
            title={`Registered Kindergartens (${filteredKindergartens.length})`}
            subtitle="Phone numbers are displayed directly underneath each kindergarten name"
            bodyClassName="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-white/15 text-[11px] font-extrabold uppercase tracking-wider bg-black/15"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3.5 px-4">Kindergarten & Phone</th>
                  <th className="py-3.5 px-4">Delivery Address</th>
                  <th className="py-3.5 px-4">Deadline (Time)</th>
                  <th className="py-3.5 px-4">Total Units</th>
                  <th className="py-3.5 px-4">Coordinates & Map</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {filteredKindergartens.map((kg) => (
                  <tr
                    key={kg.id}
                    className="hover:bg-white/10 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold" style={{ color: 'var(--text-heading)' }}>
                        {kg.name}
                      </div>
                      {kg.contact ? (
                        <a
                          href={`tel:${kg.contact}`}
                          className="inline-flex items-center gap-1 text-xs font-bold hover:underline mt-0.5"
                          style={{ color: accentHex }}
                        >
                          <Phone className="w-3 h-3" />
                          {kg.contact}
                        </a>
                      ) : (
                        <span className="text-[11px] opacity-50">No phone listed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium" style={{ color: 'var(--text-body)' }}>
                      {kg.address}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FCB900]/20 text-[#FCB900] border border-[#FCB900]/40">
                        <Clock className="w-3 h-3" />
                        {kg.time}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold" style={{ color: 'var(--text-heading)' }}>
                      {kg.total}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <a
                        href={kg.googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-bold hover:underline"
                        style={{ color: accentHex }}
                      >
                        {kg.latitude.toFixed(5)}, {kg.longitude.toFixed(5)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditKg(kg)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl liquid-glass-subtle hover:border-[#276EF1] text-xs font-bold transition cursor-pointer"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        <Edit3 className="w-3.5 h-3.5" style={{ color: accentHex }} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteKg(kg.id, kg.name)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F01111]/15 hover:bg-[#F01111]/25 text-[#F01111] text-xs font-bold transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </MovableGlassPanel>
        )}

        {/* TAB 3: DRIVERS CRUD (Includes Driver Map Color & Online GPS Status) */}
        {activeTab === 'drivers' && (
          <MovableGlassPanel
            id="admin_drivers_table"
            resetTrigger={resetTrigger}
            title={`Active Delivery Drivers (${drivers.length})`}
            subtitle="Manage driver accounts, custom route colors, live GPS status, and route progress"
            bodyClassName="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-white/15 text-[11px] font-extrabold uppercase tracking-wider bg-black/15"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3.5 px-4">Driver & Status</th>
                  <th className="py-3.5 px-4">Map Route Color</th>
                  <th className="py-3.5 px-4">Email & Phone</th>
                  <th className="py-3.5 px-4">Current Car(s)</th>
                  <th className="py-3.5 px-4">Today's Route</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {drivers.map((drv) => {
                  const drvStops = assignments.filter((a) => a.driverId === drv.id);
                  const drvDone = drvStops.filter((a) => a.isDelivered).length;
                  return (
                    <tr
                      key={drv.id}
                      className="hover:bg-white/10 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold" style={{ color: 'var(--text-heading)' }}>
                            {drv.name}
                          </span>
                          {drv.isOnline && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">
                              <Radio className="w-2.5 h-2.5 animate-pulse" />
                              ONLINE
                            </span>
                          )}
                        </div>
                        {drv.isOnline && drv.lastLatitude && drv.lastLongitude && (
                          <div className="text-[11px] text-emerald-400/90 mt-0.5">
                            GPS: {drv.lastLatitude.toFixed(4)}, {drv.lastLongitude.toFixed(4)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={drv.color || '#276EF1'}
                            onChange={(e) => handleChangeDriverColor(drv.id, e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-white/40 bg-transparent"
                            title="Pick custom color for this driver"
                          />
                          <div className="flex items-center gap-1">
                            {DRIVER_COLOR_SWATCHES.slice(0, 5).map((sw) => (
                              <button
                                key={sw}
                                type="button"
                                onClick={() => handleChangeDriverColor(drv.id, sw)}
                                className={`w-4 h-4 rounded-full border cursor-pointer transition ${
                                  drv.color === sw ? 'border-white scale-125' : 'border-transparent opacity-70 hover:opacity-100'
                                }`}
                                style={{ backgroundColor: sw }}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <div style={{ color: 'var(--text-body)' }}>{drv.email}</div>
                        <a
                          href={`tel:${drv.contact}`}
                          className="inline-flex items-center gap-1 font-bold hover:underline mt-0.5"
                          style={{ color: accentHex }}
                        >
                          <Phone className="w-3 h-3" />
                          {drv.contact}
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full liquid-glass-subtle text-xs font-bold">
                          <Truck className="w-3.5 h-3.5" style={{ color: drv.color || accentHex }} />
                          {drv.car || 'Unassigned Vehicle'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-extrabold" style={{ color: 'var(--text-heading)' }}>
                        {drvDone} / {drvStops.length} delivered
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => openEditDriver(drv)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl liquid-glass-subtle hover:border-[#276EF1] text-xs font-bold transition cursor-pointer"
                          style={{ color: 'var(--text-heading)' }}
                        >
                          <Edit3 className="w-3.5 h-3.5" style={{ color: accentHex }} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(drv.id, drv.name)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F01111]/15 hover:bg-[#F01111]/25 text-[#F01111] text-xs font-bold transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </MovableGlassPanel>
        )}

        {/* TAB 4: CARS FLEET CRUD (Multi-Driver Support, No Duplicate Function) */}
        {activeTab === 'cars' && (
          <MovableGlassPanel
            id="admin_cars_table"
            resetTrigger={resetTrigger}
            title={`Fleet Cars (${filteredCars.length})`}
            subtitle="Only Admin & Dispatchers can add, edit, or delete cars • Multiple drivers can share the same car"
            bodyClassName="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-white/15 text-[11px] font-extrabold uppercase tracking-wider bg-black/15"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3.5 px-4">Car Name</th>
                  <th className="py-3.5 px-4">Number Plate</th>
                  <th className="py-3.5 px-4">Drivers Currently Using This Car</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {filteredCars.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                      No cars found. Click "+ Add Car" above to add a vehicle.
                    </td>
                  </tr>
                ) : (
                  filteredCars.map((car) => {
                    const assignedDrivers = car.drivers || [];
                    const unassignedDriversForThisCar = drivers.filter(
                      (d) => !assignedDrivers.some((ad) => ad.id === d.id)
                    );

                    return (
                      <tr
                        key={car.id}
                        className="hover:bg-white/10 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-extrabold" style={{ color: 'var(--text-heading)' }}>
                          <span className="inline-flex items-center gap-2">
                            <CarIcon className="w-4 h-4" style={{ color: accentHex }} />
                            {car.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#FCB900]/20 text-[#FCB900] border border-[#FCB900]/45 text-xs font-extrabold tracking-wider">
                            {car.numberPlate}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {assignedDrivers.length === 0 ? (
                              <span className="text-xs opacity-60" style={{ color: 'var(--text-muted)' }}>
                                Available (No drivers attached)
                              </span>
                            ) : (
                              assignedDrivers.map((ad) => (
                                <span
                                  key={ad.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm"
                                  style={{ backgroundColor: ad.color || '#276EF1' }}
                                >
                                  <span>{ad.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDropCarForDriver(car.id, ad.id)}
                                    title={`Remove ${ad.name} from this car`}
                                    className="hover:opacity-75 cursor-pointer font-extrabold"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))
                            )}

                            {unassignedDriversForThisCar.length > 0 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleTakeCarForDriver(car.id, e.target.value);
                                  }
                                }}
                                className="text-xs font-bold liquid-glass-subtle rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#276EF1] cursor-pointer"
                                style={{ color: 'var(--text-heading)' }}
                              >
                                <option value="" className="text-slate-900">
                                  + Add Driver...
                                </option>
                                {unassignedDriversForThisCar.map((drv) => (
                                  <option key={drv.id} value={drv.id} className="text-slate-900">
                                    {drv.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditCar(car)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl liquid-glass-subtle hover:border-[#276EF1] text-xs font-bold transition cursor-pointer"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            <Edit3 className="w-3.5 h-3.5" style={{ color: accentHex }} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCar(car.id, car.name, car.numberPlate)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F01111]/15 hover:bg-[#F01111]/25 text-[#F01111] text-xs font-bold transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </MovableGlassPanel>
        )}

        {/* TAB 5: DISPATCHERS MANAGEMENT */}
        {activeTab === 'dispatchers' && (
          <MovableGlassPanel
            id="admin_dispatchers_table"
            resetTrigger={resetTrigger}
            title={`Dispatchers (${dispatchers.length})`}
            subtitle={
              isMasterAdmin
                ? 'Dispatchers have full administrative powers over routes, kindergartens, drivers, and cars, except they cannot create or delete dispatchers'
                : 'You are signed in as a Dispatcher • Only the Master Administrator can create or delete dispatchers'
            }
            bodyClassName="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr
                  className="border-b border-white/15 text-[11px] font-extrabold uppercase tracking-wider bg-black/15"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <th className="py-3.5 px-4">Dispatcher Name</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Phone Contact</th>
                  <th className="py-3.5 px-4">Role & Permissions</th>
                  {isMasterAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-sm">
                {dispatchers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isMasterAdmin ? 5 : 4}
                      className="py-8 text-center text-xs font-bold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      No additional dispatchers created yet.
                      {isMasterAdmin && ' Click "+ Add Dispatcher" above to create one.'}
                    </td>
                  </tr>
                ) : (
                  dispatchers.map((disp) => (
                    <tr key={disp.id} className="hover:bg-white/10 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold" style={{ color: 'var(--text-heading)' }}>
                        {disp.name}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-medium" style={{ color: 'var(--text-body)' }}>
                        {disp.email}
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold" style={{ color: accentHex }}>
                        {disp.contact || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#276EF1]/20 text-[#60A5FA] border border-[#276EF1]/40 text-xs font-bold">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Dispatcher (Full Dispatch Control)
                        </span>
                      </td>
                      {isMasterAdmin && (
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => openEditDispatcher(disp)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl liquid-glass-subtle hover:border-[#276EF1] text-xs font-bold transition cursor-pointer"
                            style={{ color: 'var(--text-heading)' }}
                          >
                            <Edit3 className="w-3.5 h-3.5" style={{ color: accentHex }} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteDispatcher(disp.id, disp.name)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#F01111]/15 hover:bg-[#F01111]/25 text-[#F01111] text-xs font-bold transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </MovableGlassPanel>
        )}
      </main>

      {/* REFRESH DATA CONFIRMATION POPUP MODAL */}
      {refreshConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <MovableGlassPanel
              id="modal_refresh_confirm"
              allowMinimize={false}
              title={
                <span className="inline-flex items-center gap-2 text-[#F01111]">
                  <AlertTriangle className="w-4 h-4 text-[#F01111]" />
                  <span>Refresh Data Confirmation</span>
                </span>
              }
              subtitle="Reset daily route assignments"
              headerRight={
                <button
                  onClick={() => setRefreshConfirmOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              }
              bodyClassName="p-6 space-y-5"
            >
              <div className="p-4 rounded-2xl bg-[#FCB900]/15 border border-[#FCB900]/40 flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-[#FCB900] shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-extrabold" style={{ color: 'var(--text-heading)' }}>
                    Are you sure? It will restore all the assignments for today.
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-body)' }}>
                    All kindergartens for {selectedDate} will be reset to default (Unassigned Pool — no driver assignments and no delivered status).
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/15">
                <button
                  type="button"
                  disabled={refreshingData}
                  onClick={() => setRefreshConfirmOpen(false)}
                  className="px-4 py-2.5 rounded-xl liquid-glass-subtle text-xs font-bold cursor-pointer"
                  style={{ color: 'var(--text-heading)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={refreshingData}
                  onClick={handleConfirmRefreshData}
                  className="px-5 py-2.5 rounded-xl liquid-btn-red text-xs font-extrabold uppercase tracking-wider cursor-pointer disabled:opacity-50"
                >
                  {refreshingData ? 'Resetting...' : 'Yes, Refresh Data'}
                </button>
              </div>
            </MovableGlassPanel>
          </div>
        </div>
      )}

      {/* KINDERGARTEN LIQUID GLASS MODAL */}
      {kgModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <MovableGlassPanel
              id="modal_kindergarten"
              allowMinimize={false}
              title={editingKg ? 'Edit Kindergarten' : 'Add New Kindergarten'}
              subtitle="Draggable Liquid Glass Modal"
              headerRight={
                <button
                  onClick={() => setKgModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              }
              bodyClassName="p-6"
            >
              <form onSubmit={handleSaveKg} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Kindergarten Name
                  </label>
                  <input
                    type="text"
                    required
                    value={kgForm.name}
                    onChange={(e) => setKgForm({ ...kgForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                    placeholder="e.g. Aker Brygge barnehage"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Address
                  </label>
                  <input
                    type="text"
                    required
                    value={kgForm.address}
                    onChange={(e) => setKgForm({ ...kgForm, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                    placeholder="Holmens gate 6, 0250 Oslo"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={kgForm.contact}
                      onChange={(e) => setKgForm({ ...kgForm, contact: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                      style={{ color: 'var(--text-heading)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Deliver By
                    </label>
                    <input
                      type="time"
                      required
                      value={kgForm.time}
                      onChange={(e) => setKgForm({ ...kgForm, time: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                      style={{ color: 'var(--text-heading)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Total Units
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={kgForm.total}
                      onChange={(e) => setKgForm({ ...kgForm, total: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                      style={{ color: 'var(--text-heading)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Latitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={kgForm.latitude}
                      onChange={(e) => setKgForm({ ...kgForm, latitude: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                      style={{ color: 'var(--text-heading)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Longitude
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={kgForm.longitude}
                      onChange={(e) => setKgForm({ ...kgForm, longitude: Number(e.target.value) })}
                      className="w-full px-3 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                      style={{ color: 'var(--text-heading)' }}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setKgModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl liquid-glass-subtle text-xs font-bold cursor-pointer"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                  >
                    {editingKg ? 'Save Changes' : 'Create Kindergarten'}
                  </button>
                </div>
              </form>
            </MovableGlassPanel>
          </div>
        </div>
      )}

      {/* DRIVER LIQUID GLASS MODAL */}
      {driverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <MovableGlassPanel
              id="modal_driver"
              allowMinimize={false}
              title={editingDriver ? 'Edit Driver Account' : 'Add New Driver'}
              subtitle="Customize driver details and route map color"
              headerRight={
                <button
                  onClick={() => setDriverModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              }
              bodyClassName="p-6"
            >
              <form onSubmit={handleSaveDriver} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={driverForm.name}
                    onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={driverForm.email}
                    onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    {editingDriver ? 'New Password (leave blank to keep current)' : 'Initial Password'}
                  </label>
                  <input
                    type="text"
                    required={!editingDriver}
                    value={driverForm.password}
                    onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                    placeholder={editingDriver ? 'Enter new password to replace old password' : 'Driver123!'}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Phone Number
                    </label>
                    <input
                      type="text"
                      required
                      value={driverForm.contact}
                      onChange={(e) => setDriverForm({ ...driverForm, contact: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                      style={{ color: 'var(--text-heading)' }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                      Map Route Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={driverForm.color}
                        onChange={(e) => setDriverForm({ ...driverForm, color: e.target.value })}
                        className="w-10 h-10 rounded-xl cursor-pointer border border-white/30 bg-transparent"
                      />
                      <span className="text-xs font-mono font-bold" style={{ color: 'var(--text-heading)' }}>
                        {driverForm.color}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setDriverModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl liquid-glass-subtle text-xs font-bold cursor-pointer"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                  >
                    {editingDriver ? 'Save Driver' : 'Create Driver'}
                  </button>
                </div>
              </form>
            </MovableGlassPanel>
          </div>
        </div>
      )}

      {/* DISPATCHER LIQUID GLASS MODAL (Master Admin Only) */}
      {dispatcherModalOpen && isMasterAdmin && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <MovableGlassPanel
              id="modal_dispatcher"
              allowMinimize={false}
              title={editingDispatcher ? 'Edit Dispatcher' : 'Create New Dispatcher'}
              subtitle="Dispatchers have full operational access except creating/deleting dispatchers"
              headerRight={
                <button
                  onClick={() => setDispatcherModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              }
              bodyClassName="p-6"
            >
              <form onSubmit={handleSaveDispatcher} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Dispatcher Name
                  </label>
                  <input
                    type="text"
                    required
                    value={dispatcherForm.name}
                    onChange={(e) => setDispatcherForm({ ...dispatcherForm, name: e.target.value })}
                    placeholder="e.g. Henrik Solberg"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={dispatcherForm.email}
                    onChange={(e) => setDispatcherForm({ ...dispatcherForm, email: e.target.value })}
                    placeholder="henrik@matibox.no"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    {editingDispatcher ? 'New Password (leave blank to keep current)' : 'Password'}
                  </label>
                  <input
                    type="text"
                    required={!editingDispatcher}
                    value={dispatcherForm.password}
                    onChange={(e) => setDispatcherForm({ ...dispatcherForm, password: e.target.value })}
                    placeholder={editingDispatcher ? 'Leave blank to keep existing' : 'Enter password'}
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Phone Contact
                  </label>
                  <input
                    type="text"
                    value={dispatcherForm.contact}
                    onChange={(e) => setDispatcherForm({ ...dispatcherForm, contact: e.target.value })}
                    placeholder="+47 900 00 000"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setDispatcherModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl liquid-glass-subtle text-xs font-bold cursor-pointer"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                  >
                    {editingDispatcher ? 'Save Dispatcher' : 'Create Dispatcher'}
                  </button>
                </div>
              </form>
            </MovableGlassPanel>
          </div>
        </div>
      )}

      {/* CAR LIQUID GLASS MODAL */}
      {carModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <MovableGlassPanel
              id="modal_car"
              allowMinimize={false}
              title={editingCar ? 'Edit Car' : 'Add New Car'}
              subtitle="Several drivers can take the same car simultaneously"
              headerRight={
                <button
                  onClick={() => setCarModalOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              }
              bodyClassName="p-6"
            >
              <form onSubmit={handleSaveCar} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Car Name
                  </label>
                  <input
                    type="text"
                    required
                    value={carForm.name}
                    onChange={(e) => setCarForm({ ...carForm, name: e.target.value })}
                    placeholder="e.g. VW ID.Buzz Cargo"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--text-body)' }}>
                    Number Plate
                  </label>
                  <input
                    type="text"
                    required
                    value={carForm.numberPlate}
                    onChange={(e) => setCarForm({ ...carForm, numberPlate: e.target.value })}
                    placeholder="e.g. EV 48291"
                    className="w-full px-3.5 py-2.5 rounded-2xl liquid-glass-subtle text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#276EF1]"
                    style={{ color: 'var(--text-heading)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-body)' }}>
                    Assigned Drivers (Multiple Allowed)
                  </label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto p-2.5 rounded-2xl liquid-glass-subtle">
                    {drivers.map((drv) => {
                      const checked = (carForm.driverIds || []).includes(drv.id);
                      return (
                        <label
                          key={drv.id}
                          className="flex items-center gap-2.5 text-xs font-bold cursor-pointer py-1"
                          style={{ color: 'var(--text-heading)' }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const current = carForm.driverIds || [];
                              const next = e.target.checked
                                ? [...current, drv.id]
                                : current.filter((id) => id !== drv.id);
                              setCarForm({ ...carForm, driverIds: next });
                            }}
                            className="rounded border-white/30"
                          />
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: drv.color || '#276EF1' }}
                          />
                          <span>{drv.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/15">
                  <button
                    type="button"
                    onClick={() => setCarModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl liquid-glass-subtle text-xs font-bold cursor-pointer"
                    style={{ color: 'var(--text-heading)' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl liquid-btn-orange text-xs font-extrabold uppercase tracking-wider cursor-pointer"
                  >
                    {editingCar ? 'Save Car' : 'Add Car'}
                  </button>
                </div>
              </form>
            </MovableGlassPanel>
          </div>
        </div>
      )}
    </div>
  );
};
