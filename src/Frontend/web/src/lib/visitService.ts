import { apiClient } from './apiClient'

// Enums
export enum VisitType {
  Personal = 0,
  Delivery = 1,
  Service = 2,
  Contractor = 3,
  RealEstate = 4,
  Medical = 5,
  Other = 99
}

export enum VisitStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  CheckedIn = 3,
  CheckedOut = 4,
  Cancelled = 5,
  Expired = 6
}

// Display names for UI
export const visitTypeNames: Record<VisitType, string> = {
  [VisitType.Personal]: 'Personal',
  [VisitType.Delivery]: 'Entrega/Delivery',
  [VisitType.Service]: 'Servicio',
  [VisitType.Contractor]: 'Contratista',
  [VisitType.RealEstate]: 'Inmobiliaria',
  [VisitType.Medical]: 'Médica',
  [VisitType.Other]: 'Otro'
}

export const visitStatusNames: Record<VisitStatus, string> = {
  [VisitStatus.Pending]: 'Pendiente',
  [VisitStatus.Approved]: 'Aprobada',
  [VisitStatus.Rejected]: 'Rechazada',
  [VisitStatus.CheckedIn]: 'En el sitio',
  [VisitStatus.CheckedOut]: 'Finalizada',
  [VisitStatus.Cancelled]: 'Cancelada',
  [VisitStatus.Expired]: 'Expirada'
}

// DTOs
export interface VisitListDto {
  id: string
  condominiumId: string
  unitId: string
  requestedById: string
  visitorName: string
  visitorPhone: string | null
  visitorCount: number
  vehiclePlate: string | null
  type: VisitType
  typeName: string
  status: VisitStatus
  statusName: string
  purpose: string | null
  expectedArrival: string
  expectedDeparture: string | null
  checkInAt: string | null
  checkOutAt: string | null
  createdAt: string
}

export interface VisitDetailDto extends VisitListDto {
  visitorIdentification: string | null
  visitorEmail: string | null
  vehicleDescription: string | null
  notes: string | null
  checkedInById: string | null
  checkedOutById: string | null
  approvedById: string | null
  approvedAt: string | null
  rejectedById: string | null
  rejectedAt: string | null
  rejectionReason: string | null
}

// Request DTOs
export interface CreateVisitRequest {
  condominiumId: string
  unitId: string
  requestedById: string
  visitorName: string
  type: VisitType
  expectedArrival: string
  expectedDeparture?: string | null
  visitorIdentification?: string | null
  visitorPhone?: string | null
  visitorEmail?: string | null
  visitorCount?: number
  vehiclePlate?: string | null
  vehicleDescription?: string | null
  purpose?: string | null
  notes?: string | null
}

export interface UpdateVisitRequest {
  visitorName: string
  type: VisitType
  expectedArrival: string
  expectedDeparture?: string | null
  visitorIdentification?: string | null
  visitorPhone?: string | null
  visitorEmail?: string | null
  visitorCount?: number
  vehiclePlate?: string | null
  vehicleDescription?: string | null
  purpose?: string | null
  notes?: string | null
}

export interface VisitAccessPassDto {
  visitId: string
  visitorName: string
  accessCode: string
  validFrom: string
  validUntil: string
  status: VisitStatus
  statusName: string
  isUsable: boolean
}

export interface VisitAccessScanDto {
  visitId: string
  visitorName: string
  visitorCount: number
  vehiclePlate: string | null
  unitNumber: string | null
  purpose: string | null
  expectedArrival: string
  expectedDeparture: string | null
  status: VisitStatus
  statusName: string
  canCheckIn: boolean
  canCheckOut: boolean
  message: string | null
}

