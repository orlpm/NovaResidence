import { apiClient } from './apiClient'

// Types for Amenity
export interface AmenityType {
  id: number
  name: string
  displayName: string
}

export interface AmenityListDto {
  id: string
  name: string
  description: string
  type: string
  typeId: number
  capacity: number
  requiresReservation: boolean
  requiresApproval: boolean
  isActive: boolean
  reservationFee: number | null
  openingTime: string
  closingTime: string
}

export interface AmenityDetailDto extends AmenityListDto {
  condominiumId: string
  minReservationHours: number
  maxReservationHours: number
  rules: string | null
  createdAt: string
}

export interface CreateAmenityRequest {
  condominiumId: string
  name: string
  description?: string
  type: number
  capacity: number
  requiresReservation: boolean
  requiresApproval?: boolean
  openingTime: string
  closingTime: string
  reservationFee?: number | null
  minReservationHours?: number
  maxReservationHours?: number
  rules?: string
}

export interface UpdateAmenityRequest {
  name: string
  description?: string
  capacity: number
  requiresReservation: boolean
  requiresApproval?: boolean
  openingTime: string
  closingTime: string
  reservationFee?: number | null
  minReservationHours?: number
  maxReservationHours?: number
  rules?: string
}

export interface CreateAmenityResponse {
  amenityId: string
  name: string
  type: string
  isActive: boolean
}

// API Service
export const amenityService = {
  // Get all amenities for a condominium
  async getByCondominium(condominiumId: string): Promise<AmenityListDto[]> {
    if (!condominiumId) {
      console.warn('getByCondominium called without condominiumId')
      return []
    }
    const response = await apiClient.get<{ data: AmenityListDto[] }>(
      `/amenities/condominium/${condominiumId}`
    )
    return response.data.data || []
  },

  // Get amenity by ID
  async getById(id: string): Promise<AmenityDetailDto> {
    if (!id) {
      throw new Error('Amenity ID is required')
    }
    const response = await apiClient.get<{ data: AmenityDetailDto }>(
      `/amenities/${id}`
    )
    return response.data.data
  },

  // Create a new amenity
  async create(request: CreateAmenityRequest): Promise<CreateAmenityResponse> {
    if (!request.condominiumId || !request.name) {
      throw new Error('Condominium ID and name are required')
    }
    const response = await apiClient.post<{ data: CreateAmenityResponse }>(
      '/amenities',
      request
    )
    return response.data.data
  },

  // Update an existing amenity
  async update(id: string, request: UpdateAmenityRequest): Promise<void> {
    await apiClient.put(`/amenities/${id}`, request)
  },

  // Delete an amenity
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/amenities/${id}`)
  },

  // Toggle amenity active status
  async toggleStatus(id: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/amenities/${id}/status`, { isActive })
  },

  // Get amenity types
  async getTypes(): Promise<AmenityType[]> {
    const response = await apiClient.get<{ data: AmenityType[] }>(
      '/amenities/types'
    )
    return response.data.data || []
  }
}

// Amenity type icons and colors for UI
export const amenityTypeConfig: Record<number, { icon: string; color: string; bgColor: string }> = {
  1: { icon: '🏊', color: 'text-blue-600', bgColor: 'bg-blue-100' },      // Pool
  2: { icon: '🏋️', color: 'text-purple-600', bgColor: 'bg-purple-100' }, // Gym
  3: { icon: '🎉', color: 'text-pink-600', bgColor: 'bg-pink-100' },      // Party Room
  4: { icon: '🎮', color: 'text-green-600', bgColor: 'bg-green-100' },    // Playground
  5: { icon: '⚽', color: 'text-orange-600', bgColor: 'bg-orange-100' },  // Sports Court
  6: { icon: '🍖', color: 'text-red-600', bgColor: 'bg-red-100' },        // BBQ Area
  7: { icon: '💼', color: 'text-gray-600', bgColor: 'bg-gray-100' },      // Conference Room
  8: { icon: '🎬', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },  // Theater
  99: { icon: '✨', color: 'text-teal-600', bgColor: 'bg-teal-100' }      // Other
}

export const getAmenityTypeConfig = (typeId: number) => {
  return amenityTypeConfig[typeId] || amenityTypeConfig[99]
}
