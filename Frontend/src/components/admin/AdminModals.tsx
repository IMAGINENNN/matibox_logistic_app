import React from 'react';
import {
  Car,
  Dispatcher,
  Driver,
  Kindergarten,
  SaveCarPayload,
  SaveKindergartenPayload
} from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface AdminModalsProps {
  // Kindergarten modal
  kgModalOpen: boolean;
  onCloseKgModal: () => void;
  editingKg: Kindergarten | null;
  kgForm: SaveKindergartenPayload;
  setKgForm: (v: SaveKindergartenPayload) => void;
  onSaveKg: (e: React.FormEvent) => void;

  // Driver modal
  driverModalOpen: boolean;
  onCloseDriverModal: () => void;
  editingDriver: Driver | null;
  driverForm: {
    name: string;
    email: string;
    password: string;
    contact: string;
    car: string;
    color: string;
  };
  setDriverForm: (v: {
    name: string;
    email: string;
    password: string;
    contact: string;
    car: string;
    color: string;
  }) => void;
  onSaveDriver: (e: React.FormEvent) => void;

  // Dispatcher modal
  isMasterAdmin: boolean;
  dispatcherModalOpen: boolean;
  onCloseDispatcherModal: () => void;
  editingDispatcher: Dispatcher | null;
  dispatcherForm: {
    name: string;
    email: string;
    password: string;
    contact: string;
  };
  setDispatcherForm: (v: {
    name: string;
    email: string;
    password: string;
    contact: string;
  }) => void;
  onSaveDispatcher: (e: React.FormEvent) => void;

  // Car modal
  carModalOpen: boolean;
  onCloseCarModal: () => void;
  editingCar: Car | null;
  carForm: SaveCarPayload;
  setCarForm: (v: SaveCarPayload) => void;
  drivers: Driver[];
  onSaveCar: (e: React.FormEvent) => void;
}

