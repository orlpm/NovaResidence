import { apiClient } from './apiClient'

export interface ResidentDto {
  id: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  type: 'Owner' | 'Tenant' | 'FamilyMember' | 'Authorized'
  isRegistered: boolean
  isActive: boolean
  moveInDate?: string
  moveOutDate?: string
}

export interface ResidentWithUnitDto extends ResidentDto {
  unitId: string
  unitNumber: string
  buildingName: string
  condominiumId?: string
}

export interface CreateResidentRequest {
  unitId: string
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  type?: string
}

export interface UpdateResidentRequest {
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  type?: string
}

class ResidentService {
  /**
   * Get all residents for a unit
   */
  async getResidentsByUnit(unitId: string): Promise<ResidentDto[]> {
    const response = await apiClient.get<{ success: boolean; data: ResidentDto[] }>(`/residents/unit/${unitId}`)
    return response.data.data || []
  }

  /**
   * Get all residents for a condominium
   */
  async getResidentsByCondominium(condominiumId: string): Promise<ResidentWithUnitDto[]> {
    const response = await apiClient.get<{ success: boolean; data: ResidentWithUnitDto[] }>(`/residents/condominium/${condominiumId}`)
    return response.data.data || []
  }

  /**
   * Get a resident by ID
   */
  async getResidentById(id: string): Promise<ResidentDto> {
    const response = await apiClient.get<{ success: boolean; data: ResidentDto }>(`/residents/${id}`)
    return response.data.data
  }

  /**
   * Create a new resident
   */
  async createResident(data: CreateResidentRequest): Promise<{ id: string }> {
    const response = await apiClient.post<{ success: boolean; data: { id: string } }>('/residents', data)
    return response.data.data
  }

  /**
   * Update a resident
   */
  async updateResident(id: string, data: UpdateResidentRequest): Promise<void> {
    await apiClient.put(`/residents/${id}`, data)
  }

  /**
   * Delete (deactivate) a resident
   */
  async deleteResident(id: string): Promise<void> {
    await apiClient.delete(`/residents/${id}`)
  }

  /**
   * Generate invitation link for a resident
   */
  async sendInvitation(id: string): Promise<{ invitationUrl: string; token: string }> {
    const response = await apiClient.post<{ success: boolean; data: { invitationUrl: string; token: string } }>(`/residents/${id}/invite`)
    return response.data.data
  }

  /**
   * Verify an invitation token for a specific unit
   */
  async verifyInvitation(unitId: string, token: string): Promise<{
    success: boolean
    message?: string
    data: {
      firstName: string
      lastName: string
      email: string
      phoneNumber: string
      unitId: string
      unitNumber: string
      type: string
      residentId: string
    } | null
  }> {
    try {
      const response = await apiClient.get<{ success: boolean; data: any }>(`/residents/verify-invitation/${unitId}/${token}`)
      return { success: response.data.success, message: undefined, data: response.data.data }
    } catch (error: any) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Error al verificar la invitación',
        data: null
      }
    }
  }

  /**
   * Get resident information by user ID (for resident portal)
   * Returns resident data with unit information
   */
  async getResidentInfo(userId: string): Promise<ResidentWithUnitDto | null> {
    try {
      const response = await apiClient.get<{ success: boolean; data: ResidentWithUnitDto }>(`/residents/by-user/${userId}`)
      return response.data.data
    } catch (error) {
      console.error('Error getting resident info:', error)
      return null
    }
  }
}

export const residentService = new ResidentService()
