import { apiClient } from './apiClient'

export enum MapScopeType {
  Level = 0,
  Building = 1,
  Section = 2,
  CustomGroup = 3
}

export enum CondominiumMarkerType {
  Amenity = 0,
  CommonArea = 1,
  Building = 2,
  HousingUnit = 3,
  CommercialUnit = 4,
  Generic = 99
}

export const markerTypeNames: Record<number, string> = {
  [CondominiumMarkerType.Amenity]: 'Amenidad',
  [CondominiumMarkerType.CommonArea]: 'Área común',
  [CondominiumMarkerType.Building]: 'Edificio',
  [CondominiumMarkerType.HousingUnit]: 'Vivienda',
  [CondominiumMarkerType.CommercialUnit]: 'Local comercial',
  [CondominiumMarkerType.Generic]: 'Genérico'
}

export interface CondominiumMapListDto {
  id: string
  condominiumId: string
  name: string
  description?: string | null
  scopeType: MapScopeType
  scopeTypeName: string
  scopeReference: string
  backgroundImageUrl?: string | null
  isActive: boolean
  createdAt: string
}

export interface CondominiumMapMarkerDto {
  id: string
  condominiumMapId: string
  label: string
  tooltip?: string | null
  markerType: CondominiumMarkerType
  markerTypeName: string
  markerColor: string
  coordinateX: number
  coordinateY: number
  layerName: string
  layerEnabledByDefault: boolean
  isActive: boolean
  amenityId?: string | null
  commonAreaId?: string | null
  buildingId?: string | null
  unitId?: string | null
  externalReference?: string | null
}

export interface CondominiumMapLayerDto {
  layerName: string
  enabledByDefault: boolean
  markerCount: number
}

export interface CondominiumMapDetailDto extends CondominiumMapListDto {
  updatedAt?: string | null
  markers: CondominiumMapMarkerDto[]
  layers: CondominiumMapLayerDto[]
}

export interface CreateCondominiumMapRequest {
  condominiumId: string
  name: string
  description?: string
  scopeType: MapScopeType
  scopeReference: string
  backgroundImageUrl?: string | null
}

export interface UpdateCondominiumMapRequest {
  name: string
  description?: string
  scopeType: MapScopeType
  scopeReference: string
  backgroundImageUrl?: string | null
  isActive: boolean
}

export interface CreateCondominiumMapMarkerRequest {
  label: string
  tooltip?: string
  markerType: CondominiumMarkerType
  markerColor: string
  coordinateX: number
  coordinateY: number
  layerName: string
  layerEnabledByDefault: boolean
  amenityId?: string | null
  commonAreaId?: string | null
  buildingId?: string | null
  unitId?: string | null
  externalReference?: string | null
}

export interface UpdateCondominiumMapMarkerRequest extends CreateCondominiumMapMarkerRequest {
  isActive: boolean
}

export const condominiumMapService = {
  async getByCondominium(condominiumId: string): Promise<CondominiumMapListDto[]> {
    if (!condominiumId) return []
    const response = await apiClient.get<{ data: CondominiumMapListDto[] }>(`/condominiummaps/condominium/${condominiumId}`)
    return response.data.data || []
  },

  async getById(id: string): Promise<CondominiumMapDetailDto> {
    const response = await apiClient.get<{ data: CondominiumMapDetailDto }>(`/condominiummaps/${id}`)
    return response.data.data
  },

  async create(request: CreateCondominiumMapRequest): Promise<string> {
    const response = await apiClient.post<{ data: string }>('/condominiummaps', request)
    return response.data.data
  },

  async uploadBackgroundImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<string>('/condominiummaps/upload-background', formData)
    return response.data
  },

  async update(id: string, request: UpdateCondominiumMapRequest): Promise<void> {
    await apiClient.put(`/condominiummaps/${id}`, request)
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/condominiummaps/${id}`)
  },

  async createMarker(mapId: string, request: CreateCondominiumMapMarkerRequest): Promise<string> {
    const response = await apiClient.post<{ data: string }>(`/condominiummaps/${mapId}/markers`, request)
    return response.data.data
  },

  async updateMarker(markerId: string, request: UpdateCondominiumMapMarkerRequest): Promise<void> {
    await apiClient.put(`/condominiummaps/markers/${markerId}`, request)
  },

  async deleteMarker(markerId: string): Promise<void> {
    await apiClient.delete(`/condominiummaps/markers/${markerId}`)
  }
}
