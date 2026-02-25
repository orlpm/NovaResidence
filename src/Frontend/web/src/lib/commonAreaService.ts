import { apiClient } from './apiClient'

export enum CommonAreaType {
  Garden = 0,
  Lobby = 1,
  SharedParking = 2,
  InternalRoad = 3,
  Hallway = 4,
  Terrace = 5,
  Playground = 6,
  Rooftop = 7,
  Stairs = 8,
  ElevatorZone = 9,
  Other = 99
}

export const commonAreaTypeNames: Record<number, string> = {
  [CommonAreaType.Garden]: 'Jardín',
  [CommonAreaType.Lobby]: 'Lobby',
  [CommonAreaType.SharedParking]: 'Estacionamiento común',
  [CommonAreaType.InternalRoad]: 'Vialidad interna',
  [CommonAreaType.Hallway]: 'Pasillo',
  [CommonAreaType.Terrace]: 'Terraza',
  [CommonAreaType.Playground]: 'Área infantil',
  [CommonAreaType.Rooftop]: 'Azotea',
  [CommonAreaType.Stairs]: 'Escaleras',
  [CommonAreaType.ElevatorZone]: 'Zona de elevadores',
  [CommonAreaType.Other]: 'Otro'
}

export interface CommonAreaListDto {
  id: string
  condominiumId: string
  name: string
  description?: string | null
  type: CommonAreaType
  typeName: string
  buildingId?: string | null
  level?: string | null
  isActive: boolean
  coordinateX?: number | null
  coordinateY?: number | null
  imageUrlsJson?: string | null
  createdAt: string
}

export interface CommonAreaDetailDto extends CommonAreaListDto {
  updatedAt?: string | null
}

export interface CreateCommonAreaRequest {
  condominiumId: string
  name: string
  description?: string
  type: CommonAreaType
  buildingId?: string | null
  level?: string
  coordinateX?: number | null
  coordinateY?: number | null
  imageUrlsJson?: string | null
}

export interface UpdateCommonAreaRequest {
  name: string
  description?: string
  type: CommonAreaType
  buildingId?: string | null
  level?: string
  coordinateX?: number | null
  coordinateY?: number | null
  imageUrlsJson?: string | null
  isActive: boolean
}

export const commonAreaService = {
  async getByCondominium(condominiumId: string, includeInactive = false): Promise<CommonAreaListDto[]> {
    if (!condominiumId) return []
    const response = await apiClient.get<{ data: CommonAreaListDto[] }>(`/commonareas/condominium/${condominiumId}?includeInactive=${includeInactive}`)
    return response.data.data || []
  },

  async getById(id: string): Promise<CommonAreaDetailDto> {
    const response = await apiClient.get<{ data: CommonAreaDetailDto }>(`/commonareas/${id}`)
    return response.data.data
  },

  async create(request: CreateCommonAreaRequest): Promise<string> {
    const response = await apiClient.post<{ data: string }>('/commonareas', request)
    return response.data.data
  },

  async update(id: string, request: UpdateCommonAreaRequest): Promise<void> {
    await apiClient.put(`/commonareas/${id}`, request)
  },

  async setStatus(id: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/commonareas/${id}/status`, { isActive })
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/commonareas/${id}`)
  }
}