export const AdminModals: React.FC<AdminModalsProps> = ({
  kgModalOpen,
  onCloseKgModal,
  editingKg,
  kgForm,
  setKgForm,
  onSaveKg,
  driverModalOpen,
  onCloseDriverModal,
  editingDriver,
  driverForm,
  setDriverForm,
  onSaveDriver,
  isMasterAdmin,
  dispatcherModalOpen,
  onCloseDispatcherModal,
  editingDispatcher,
  dispatcherForm,
  setDispatcherForm,
  onSaveDispatcher,
  carModalOpen,
  onCloseCarModal,
  editingCar,
  carForm,
  setCarForm,
  drivers,
  onSaveCar
}) => {
  return (
    <>
      {/* KINDERGARTEN MODAL */}
      <Modal
        open={kgModalOpen}
        onClose={onCloseKgModal}
        title={editingKg ? 'Edit Kindergarten' : 'Add Kindergarten'}
        subtitle={
          editingKg
            ? 'Update kindergarten delivery details and coordinates'
            : 'Register a new kindergarten stop for daily routing'
        }
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={onSaveKg} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Kindergarten Name
            </label>
            <input
              type="text"
              required
              value={kgForm.name}
              onChange={(e) => setKgForm({ ...kgForm, name: e.target.value })}
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              placeholder="e.g. Aker Brygge barnehage"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Delivery Address
            </label>
            <input
              type="text"
              required
              value={kgForm.address}
              onChange={(e) => setKgForm({ ...kgForm, address: e.target.value })}
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              placeholder="Holmens gate 6, 0250 Oslo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Phone Number
              </label>
              <input
                type="text"
                value={kgForm.contact}
                onChange={(e) => setKgForm({ ...kgForm, contact: e.target.value })}
                className="input-field w-full px-3 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
                placeholder="+47 ..."
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Deliver By
              </label>
              <input
                type="time"
                required
                value={kgForm.time}
                onChange={(e) => setKgForm({ ...kgForm, time: e.target.value })}
                className="input-field w-full px-3 py-2.5 rounded-xl text-sm font-medium min-h-[42px] tabular-nums"
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Total Units
              </label>
              <input
                type="number"
                required
                min={1}
                value={kgForm.total}
                onChange={(e) => setKgForm({ ...kgForm, total: Number(e.target.value) })}
                className="input-field w-full px-3 py-2.5 rounded-xl text-sm font-medium min-h-[42px] tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Latitude
              </label>
              <input
                type="number"
                step="any"
                required
                value={kgForm.latitude}
                onChange={(e) => setKgForm({ ...kgForm, latitude: Number(e.target.value) })}
                className="input-field w-full px-3 py-2.5 rounded-xl text-sm font-medium min-h-[42px] tabular-nums"
              />
            </div>
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Longitude
              </label>
              <input
                type="number"
                step="any"
                required
                value={kgForm.longitude}
                onChange={(e) => setKgForm({ ...kgForm, longitude: Number(e.target.value) })}
                className="input-field w-full px-3 py-2.5 rounded-xl text-sm font-medium min-h-[42px] tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" onClick={onCloseKgModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingKg ? 'Save Changes' : 'Create Kindergarten'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DRIVER MODAL */}
      <Modal
        open={driverModalOpen}
        onClose={onCloseDriverModal}
        title={editingDriver ? 'Edit Driver Account' : 'Add New Driver'}
        subtitle="Configure driver credentials, contact info, and map route color"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={onSaveDriver} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Full Name
            </label>
            <input
              type="text"
              required
              value={driverForm.name}
              onChange={(e) => setDriverForm({ ...driverForm, name: e.target.value })}
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Email Address
            </label>
            <input
              type="email"
              required
              value={driverForm.email}
              onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              {editingDriver ? 'New Password (optional)' : 'Initial Password'}
            </label>
            <input
              type="text"
              required={!editingDriver}
              value={driverForm.password}
              onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
              placeholder={editingDriver ? 'Leave blank to keep current password' : 'Driver123!'}
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Phone Number
              </label>
              <input
                type="text"
                required
                value={driverForm.contact}
                onChange={(e) => setDriverForm({ ...driverForm, contact: e.target.value })}
                className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Route Map Color
              </label>
              <div className="flex items-center gap-2.5 input-field px-3 py-1.5 rounded-xl min-h-[42px]">
                <input
                  type="color"
                  aria-label="Route map color"
                  value={driverForm.color}
                  onChange={(e) => setDriverForm({ ...driverForm, color: e.target.value })}
                  className="w-7 h-7 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
                />
                <span
                  className="text-xs font-mono font-semibold"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {driverForm.color}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" onClick={onCloseDriverModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingDriver ? 'Save Driver' : 'Create Driver'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DISPATCHER MODAL (Master Admin Only) */}
      {isMasterAdmin && (
        <Modal
          open={dispatcherModalOpen}
          onClose={onCloseDispatcherModal}
          title={editingDispatcher ? 'Edit Dispatcher' : 'Create Dispatcher'}
          subtitle="Dispatchers manage daily operations except creating or deleting dispatchers"
          maxWidthClass="max-w-md"
        >
          <form onSubmit={onSaveDispatcher} className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Dispatcher Name
              </label>
              <input
                type="text"
                required
                value={dispatcherForm.name}
                onChange={(e) => setDispatcherForm({ ...dispatcherForm, name: e.target.value })}
                placeholder="e.g. Henrik Solberg"
                className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Email Address
              </label>
              <input
                type="email"
                required
                value={dispatcherForm.email}
                onChange={(e) => setDispatcherForm({ ...dispatcherForm, email: e.target.value })}
                placeholder="henrik@matibox.no"
                className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                {editingDispatcher ? 'New Password (optional)' : 'Password'}
              </label>
              <input
                type="text"
                required={!editingDispatcher}
                value={dispatcherForm.password}
                onChange={(e) =>
                  setDispatcherForm({ ...dispatcherForm, password: e.target.value })
                }
                placeholder={editingDispatcher ? 'Leave blank to keep existing' : 'Enter password'}
                className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: 'var(--text-body-color)' }}
              >
                Phone Contact
              </label>
              <input
                type="text"
                value={dispatcherForm.contact}
                onChange={(e) => setDispatcherForm({ ...dispatcherForm, contact: e.target.value })}
                placeholder="+47 900 00 000"
                className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
              />
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <Button variant="secondary" onClick={onCloseDispatcherModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                {editingDispatcher ? 'Save Dispatcher' : 'Create Dispatcher'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CAR MODAL */}
      <Modal
        open={carModalOpen}
        onClose={onCloseCarModal}
        title={editingCar ? 'Edit Vehicle' : 'Add Vehicle'}
        subtitle="Multiple drivers can share the same vehicle"
        maxWidthClass="max-w-md"
      >
        <form onSubmit={onSaveCar} className="space-y-4">
          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Vehicle Name
            </label>
            <input
              type="text"
              required
              value={carForm.name}
              onChange={(e) => setCarForm({ ...carForm, name: e.target.value })}
              placeholder="e.g. VW ID.Buzz Cargo"
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-medium min-h-[42px]"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Number Plate
            </label>
            <input
              type="text"
              required
              value={carForm.numberPlate}
              onChange={(e) => setCarForm({ ...carForm, numberPlate: e.target.value })}
              placeholder="e.g. EV 48291"
              className="input-field w-full px-3.5 py-2.5 rounded-xl text-sm font-mono font-semibold min-h-[42px]"
            />
          </div>

          <div>
            <label
              className="block text-xs font-semibold mb-1.5"
              style={{ color: 'var(--text-body-color)' }}
            >
              Assigned Drivers (Multiple Allowed)
            </label>
            <div className="space-y-1 max-h-44 overflow-y-auto p-2.5 rounded-xl surface-elevated border border-[var(--border-subtle)]">
              {drivers.map((drv) => {
                const checked = (carForm.driverIds || []).includes(drv.id);
                return (
                  <label
                    key={drv.id}
                    className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer py-1.5 px-2 rounded-lg hover:bg-[var(--surface-hover)] transition"
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
                      className="rounded border-[var(--border-strong)]"
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: drv.color || '#276EF1' }}
                    />
                    <span>{drv.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-[var(--border-subtle)]">
            <Button variant="secondary" onClick={onCloseCarModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              {editingCar ? 'Save Vehicle' : 'Add Vehicle'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
