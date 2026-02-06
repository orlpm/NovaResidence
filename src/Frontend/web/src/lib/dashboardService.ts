import { apiClient } from './apiClient';

export interface DashboardStatsDto {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPercentage: number;
  totalResidents: number;
  activeResidents: number;
  pendingInvitations: number;
  openIncidents: number;
  inProgressIncidents: number;
  resolvedIncidentsThisMonth: number;
  totalPendingPayments: number;
  totalOverduePayments: number;
  pendingPaymentsCount: number;
  overduePaymentsCount: number;
  collectionRatePercentage: number;
  recentActivities: RecentActivityDto[];
}

export interface RecentActivityDto {
  id: string;
  type: 'incident' | 'payment' | 'resident' | 'reservation';
  title: string;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'overdue';
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class DashboardService {
  async getStats(condominiumId?: string, condominiumIds?: string[]): Promise<DashboardStatsDto> {
    // Build query string manually for array parameters
    const params = new URLSearchParams();
    if (condominiumId) {
      params.append('condominiumId', condominiumId);
    }
    if (condominiumIds && condominiumIds.length > 0) {
      condominiumIds.forEach(id => params.append('condominiumIds', id));
    }
    const queryString = params.toString();
    const url = queryString ? `/dashboard/stats?${queryString}` : '/dashboard/stats';
    const response = await apiClient.get<ApiResponse<DashboardStatsDto>>(url);
    return response.data.data;
  }

  async getUserStats(userId: string): Promise<DashboardStatsDto> {
    const response = await apiClient.get<ApiResponse<DashboardStatsDto>>(`/dashboard/stats/user/${userId}`);
    return response.data.data;
  }
}

export const dashboardService = new DashboardService();
