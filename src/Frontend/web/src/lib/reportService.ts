import { apiClient } from './apiClient';

// ========== Financial Report ==========
export interface MonthlyTrendDto {
  month: number;
  year: number;
  label: string;
  charged: number;
  collected: number;
  collectionRate: number;
}

export interface FeeTypeBreakdownDto {
  feeType: string;
  amount: number;
  collected: number;
  count: number;
}

export interface PaymentMethodBreakdownDto {
  method: string;
  amount: number;
  count: number;
}

export interface DelinquentUnitDto {
  unitNumber: string;
  buildingName: string;
  overdueAmount: number;
  overdueCharges: number;
  daysOverdue: number;
}

export interface FinancialReportDto {
  totalCharged: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  totalCharges: number;
  paidCharges: number;
  pendingCharges: number;
  overdueCharges: number;
  unverifiedPayments: number;
  monthlyTrend: MonthlyTrendDto[];
  byFeeType: FeeTypeBreakdownDto[];
  byPaymentMethod: PaymentMethodBreakdownDto[];
  delinquentUnits: DelinquentUnitDto[];
}

// ========== Operational Report ==========
export interface BuildingOccupancyDto {
  buildingName: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
}

export interface AmenityUsageDto {
  amenityName: string;
  reservationCount: number;
  totalGuests: number;
  revenue: number;
}

export interface ReservationTrendDto {
  month: number;
  year: number;
  label: string;
  count: number;
  completed: number;
  cancelled: number;
}

export interface OperationalReportDto {
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  underMaintenanceUnits: number;
  occupancyRate: number;
  totalBuildings: number;
  totalAmenities: number;
  activeReservations: number;
  totalReservationsInPeriod: number;
  buildingOccupancy: BuildingOccupancyDto[];
  amenityUsage: AmenityUsageDto[];
  reservationTrend: ReservationTrendDto[];
}

// ========== Residents Report ==========
export interface ResidentTypeBreakdownDto {
  type: string;
  count: number;
  percentage: number;
}

export interface BuildingResidentDto {
  buildingName: string;
  totalResidents: number;
  owners: number;
  tenants: number;
}

export interface MonthlyResidentTrendDto {
  month: number;
  year: number;
  label: string;
  newResidents: number;
  movedOut: number;
}

export interface ResidentReportDto {
  totalResidents: number;
  owners: number;
  tenants: number;
  familyMembers: number;
  activeResidents: number;
  pendingInvitations: number;
  newResidentsInPeriod: number;
  movedOutInPeriod: number;
  byType: ResidentTypeBreakdownDto[];
  byBuilding: BuildingResidentDto[];
  monthlyTrend: MonthlyResidentTrendDto[];
}

// ========== Incidents Report ==========
export interface IncidentTypeBreakdownDto {
  type: string;
  count: number;
  open: number;
  resolved: number;
}

export interface IncidentPriorityBreakdownDto {
  priority: string;
  count: number;
  percentage: number;
}

export interface MonthlyIncidentTrendDto {
  month: number;
  year: number;
  label: string;
  created: number;
  resolved: number;
}

export interface IncidentByBuildingDto {
  buildingName: string;
  total: number;
  open: number;
  resolved: number;
}

export interface IncidentReportDto {
  totalIncidents: number;
  openIncidents: number;
  inProgressIncidents: number;
  resolvedIncidents: number;
  closedIncidents: number;
  cancelledIncidents: number;
  avgResolutionDays: number;
  byType: IncidentTypeBreakdownDto[];
  byPriority: IncidentPriorityBreakdownDto[];
  monthlyTrend: MonthlyIncidentTrendDto[];
  byBuilding: IncidentByBuildingDto[];
}

// ========== Communications Report ==========
export interface AnnouncementTypeBreakdownDto {
  type: string;
  count: number;
}

export interface MonthlyCommunicationTrendDto {
  month: number;
  year: number;
  label: string;
  announcements: number;
  polls: number;
  meetings: number;
  forumPosts: number;
}

export interface CommunicationsReportDto {
  totalAnnouncements: number;
  publishedAnnouncements: number;
  totalPolls: number;
  activePolls: number;
  totalMeetings: number;
  totalForumPosts: number;
  announcementsByType: AnnouncementTypeBreakdownDto[];
  monthlyTrend: MonthlyCommunicationTrendDto[];
}

// ========== Service ==========
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export const reportService = {
  async getFinancialReport(condominiumId: string, startDate: Date, endDate: Date): Promise<FinancialReportDto> {
    const response = await apiClient.get<FinancialReportDto>(
      `/reports/financial/${condominiumId}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
    );
    return response.data;
  },

  async getOperationalReport(condominiumId: string, startDate: Date, endDate: Date): Promise<OperationalReportDto> {
    const response = await apiClient.get<OperationalReportDto>(
      `/reports/operational/${condominiumId}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
    );
    return response.data;
  },

  async getResidentReport(condominiumId: string, startDate: Date, endDate: Date): Promise<ResidentReportDto> {
    const response = await apiClient.get<ResidentReportDto>(
      `/reports/residents/${condominiumId}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
    );
    return response.data;
  },

  async getIncidentReport(condominiumId: string, startDate: Date, endDate: Date): Promise<IncidentReportDto> {
    const response = await apiClient.get<IncidentReportDto>(
      `/reports/incidents/${condominiumId}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
    );
    return response.data;
  },

  async getCommunicationsReport(condominiumId: string, startDate: Date, endDate: Date): Promise<CommunicationsReportDto> {
    const response = await apiClient.get<CommunicationsReportDto>(
      `/reports/communications/${condominiumId}?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`
    );
    return response.data;
  },
};