// API Service
export const visitService = {
  // Get visit by ID
  async getById(id: string): Promise<VisitDetailDto> {
    const response = await apiClient.get<{ data: VisitDetailDto }>(`/visits/${id}`)
    return response.data.data
  },

  // Get all visits for a condominium (admin/security)
  async getByCondominium(
    condominiumId: string,
    filters?: {
      status?: VisitStatus
      type?: VisitType
      fromDate?: string
      toDate?: string
    }
  ): Promise<VisitListDto[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.status !== undefined) params.append('status', filters.status.toString())
      if (filters?.type !== undefined) params.append('type', filters.type.toString())
      if (filters?.fromDate) params.append('fromDate', filters.fromDate)
      if (filters?.toDate) params.append('toDate', filters.toDate)

      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await apiClient.get<{ data: VisitListDto[] }>(
        `/visits/condominium/${condominiumId}${query}`
      )
      return response.data.data || []
    } catch (error: any) {
      if (error.response?.status === 404) return []
      throw error
    }
  },

  // Get visits for a unit
  async getByUnit(unitId: string): Promise<VisitListDto[]> {
    try {
      const response = await apiClient.get<{ data: VisitListDto[] }>(`/visits/unit/${unitId}`)
      return response.data.data || []
    } catch (error: any) {
      if (error.response?.status === 404) return []
      throw error
    }
  },

  // Get my visits (resident)
  async getMyVisits(userId: string): Promise<VisitListDto[]> {
    try {
      const response = await apiClient.get<{ data: VisitListDto[] }>(`/visits/my-visits/${userId}`)
      return response.data.data || []
    } catch (error: any) {
      if (error.response?.status === 404) return []
      throw error
    }
  },

  // Get today's visits (security)
  async getTodayVisits(condominiumId: string): Promise<VisitListDto[]> {
    try {
      const response = await apiClient.get<{ data: VisitListDto[] }>(`/visits/today/${condominiumId}`)
      return response.data.data || []
    } catch (error: any) {
      if (error.response?.status === 404) return []
      throw error
    }
  },

  // Create a new visit
  async create(request: CreateVisitRequest): Promise<string> {
    const response = await apiClient.post<{ data: string }>('/visits', request)
    return response.data.data
  },

  // Update a visit
  async update(id: string, request: UpdateVisitRequest): Promise<void> {
    await apiClient.put(`/visits/${id}`, request)
  },

  // Approve a visit
  async approve(id: string, approvedById: string): Promise<void> {
    await apiClient.post(`/visits/${id}/approve`, { approvedById })
  },

  // Reject a visit
  async reject(id: string, rejectedById: string, reason?: string): Promise<void> {
    await apiClient.post(`/visits/${id}/reject`, { rejectedById, reason })
  },

  // Check in a visitor
  async checkIn(id: string, securityGuardId: string): Promise<void> {
    await apiClient.post(`/visits/${id}/check-in`, { securityGuardId })
  },

  // Check out a visitor
  async checkOut(id: string, securityGuardId: string): Promise<void> {
    await apiClient.post(`/visits/${id}/check-out`, { securityGuardId })
  },

  // Cancel a visit
  async cancel(id: string): Promise<void> {
    await apiClient.post(`/visits/${id}/cancel`)
  },

  // Delete a visit
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/visits/${id}`)
  },

  // QR access pass (resident)
  async getAccessPass(id: string): Promise<VisitAccessPassDto> {
    const response = await apiClient.get<{ data: VisitAccessPassDto }>(`/visits/${id}/access-pass`)
    return response.data.data
  },

  // QR access validation (security)
  async scanAccessCode(code: string): Promise<VisitAccessScanDto> {
    const response = await apiClient.post<{ data: VisitAccessScanDto }>('/visits/access/scan', { code })
    return response.data.data
  },

  async checkInWithAccessCode(code: string): Promise<VisitAccessScanDto> {
    const response = await apiClient.post<{ data: VisitAccessScanDto }>('/visits/access/check-in', { code })
    return response.data.data
  },

  async checkOutWithAccessCode(code: string): Promise<VisitAccessScanDto> {
    const response = await apiClient.post<{ data: VisitAccessScanDto }>('/visits/access/check-out', { code })
    return response.data.data
  }
}
