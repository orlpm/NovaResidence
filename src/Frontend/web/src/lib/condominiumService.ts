import { apiClient } from './apiClient'
import type { OnboardingData } from '../components/onboarding/OnboardingWizard'

// API Request/Response types
export interface CreateCondominiumRequest {
  userId: string
  name: string
  description?: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  neighborhood?: string
  buildings: BuildingRequest[]
}

export interface BuildingRequest {
  name: string
  type?: string
  section?: string
  totalFloors: number
  startsAtGroundFloor?: boolean
  units: UnitRequest[]
}

export interface UnitRequest {
  unitNumber: string
  floor: number
  isCommercial: boolean
  area?: number
  bedrooms?: number
  bathrooms?: number
  monthlyMaintenanceFee?: number
}

export interface CreateCondominiumResponse {
  condominiumId: string
  name: string
  totalBuildings: number
  totalUnits: number
}

export interface UserCondominiumDto {
  id: string
  name: string
  description: string | null
  address: string
  isActive: boolean
  totalBuildings: number
  totalUnits: number
  createdAt: string
}

export interface GetCondominiumsResponse {
  condominiums: UserCondominiumDto[]
}

export interface UnitDto {
  id: string
  unitNumber: string
  floor: number
  area?: number
  bedrooms?: number
  bathrooms?: number
  hasOwner?: boolean
  hasRegisteredResident?: boolean
  totalResidents?: number
}

export interface BuildingDto {
  id: string
  name: string
  description?: string
  totalFloors: number
  startsAtGroundFloor: boolean
  totalUnits: number
  units: UnitDto[]
}

// Backend API returns this structure
export interface CondominiumApiResponse {
  id: string
  name: string
  description: string | null
  address: {
    street: string
    city: string
    state: string
    postalCode: string
    country: string
  }
  isActive: boolean
  totalBuildings: number
  totalUnits: number
  createdAt: string
  buildings: BuildingDto[]
}

// Frontend uses this flattened structure
export interface CondominiumDetailDto {
  id: string
  name: string
  description: string | null
  address: string
  street: string
  city: string
  state: string
  postalCode: string
  country: string
  isActive: boolean
  totalBuildings: number
  totalUnits: number
  createdAt: string
  buildings: BuildingDto[]
}

// Simple DTO for listing condominiums
export interface CondominiumDto {
  id: string
  name: string
  description: string | null
  address: string
  totalBuildings: number
  totalUnits: number
}

// Helper function to transform wizard data to API format
export function transformWizardDataToRequest(
  data: OnboardingData,
  userId: string
): CreateCondominiumRequest {
  return {
    userId,
    name: data.condominium.name,
    description: `Condominio ${data.condominium.name}`,
    street: data.condominium.address,
    city: data.condominium.city,
    state: data.condominium.state,
    postalCode: data.condominium.zipCode,
    country: 'México',
    neighborhood: '',
    buildings: data.buildings.map((building) => ({
      name: building.name,
      type: building.type,
      section: building.section || '',
      totalFloors: building.type === 'vertical' 
        ? Math.max(...building.units.map(u => u.floor || 1), 1)
        : 1,
      startsAtGroundFloor: building.startsAtGroundFloor || false,
      units: building.units.map((unit) => ({
        unitNumber: unit.number,
        floor: unit.floor || 1,
        isCommercial: unit.isCommercial,
        area: 50, // Default area
        bedrooms: 2, // Default
        bathrooms: 1, // Default
        monthlyMaintenanceFee: 100 // Default fee
      }))
    }))
  }
}

class CondominiumService {
  /**
   * Create a new condominium with all its buildings and units
   */
  async createCondominium(request: CreateCondominiumRequest): Promise<CreateCondominiumResponse> {
    const response = await apiClient.post<CreateCondominiumResponse>('/condominiums', request)
    return response.data
  }

  /**
   * Create a condominium from wizard data
   */
  async createFromWizardData(data: OnboardingData, userId: string): Promise<CreateCondominiumResponse> {
    const request = transformWizardDataToRequest(data, userId)
    return this.createCondominium(request)
  }

