import { apiClient } from './apiClient'

export enum ProcedureType {
  Electricity = 0,
  Water = 1,
  Gas = 2,
  Internet = 3,
  Other = 99
}

export enum ProcedureStatus {
  Pending = 0,
  Completed = 1,
  Overdue = 2,
  Cancelled = 3
}

export const procedureTypeNames: Record<ProcedureType, string> = {
  [ProcedureType.Electricity]: 'Luz',
  [ProcedureType.Water]: 'Agua',
  [ProcedureType.Gas]: 'Gas',
  [ProcedureType.Internet]: 'Servicios',
  [ProcedureType.Other]: 'Otro'
}

export const procedureStatusNames: Record<ProcedureStatus, string> = {
  [ProcedureStatus.Pending]: 'Pendiente',
  [ProcedureStatus.Completed]: 'Completado',
  [ProcedureStatus.Overdue]: 'Vencido',
  [ProcedureStatus.Cancelled]: 'Cancelado'
}

export interface ProcedureDto {
  id: string
  condominiumId: string
  residentId: string
  residentName: string
  type: ProcedureType
  typeName: string
  title: string
  description: string
  requirements: string
  dueDate: string
  isMandatory: boolean
  status: ProcedureStatus
  statusName: string
  completedAt: string | null
  completionNotes: string | null
  createdAt: string
  createdById: string
}

export interface CreateProcedureRequest {
  condominiumId: string
  residentId: string
  procedureTemplateId?: string
  type: ProcedureType
  title: string
  description: string
  requirements?: string
  dueDate: string
  isMandatory: boolean
}

export interface UpdateProcedureRequest {
  type: ProcedureType
  title: string
  description: string
  requirements?: string
  dueDate: string
  isMandatory: boolean
}

export interface ProcedureTemplateDto {
  id: string
  code: string
  name: string
  authorityName: string
  description: string
  requirements: string
  type: ProcedureType
  typeName: string
  isMandatoryDefault: boolean
  countryId: string | null
  countryName: string | null
  stateId: string | null
  stateName: string | null
}

export const procedureService = {
  async getByCondominium(condominiumId: string, residentId?: string, status?: ProcedureStatus): Promise<ProcedureDto[]> {
    const params = new URLSearchParams()
    if (residentId) params.append('residentId', residentId)
    if (status !== undefined) params.append('status', status.toString())
    const query = params.toString() ? `?${params.toString()}` : ''

    const response = await apiClient.get<{ success: boolean; data: ProcedureDto[] }>(`/procedures/condominium/${condominiumId}${query}`)
    return response.data.data || []
  },

  async getByResidentUser(residentUserId: string): Promise<ProcedureDto[]> {
    const response = await apiClient.get<{ success: boolean; data: ProcedureDto[] }>(`/procedures/resident/${residentUserId}`)
    return response.data.data || []
  },

  async create(request: CreateProcedureRequest): Promise<string> {
    const response = await apiClient.post<{ success: boolean; data: string }>('/procedures', request)
    return response.data.data
  },

  async getTemplates(condominiumId?: string): Promise<ProcedureTemplateDto[]> {
    const query = condominiumId ? `?condominiumId=${encodeURIComponent(condominiumId)}` : ''
    const response = await apiClient.get<{ success: boolean; data: ProcedureTemplateDto[] }>(`/procedures/templates${query}`)
    return response.data.data || []
  },

  async update(id: string, request: UpdateProcedureRequest): Promise<void> {
    await apiClient.put(`/procedures/${id}`, request)
  },

  async complete(id: string, notes?: string): Promise<void> {
    await apiClient.post(`/procedures/${id}/complete`, { notes: notes || null })
  },

  async cancel(id: string): Promise<void> {
    await apiClient.post(`/procedures/${id}/cancel`)
  }
}
