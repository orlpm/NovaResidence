import { apiClient } from './apiClient';

export interface ClientListItem {
  id: string;
  name: string;
  description?: string;
  address: string;
  taxId?: string;
  legalName?: string;
  isActive: boolean;
  totalBuildings: number;
  totalUnits: number;
  totalUsers: number;
  createdAt: string;
  adminEmail?: string;
  adminName?: string;
}

export interface ClientDetail {
  id: string;
  name: string;
  description?: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  isActive: boolean;
  totalBuildings: number;
  totalUnits: number;
  createdAt: string;
  buildings: BuildingDetail[];
}

export interface BuildingDetail {
  id: string;
  name: string;
  description?: string;
  totalFloors: number;
  startsAtGroundFloor: boolean;
  totalUnits: number;
  units: UnitDetail[];
}

export interface UnitDetail {
  id: string;
  unitNumber: string;
  floor: number;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  hasOwner: boolean;
  hasRegisteredResident: boolean;
  totalResidents: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
}

export const clientManagementService = {
  // Get all clients (condominiums)
  getClients: async (): Promise<ClientListItem[]> => {
    try {
      const response = await apiClient.get<ApiResponse<ClientListItem[]>>('/condominiums');
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  },

  // Get client details by ID
  getClientDetail: async (id: string): Promise<ClientDetail> => {
    const response = await apiClient.get<ApiResponse<ClientDetail>>(`/condominiums/${id}`);
    if (!response.data?.data) {
      throw new Error('No se encontraron detalles del condominio');
    }
    return response.data.data;
  },

  // Activate client
  activateClient: async (id: string): Promise<void> => {
    await apiClient.post(`/condominiums/${id}/activate`);
  },

  // Deactivate (suspend) client
  deactivateClient: async (id: string): Promise<void> => {
    await apiClient.post(`/condominiums/${id}/deactivate`);
  },

  // Delete client (soft delete)
  deleteClient: async (id: string): Promise<void> => {
    await apiClient.delete(`/condominiums/${id}`);
  },

  // Update client
  updateClient: async (id: string, data: {
    name: string;
    description?: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
  }): Promise<void> => {
    await apiClient.put(`/condominiums/${id}`, data);
  },
};
