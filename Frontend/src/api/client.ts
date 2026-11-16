import {
  AuthResponse,
  Car,
  CreateDispatcherPayload,
  CreateDriverPayload,
  DeliveryAssignment,
  Dispatcher,
  Driver,
  Kindergarten,
  SaveCarPayload,
  SaveKindergartenPayload,
  UpdateDispatcherPayload,
  UpdateDriverPayload,
  User
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:5150' : '');

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('matibox_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.message) errorMessage = data.message;
    } catch {
      // ignore json parse errors
    }
    throw new Error(errorMessage);
  }
  if (res.status === 204) {
    return undefined as unknown as T;
  }
  return res.json();
}

export const api = {
  baseUrl: API_BASE,

  auth: {
    login: async (email: string, password: string): Promise<AuthResponse> => {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return handleResponse<AuthResponse>(res);
    },
    me: async (): Promise<User> => {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: getAuthHeaders()
      });
      return handleResponse<User>(res);
    }
  },

  kindergartens: {
    getAll: async (): Promise<Kindergarten[]> => {
      const res = await fetch(`${API_BASE}/api/kindergartens`, {
        headers: getAuthHeaders()
      });
      return handleResponse<Kindergarten[]>(res);
    },
    create: async (payload: SaveKindergartenPayload): Promise<Kindergarten> => {
      const res = await fetch(`${API_BASE}/api/kindergartens`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Kindergarten>(res);
    },
    update: async (id: number, payload: SaveKindergartenPayload): Promise<Kindergarten> => {
      const res = await fetch(`${API_BASE}/api/kindergartens/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Kindergarten>(res);
    },
    delete: async (id: number): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/kindergartens/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return handleResponse<void>(res);
    }
  },

  drivers: {
    getAll: async (): Promise<Driver[]> => {
      const res = await fetch(`${API_BASE}/api/drivers`, {
        headers: getAuthHeaders()
      });
      return handleResponse<Driver[]>(res);
    },
    create: async (payload: CreateDriverPayload): Promise<Driver> => {
      const res = await fetch(`${API_BASE}/api/drivers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Driver>(res);
    },
    update: async (id: string, payload: UpdateDriverPayload): Promise<Driver> => {
      const res = await fetch(`${API_BASE}/api/drivers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Driver>(res);
    },
    updateColor: async (id: string, color: string): Promise<Driver> => {
      const res = await fetch(`${API_BASE}/api/drivers/${id}/color`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ color })
      });
      return handleResponse<Driver>(res);
    },
    updateLocation: async (latitude: number, longitude: number): Promise<Driver> => {
      const res = await fetch(`${API_BASE}/api/drivers/location`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ latitude, longitude })
      });
      return handleResponse<Driver>(res);
    },
    goOffline: async (): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/drivers/offline`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return handleResponse<void>(res);
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/drivers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return handleResponse<void>(res);
    }
  },

  dispatchers: {
    getAll: async (): Promise<Dispatcher[]> => {
      const res = await fetch(`${API_BASE}/api/dispatchers`, {
        headers: getAuthHeaders()
      });
      return handleResponse<Dispatcher[]>(res);
    },
    create: async (payload: CreateDispatcherPayload): Promise<Dispatcher> => {
      const res = await fetch(`${API_BASE}/api/dispatchers`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Dispatcher>(res);
    },
    update: async (id: string, payload: UpdateDispatcherPayload): Promise<Dispatcher> => {
      const res = await fetch(`${API_BASE}/api/dispatchers/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Dispatcher>(res);
    },
    delete: async (id: string): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/dispatchers/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return handleResponse<void>(res);
    }
  },

  cars: {
    getAll: async (): Promise<Car[]> => {
      const res = await fetch(`${API_BASE}/api/cars`, {
        headers: getAuthHeaders()
      });
      return handleResponse<Car[]>(res);
    },
    create: async (payload: SaveCarPayload): Promise<Car> => {
      const res = await fetch(`${API_BASE}/api/cars`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Car>(res);
    },
    update: async (id: number, payload: SaveCarPayload): Promise<Car> => {
      const res = await fetch(`${API_BASE}/api/cars/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      return handleResponse<Car>(res);
    },
    take: async (id: number, driverId?: string): Promise<Car> => {
      const res = await fetch(`${API_BASE}/api/cars/${id}/take`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ driverId })
      });
      return handleResponse<Car>(res);
    },
    drop: async (id: number, driverId?: string): Promise<Car> => {
      const res = await fetch(`${API_BASE}/api/cars/${id}/drop`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ driverId })
      });
      return handleResponse<Car>(res);
    },
    delete: async (id: number): Promise<void> => {
      const res = await fetch(`${API_BASE}/api/cars/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      return handleResponse<void>(res);
    }
  },

  deliveries: {
    getByDate: async (date?: string): Promise<DeliveryAssignment[]> => {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/api/deliveries${query}`, {
        headers: getAuthHeaders()
      });
      return handleResponse<DeliveryAssignment[]>(res);
    },
    reset: async (date?: string): Promise<DeliveryAssignment[]> => {
      const query = date ? `?date=${encodeURIComponent(date)}` : '';
      const res = await fetch(`${API_BASE}/api/deliveries/reset${query}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return handleResponse<DeliveryAssignment[]>(res);
    },
    claim: async (id: number, lat?: number, lng?: number): Promise<DeliveryAssignment> => {
      const params = new URLSearchParams();
      if (lat !== undefined && lng !== undefined) {
        params.set('lat', String(lat));
        params.set('lng', String(lng));
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${API_BASE}/api/deliveries/${id}/claim${qs}`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return handleResponse<DeliveryAssignment>(res);
    },
    unclaim: async (id: number): Promise<DeliveryAssignment> => {
      const res = await fetch(`${API_BASE}/api/deliveries/${id}/unclaim`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      return handleResponse<DeliveryAssignment>(res);
    },
    assign: async (id: number, driverId: string | null): Promise<DeliveryAssignment> => {
      const res = await fetch(`${API_BASE}/api/deliveries/${id}/assign`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ driverId })
      });
      return handleResponse<DeliveryAssignment>(res);
    },
    optimize: async (params: {
      driverId?: string;
      date?: string;
      startLatitude?: number;
      startLongitude?: number;
    }): Promise<DeliveryAssignment[]> => {
      const res = await fetch(`${API_BASE}/api/deliveries/optimize`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(params)
      });
      return handleResponse<DeliveryAssignment[]>(res);
    },
    reorder: async (params: {
      driverId?: string;
      date?: string;
      orderedAssignmentIds: number[];
    }): Promise<DeliveryAssignment[]> => {
      const res = await fetch(`${API_BASE}/api/deliveries/reorder`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(params)
      });
      return handleResponse<DeliveryAssignment[]>(res);
    },
    toggleDelivered: async (id: number, isDelivered: boolean): Promise<DeliveryAssignment> => {
      const res = await fetch(`${API_BASE}/api/deliveries/${id}/toggle-delivered`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isDelivered })
      });
      return handleResponse<DeliveryAssignment>(res);
    }
  }
};
