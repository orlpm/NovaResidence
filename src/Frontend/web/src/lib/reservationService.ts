import { apiClient } from './apiClient'

// Enums
export enum ReservationStatus {
  Pending = 0,
  Confirmed = 1,
  InProgress = 2,
  Rejected = 3,
  Cancelled = 4,
  Completed = 5,
  NoShow = 6
}

// Type display names for UI
export const reservationStatusNames: Record<ReservationStatus, string> = {
  [ReservationStatus.Pending]: 'Pendiente',
  [ReservationStatus.Confirmed]: 'Confirmada',
  [ReservationStatus.InProgress]: 'En progreso',
  [ReservationStatus.Rejected]: 'Rechazada',
  [ReservationStatus.Cancelled]: 'Cancelada',
  [ReservationStatus.Completed]: 'Completada',
  [ReservationStatus.NoShow]: 'No Presentado'
}

// DTOs
export interface ReservationListDto {
  id: string
  amenityName: string
  unitNumber: string
  residentName: string
  reservationDate: string
  startTime: string
  endTime: string
  status: ReservationStatus
  statusName: string
  numberOfGuests: number
  totalCost: number | null
  createdAt: string
}

export interface ReservationDetailDto extends ReservationListDto {
  condominiumId: string
  amenityId: string
  unitId: string
  residentId: string
  notes: string | null
  cancellationReason: string | null
  cancelledAt: string | null
  cancelledBy: string | null
}

// Request DTOs
export interface CreateReservationRequest {
  amenityId: string
  residentId: string
  unitId: string
  condominiumId: string
  reservationDate: string
  startTime: string
  endTime: string
  numberOfGuests: number
  notes?: string | null
}

export interface CancelReservationRequest {
  reason: string
}

export interface ApproveReservationRequest {
  approvedByUserId: string
}

export interface RejectReservationRequest {
  rejectedByUserId: string
  reason: string
}

// API Service
export const reservationService = {
  // Get reservations for a unit
  async getByUnit(unitId: string): Promise<ReservationListDto[]> {
    try {
      const response = await apiClient.get<ReservationListDto[]>(
        `/reservations/unit/${unitId}`
      )
      return response.data || []
    } catch (error: any) {
      // 404 means no reservations found - return empty array, not error
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  // Get reservations by resident
  async getByResident(residentId: string): Promise<ReservationListDto[]> {
    try {
      const response = await apiClient.get<ReservationListDto[]>(
        `/reservations/resident/${residentId}`
      )
      return response.data || []
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  // Get all reservations for a condominium
  async getByCondominium(condominiumId: string): Promise<ReservationListDto[]> {
    const response = await apiClient.get<ReservationListDto[]>(
      `/reservations/condominium/${condominiumId}`
    )
    return response.data
  },

  // Get a specific reservation
  async getById(id: string): Promise<ReservationDetailDto> {
    const response = await apiClient.get<ReservationDetailDto>(
      `/reservations/${id}`
    )
    return response.data
  },

  // Create a new reservation
  async create(request: CreateReservationRequest): Promise<string> {
    const response = await apiClient.post<string>('/reservations', request)
    return response.data
  },

  // Cancel a reservation
  async cancel(id: string, request: CancelReservationRequest): Promise<void> {
    await apiClient.post(`/reservations/${id}/cancel`, request)
  },

  // Approve a reservation
  async approve(id: string, request: ApproveReservationRequest): Promise<void> {
    await apiClient.post(`/reservations/${id}/approve`, request)
  },

  // Reject a reservation
  async reject(id: string, request: RejectReservationRequest): Promise<void> {
    await apiClient.post(`/reservations/${id}/reject`, request)
  },

  // Delete a reservation
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/reservations/${id}`)
  }
}
