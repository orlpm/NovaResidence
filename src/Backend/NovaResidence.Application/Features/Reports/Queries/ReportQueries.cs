using MediatR;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Reports.Queries;

// ========== Financial Report ==========
public record FinancialReportDto(
    decimal TotalCharged,
    decimal TotalCollected,
    decimal TotalPending,
    decimal TotalOverdue,
    decimal CollectionRate,
    int TotalCharges,
    int PaidCharges,
    int PendingCharges,
    int OverdueCharges,
    int UnverifiedPayments,
    List<MonthlyTrendDto> MonthlyTrend,
    List<FeeTypeBreakdownDto> ByFeeType,
    List<PaymentMethodBreakdownDto> ByPaymentMethod,
    List<DelinquentUnitDto> DelinquentUnits
);

public record MonthlyTrendDto(int Month, int Year, string Label, decimal Charged, decimal Collected, decimal CollectionRate);
public record FeeTypeBreakdownDto(string FeeType, decimal Amount, decimal Collected, int Count);
public record PaymentMethodBreakdownDto(string Method, decimal Amount, int Count);
public record DelinquentUnitDto(string UnitNumber, string BuildingName, decimal OverdueAmount, int OverdueCharges, int DaysOverdue);

// ========== Operational Report ==========
public record OperationalReportDto(
    int TotalUnits,
    int OccupiedUnits,
    int VacantUnits,
    int UnderMaintenanceUnits,
    decimal OccupancyRate,
    int TotalBuildings,
    int TotalAmenities,
    int ActiveReservations,
    int TotalReservationsInPeriod,
    List<BuildingOccupancyDto> BuildingOccupancy,
    List<AmenityUsageDto> AmenityUsage,
    List<ReservationTrendDto> ReservationTrend
);

public record BuildingOccupancyDto(string BuildingName, int TotalUnits, int OccupiedUnits, decimal OccupancyRate);
public record AmenityUsageDto(string AmenityName, int ReservationCount, int TotalGuests, decimal Revenue);
public record ReservationTrendDto(int Month, int Year, string Label, int Count, int Completed, int Cancelled);

// ========== Residents Report ==========
public record ResidentReportDto(
    int TotalResidents,
    int Owners,
    int Tenants,
    int FamilyMembers,
    int ActiveResidents,
    int PendingInvitations,
    int NewResidentsInPeriod,
    int MovedOutInPeriod,
    List<ResidentTypeBreakdownDto> ByType,
    List<BuildingResidentDto> ByBuilding,
    List<MonthlyResidentTrendDto> MonthlyTrend
);

public record ResidentTypeBreakdownDto(string Type, int Count, decimal Percentage);
public record BuildingResidentDto(string BuildingName, int TotalResidents, int Owners, int Tenants);
public record MonthlyResidentTrendDto(int Month, int Year, string Label, int NewResidents, int MovedOut);

// ========== Incidents Report ==========
public record IncidentReportDto(
    int TotalIncidents,
    int OpenIncidents,
    int InProgressIncidents,
    int ResolvedIncidents,
    int ClosedIncidents,
    int CancelledIncidents,
    decimal AvgResolutionDays,
    List<IncidentTypeBreakdownDto> ByType,
    List<IncidentPriorityBreakdownDto> ByPriority,
    List<MonthlyIncidentTrendDto> MonthlyTrend,
    List<IncidentByBuildingDto> ByBuilding
);

public record IncidentTypeBreakdownDto(string Type, int Count, int Open, int Resolved);
public record IncidentPriorityBreakdownDto(string Priority, int Count, decimal Percentage);
public record MonthlyIncidentTrendDto(int Month, int Year, string Label, int Created, int Resolved);
public record IncidentByBuildingDto(string BuildingName, int Total, int Open, int Resolved);

// ========== Communications Report ==========
public record CommunicationsReportDto(
    int TotalAnnouncements,
    int PublishedAnnouncements,
    int TotalPolls,
    int ActivePolls,
    int TotalMeetings,
    int TotalForumPosts,
    List<AnnouncementTypeBreakdownDto> AnnouncementsByType,
    List<MonthlyCommunicationTrendDto> MonthlyTrend
);

public record AnnouncementTypeBreakdownDto(string Type, int Count);
public record MonthlyCommunicationTrendDto(int Month, int Year, string Label, int Announcements, int Polls, int Meetings, int ForumPosts);

// ========== Queries ==========
public record GetFinancialReportQuery(Guid CondominiumId, DateTime StartDate, DateTime EndDate) : IRequest<Result<FinancialReportDto>>;
public record GetOperationalReportQuery(Guid CondominiumId, DateTime StartDate, DateTime EndDate) : IRequest<Result<OperationalReportDto>>;
public record GetResidentReportQuery(Guid CondominiumId, DateTime StartDate, DateTime EndDate) : IRequest<Result<ResidentReportDto>>;
public record GetIncidentReportQuery(Guid CondominiumId, DateTime StartDate, DateTime EndDate) : IRequest<Result<IncidentReportDto>>;
public record GetCommunicationsReportQuery(Guid CondominiumId, DateTime StartDate, DateTime EndDate) : IRequest<Result<CommunicationsReportDto>>;
