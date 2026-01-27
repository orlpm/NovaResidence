import { apiClient } from './apiClient'

// Enums
export enum IncidentType {
  Maintenance = 0,
  Security = 1,
  Noise = 2,
  Parking = 3,
  CommonArea = 4,
  Plumbing = 5,
  Electrical = 6,
  Structural = 7,
  Pest = 8,
  Other = 9
}

export enum IncidentPriority {
  Low = 0,
  Medium = 1,
  High = 2,
  Urgent = 3
}

export enum IncidentStatus {
  Open = 0,
  Acknowledged = 1,
  InProgress = 2,
  Resolved = 3,
  Closed = 4,
  Reopened = 5
}

// Type display names for UI
export const incidentTypeNames: Record<IncidentType, string> = {
  [IncidentType.Maintenance]: 'Mantenimiento',
  [IncidentType.Security]: 'Seguridad',
  [IncidentType.Noise]: 'Ruido',
  [IncidentType.Parking]: 'Estacionamiento',
  [IncidentType.CommonArea]: 'Áreas Comunes',
  [IncidentType.Plumbing]: 'Plomería',
  [IncidentType.Electrical]: 'Eléctrico',
  [IncidentType.Structural]: 'Estructural',
  [IncidentType.Pest]: 'Plagas',
  [IncidentType.Other]: 'Otro'
}

export const incidentPriorityNames: Record<IncidentPriority, string> = {
  [IncidentPriority.Low]: 'Baja',
  [IncidentPriority.Medium]: 'Media',
  [IncidentPriority.High]: 'Alta',
  [IncidentPriority.Urgent]: 'Urgente'
}

export const incidentStatusNames: Record<IncidentStatus, string> = {
  [IncidentStatus.Open]: 'Abierta',
  [IncidentStatus.Acknowledged]: 'Recibida',
  [IncidentStatus.InProgress]: 'En Progreso',
  [IncidentStatus.Resolved]: 'Resuelta',
  [IncidentStatus.Closed]: 'Cerrada',
  [IncidentStatus.Reopened]: 'Reabierta'
}

// DTOs
export interface IncidentCommentDto {
  id: string
  userId: string
  userName: string
  content: string
  isInternal: boolean
  createdAt: string
}

export interface IncidentAttachmentDto {
  id: string
  fileName: string
  fileUrl: string
  contentType: string | null
  fileSize: number | null
  createdAt: string
}

export interface IncidentListDto {
  id: string
  title: string
  type: IncidentType
  typeName: string
  priority: IncidentPriority
  priorityName: string
  status: IncidentStatus
  statusName: string
  unitNumber: string | null
  reportedByName: string
  assignedToName: string | null
  createdAt: string
  resolvedAt: string | null
}

export interface IncidentDetailDto extends IncidentListDto {
  condominiumId: string
  unitId: string | null
  reportedById: string
  assignedToId: string | null
  description: string
  location: string | null
  resolutionNotes: string | null
  acknowledgedAt: string | null
  inProgressAt: string | null
  estimatedCompletionDate: string | null
  estimatedCost: number | null
  actualCost: number | null
  comments: IncidentCommentDto[]
  attachments: IncidentAttachmentDto[]
}

// Request DTOs
export interface CreateIncidentRequest {
  condominiumId: string
  reportedById: string
  title: string
  description: string
  type: IncidentType
  priority: IncidentPriority
  unitId?: string | null
  location?: string | null
}

export interface UpdateIncidentRequest {
  title: string
  description: string
  type: IncidentType
  priority: IncidentPriority
  location?: string | null
}

export interface AssignIncidentRequest {
  assigneeId: string
}

export interface ResolveIncidentRequest {
  resolvedById: string
  resolutionNotes: string
  actualCost?: number | null
}

export interface ReopenIncidentRequest {
  reason: string
}

export interface AddCommentRequest {
  userId: string
  content: string
  isInternal?: boolean
}

// API Service
export const incidentService = {
  // Get incident by ID
  async getById(id: string): Promise<IncidentDetailDto> {
    const response = await apiClient.get<IncidentDetailDto>(`/incidents/${id}`)
    return response.data
  },

  // Get all incidents for a condominium
  async getByCondominium(
    condominiumId: string,
    filters?: {
      status?: IncidentStatus
      type?: IncidentType
      priority?: IncidentPriority
    }
  ): Promise<IncidentListDto[]> {
    try {
      const params = new URLSearchParams()
      if (filters?.status !== undefined) params.append('status', filters.status.toString())
      if (filters?.type !== undefined) params.append('type', filters.type.toString())
      if (filters?.priority !== undefined) params.append('priority', filters.priority.toString())

      const query = params.toString() ? `?${params.toString()}` : ''
      const response = await apiClient.get<IncidentListDto[]>(
        `/incidents/condominium/${condominiumId}${query}`
      )
      return response.data || []
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  // Get incidents by unit
  async getByUnit(unitId: string): Promise<IncidentListDto[]> {
    try {
      const response = await apiClient.get<IncidentListDto[]>(`/incidents/unit/${unitId}`)
      return response.data || []
    } catch (error: any) {
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  // Get incidents reported by a user
  async getMyIncidents(userId: string): Promise<IncidentListDto[]> {
    try {
      const response = await apiClient.get<IncidentListDto[]>(`/incidents/my-incidents/${userId}`)
      return response.data || []
    } catch (error: any) {
      // 404 means no incidents found - return empty array, not error
      if (error.response?.status === 404) {
        return []
      }
      throw error
    }
  },

  // Get incidents assigned to a user
  async getAssignedIncidents(userId: string): Promise<IncidentListDto[]> {
    const response = await apiClient.get<IncidentListDto[]>(`/incidents/assigned/${userId}`)
    return response.data
  },

  // Create a new incident
  async create(request: CreateIncidentRequest): Promise<string> {
    const response = await apiClient.post<string>('/incidents', request)
    return response.data
  },

  // Update an incident
  async update(id: string, request: UpdateIncidentRequest): Promise<void> {
    await apiClient.put(`/incidents/${id}`, request)
  },

  // Delete an incident
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/incidents/${id}`)
  },

  // Assign an incident to a user
  async assign(id: string, request: AssignIncidentRequest): Promise<void> {
    await apiClient.post(`/incidents/${id}/assign`, request)
  },

  // Acknowledge an incident
  async acknowledge(id: string): Promise<void> {
    await apiClient.post(`/incidents/${id}/acknowledge`)
  },

  // Start progress on an incident
  async startProgress(id: string): Promise<void> {
    await apiClient.post(`/incidents/${id}/start-progress`)
  },

  // Resolve an incident
  async resolve(id: string, request: ResolveIncidentRequest): Promise<void> {
    await apiClient.post(`/incidents/${id}/resolve`, request)
  },

  // Close an incident
  async close(id: string): Promise<void> {
    await apiClient.post(`/incidents/${id}/close`)
  },

  // Reopen an incident
  async reopen(id: string, request: ReopenIncidentRequest): Promise<void> {
    await apiClient.post(`/incidents/${id}/reopen`, request)
  },

  // Add a comment to an incident
  async addComment(id: string, request: AddCommentRequest): Promise<string> {
    const response = await apiClient.post<string>(`/incidents/${id}/comments`, request)
    return response.data
  }
}
