export type UserRole = 'Admin' | 'Dispatcher' | 'Driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  contact: string;
  car?: string | null;
  color?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Kindergarten {
  id: number;
  name: string;
  address: string;
  contact: string;
  time: string; // "HH:mm" delivery deadline
  total: number; // number of meals/crates
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
}

export interface SaveKindergartenPayload {
  name: string;
  address: string;
  contact: string;
  time: string;
  total: number;
  latitude: number;
  longitude: number;
  googleMapsUrl?: string;
}

export interface Driver {
  id: string;
  name: string;
  email: string;
  contact: string;
  car: string;
  color: string;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  locationUpdatedAt?: string | null;
  isOnline: boolean;
}

export interface CreateDriverPayload {
  name: string;
  email: string;
  password: string;
  contact: string;
  car: string;
  color?: string;
}

export interface UpdateDriverPayload {
  name: string;
  email: string;
  password?: string;
  contact: string;
  car: string;
  color?: string;
}

export interface Dispatcher {
  id: string;
  name: string;
  email: string;
  contact: string;
}

export interface CreateDispatcherPayload {
  name: string;
  email: string;
  password: string;
  contact: string;
}

export interface UpdateDispatcherPayload {
  name: string;
  email: string;
  password?: string;
  contact: string;
}

export interface CarDriverInfo {
  id: string;
  name: string;
  color: string;
}

export interface Car {
  id: number;
  name: string;
  numberPlate: string;
  driverId: string | null;
  driverName: string | null;
  drivers: CarDriverInfo[];
}

export interface SaveCarPayload {
  name: string;
  numberPlate: string;
  driverIds?: string[];
}

export interface DeliveryAssignment {
  id: number;
  kindergartenId: number;
  kindergarten: Kindergarten;
  driverId: string | null;
  driverName: string | null;
  driverCar: string | null;
  driverColor?: string | null;
  deliveryDate: string; // "YYYY-MM-DD"
  sequenceOrder: number;
  isDelivered: boolean;
  deliveredAt: string | null;
}
