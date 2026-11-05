import { apiClient } from './apiClient'

export interface ProviderAppointmentDto {
  id: string
  condominiumId: string
  providerUserId: string
  title: string
  scheduledAt: string
  notes?: string | null
  status: number
  statusName: string
}

export interface ProviderOptionDto {
  id: string
  name: string
  email: string
}

export interface CondominiumDocumentDto {
  id: string
  condominiumId: string
  title: string
  documentType: number
  typeName: string
  fileName: string
  fileUrl: string
  createdAt: string
}

export const providerAppointmentService = {
  async getByCondominium(condominiumId: string): Promise<ProviderAppointmentDto[]> {
    const response = await apiClient.get<{ data: ProviderAppointmentDto[] }>(`/provider-appointments/condominium/${condominiumId}`)
    return response.data.data || []
  },

  async getByProvider(providerUserId: string): Promise<ProviderAppointmentDto[]> {
    const response = await apiClient.get<{ data: ProviderAppointmentDto[] }>(`/provider-appointments/provider/${providerUserId}`)
    return response.data.data || []
  },

  async getProviders(condominiumId: string): Promise<ProviderOptionDto[]> {
    const response = await apiClient.get<{ data: ProviderOptionDto[] }>(`/provider-appointments/providers/${condominiumId}`)
    return response.data.data || []
  },

  async create(request: {
    condominiumId: string
    providerUserId: string
    title: string
    scheduledAt: string
    notes?: string
  }): Promise<string> {
    const response = await apiClient.post<{ data: string }>('/provider-appointments', request)
    return response.data.data
  }
}

export interface PackageDto {
  id: string
  condominiumId: string
  unitId: string
  unitNumber: string
  carrier: string
  description: string
  trackingCode?: string | null
  status: number
  statusName: string
  receivedAt: string
}

export interface ParkingSpotDto {
  id: string
  condominiumId: string
  code: string
  assignedPlate?: string | null
  unitId?: string | null
  residentId?: string | null
  unitNumber?: string | null
  residentName?: string | null
}

export interface VehicleDto {
  id: string
  condominiumId: string
  unitId: string
  plate: string
  brand: string
  color?: string | null
  spotCode?: string | null
  residentId?: string | null
  residentName?: string | null
  unitNumber?: string | null
  relatedVisits: number
}

export interface SecurityRoundDto {
  id: string
  condominiumId: string
  area: string
  notes: string
  startedAt: string
}

export const packageService = {
  async getByCondominium(condominiumId: string): Promise<PackageDto[]> {
    const response = await apiClient.get<{ data: PackageDto[] }>(`/packages/condominium/${condominiumId}`)
    return response.data.data || []
  },
  async getByUnit(unitId: string): Promise<PackageDto[]> {
    const response = await apiClient.get<{ data: PackageDto[] }>(`/packages/unit/${unitId}`)
    return response.data.data || []
  },
  async create(request: { condominiumId: string; unitId: string; carrier: string; description: string; trackingCode?: string }): Promise<void> {
    await apiClient.post('/packages', request)
  }
}

export const parkingService = {
  async getSpots(condominiumId: string): Promise<ParkingSpotDto[]> {
    const response = await apiClient.get<{ data: ParkingSpotDto[] }>(`/parking/spots/${condominiumId}`)
    return response.data.data || []
  },
  async createSpot(condominiumId: string, code: string): Promise<void> {
    await apiClient.post('/parking/spots', { condominiumId, code })
  },
  async assignSpot(spotId: string, residentId: string | null): Promise<void> {
    await apiClient.put(`/parking/spots/${spotId}/assign`, { residentId })
  },
  async getVehicles(condominiumId: string): Promise<VehicleDto[]> {
    const response = await apiClient.get<{ data: VehicleDto[] }>(`/parking/vehicles/condominium/${condominiumId}`)
    return response.data.data || []
  },
  async getUnitVehicles(unitId: string): Promise<VehicleDto[]> {
    const response = await apiClient.get<{ data: VehicleDto[] }>(`/parking/vehicles/unit/${unitId}`)
    return response.data.data || []
  },
  async createVehicle(request: { condominiumId: string; unitId: string; plate: string; brand: string; color?: string; spotCode?: string; residentId?: string }): Promise<void> {
    await apiClient.post('/parking/vehicles', request)
  }
}

export const securityRoundService = {
  async getByCondominium(condominiumId: string): Promise<SecurityRoundDto[]> {
    const response = await apiClient.get<{ data: SecurityRoundDto[] }>(`/security-rounds/condominium/${condominiumId}`)
    return response.data.data || []
  },
  async create(request: { condominiumId: string; area: string; notes: string }): Promise<void> {
    await apiClient.post('/security-rounds', request)
  }
}

export const fineService = {
  async create(request: { condominiumId: string; unitId: string; concept: string; amount: number; description?: string }): Promise<void> {
    await apiClient.post('/fines', request)
  }
}

export const documentService = {
  async getByCondominium(condominiumId: string): Promise<CondominiumDocumentDto[]> {
    const response = await apiClient.get<{ data: CondominiumDocumentDto[] }>(`/documents/condominium/${condominiumId}`)
    return response.data.data || []
  },

  async upload(file: File): Promise<{ fileName: string; fileUrl: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<{ data: { fileName: string; fileUrl: string } }>('/documents/upload', formData)
    return response.data.data
  },

  async create(request: {
    condominiumId: string
    title: string
    documentType: number
    fileName: string
    fileUrl: string
  }): Promise<void> {
    await apiClient.post('/documents', request)
  }
}
