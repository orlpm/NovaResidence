import { apiClient } from './apiClient'

export interface MonitoringSummaryDto {
  processStartedAt: string
  uptimeMinutes: number
  processMemoryMb: number
  totalUsers: number
  activeUsers: number
  totalCondominiums: number
  activeSubscriptions: number
  openIncidents: number
  pendingVisits: number
  unverifiedPayments: number
  databaseConnected: boolean
  pendingMigrations: number
  generatedAt: string
}

export interface SystemSettingsDto {
  maintenanceMode: boolean
  enableNewRegistrations: boolean
  sessionTimeoutMinutes: number
  supportEmail: string
  defaultTimeZone: string
  announcementBanner: string
  updatedAt: string
}

export interface UpdateSystemSettingsRequest {
  maintenanceMode: boolean
  enableNewRegistrations: boolean
  sessionTimeoutMinutes: number
  supportEmail: string
  defaultTimeZone: string
  announcementBanner?: string
}

export interface TableStatDto {
  table: string
  count: number
}

export interface DatabaseOverviewDto {
  provider: string
  canConnect: boolean
  appliedMigrationsCount: number
  pendingMigrationsCount: number
  pendingMigrations: string[]
  tableStats: TableStatDto[]
  generatedAt: string
}

export interface DatabaseMigrateResultDto {
  appliedCount: number
  appliedMigrations: string[]
  appliedAt: string
  message: string
}

export const superAdminService = {
  async getMonitoring(): Promise<MonitoringSummaryDto> {
    const response = await apiClient.get<MonitoringSummaryDto>('/superadmin/monitoring')
    return response.data
  },

  async getSystemSettings(): Promise<SystemSettingsDto> {
    const response = await apiClient.get<SystemSettingsDto>('/superadmin/system/settings')
    return response.data
  },

  async updateSystemSettings(request: UpdateSystemSettingsRequest): Promise<SystemSettingsDto> {
    const response = await apiClient.put<SystemSettingsDto>('/superadmin/system/settings', request)
    return response.data
  },

  async getDatabaseOverview(): Promise<DatabaseOverviewDto> {
    const response = await apiClient.get<DatabaseOverviewDto>('/superadmin/database')
    return response.data
  },

  async applyMigrations(): Promise<DatabaseMigrateResultDto> {
    const response = await apiClient.post<DatabaseMigrateResultDto>('/superadmin/database/migrate')
    return response.data
  }
}