  /**
   * Get all condominiums for a user
   */
  async getUserCondominiums(userId?: string): Promise<UserCondominiumDto[]> {
    const url = userId ? `/condominiums/user/${userId}` : '/condominiums'
    const response = await apiClient.get<{ success: boolean; data: UserCondominiumDto[] }>(url)
    return response.data.data || []
  }

  /**
   * Get all condominiums for the current user
   */
  async getAllCondominiums(userId?: string): Promise<UserCondominiumDto[]> {
    const url = userId ? `/condominiums?userId=${userId}` : '/condominiums'
    const response = await apiClient.get<{ success: boolean; data: UserCondominiumDto[] }>(url)
    return response.data.data || []
  }

  /**
   * Get all condominiums (simple list)
   */
  async getCondominiums(userId: string): Promise<CondominiumDto[]> {
    const response = await apiClient.get<{ success: boolean; data: UserCondominiumDto[] }>(`/condominiums?userId=${userId}`)
    const condos = response.data.data || []
    return condos.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      address: c.address,
      totalBuildings: c.totalBuildings,
      totalUnits: c.totalUnits
    }))
  }

  /**
   * Check if user has any condominiums
   */
  async hasCondominiums(userId?: string): Promise<boolean> {
    try {
      const condominiums = await this.getUserCondominiums(userId)
      return condominiums.length > 0
    } catch (error) {
      console.error('Error checking condominiums:', error)
      return false
    }
  }

  async getCondominiumById(id: string): Promise<CondominiumDetailDto> {
    const response = await apiClient.get<{ success: boolean; data: CondominiumApiResponse }>(`/condominiums/${id}`)
    const apiData = response.data.data
    
    // Transform API response to frontend format
    return {
      id: apiData.id,
      name: apiData.name,
      description: apiData.description,
      address: `${apiData.address.street}, ${apiData.address.city}, ${apiData.address.state}`,
      street: apiData.address.street,
      city: apiData.address.city,
      state: apiData.address.state,
      postalCode: apiData.address.postalCode,
      country: apiData.address.country,
      isActive: apiData.isActive,
      totalBuildings: apiData.totalBuildings,
      totalUnits: apiData.totalUnits,
      createdAt: apiData.createdAt,
      buildings: apiData.buildings || []
    }
  }

  async updateCondominium(id: string, data: {
    name: string
    description?: string
    street: string
    city: string
    state: string
    postalCode: string
    country?: string
  }): Promise<void> {
    await apiClient.put(`/condominiums/${id}`, data)
  }

  async deleteCondominium(id: string): Promise<void> {
    await apiClient.delete(`/condominiums/${id}`)
  }

  // --- Building Management ---

  async addBuilding(condominiumId: string, data: { name: string; totalFloors: number; description?: string; startsAtGroundFloor?: boolean }): Promise<void> {
    await apiClient.post(`/buildings`, {
      condominiumId,
      name: data.name,
      totalFloors: data.totalFloors,
      description: data.description,
      startsAtGroundFloor: data.startsAtGroundFloor ?? false
    })
  }

  async deleteBuilding(buildingId: string): Promise<void> {
    await apiClient.delete(`/buildings/${buildingId}`)
  }

  // --- Unit Management ---

  async addUnit(buildingId: string, data: { unitNumber: string; floor: number; area?: number; bedrooms?: number; bathrooms?: number }): Promise<void> {
    await apiClient.post(`/units`, {
      buildingId,
      unitNumber: data.unitNumber,
      floor: data.floor,
      area: data.area,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms
    })
  }

  async updateUnit(unitId: string, data: { 
    unitNumber?: string
    floor?: number
    area?: number
    bedrooms?: number
    bathrooms?: number 
  }): Promise<void> {
    await apiClient.put(`/units/${unitId}`, data)
  }

  async deleteUnit(unitId: string): Promise<void> {
    await apiClient.delete(`/units/${unitId}`)
  }
}

export const condominiumService = new CondominiumService()
