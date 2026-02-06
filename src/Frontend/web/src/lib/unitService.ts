import { apiClient } from './apiClient'

export interface UnitDto {
  id: string
  unitNumber: string
  floor: number
  area: number
  bedrooms: number
  bathrooms: number
  status: number
  monthlyMaintenanceFee: number
}

export const unitStatusNames: Record<number, string> = {
  0: 'Disponible',
  1: 'Ocupada',
  2: 'En Mantenimiento',
  3: 'Vacante'
}

class UnitService {
  async getById(unitId: string): Promise<UnitDto> {
    const response = await apiClient.get<{ success: boolean; data: UnitDto }>(`/units/${unitId}`)
    return response.data.data
  }
}

export const unitService = new UnitService()
