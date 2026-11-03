using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Dashboard.Queries;

// DTOs
public record DashboardStatsDto(
    int TotalUnits,
    int OccupiedUnits,
    int VacantUnits,
    decimal OccupancyPercentage,
    int TotalResidents,
    int ActiveResidents,
    int PendingInvitations,
    int OpenIncidents,
    int InProgressIncidents,
    int ResolvedIncidentsThisMonth,
    decimal TotalPendingPayments,
    decimal TotalOverduePayments,
    int PendingPaymentsCount,
    int OverduePaymentsCount,
    decimal CollectionRatePercentage,
    List<RecentActivityDto> RecentActivities
);

public record RecentActivityDto(
    string Id,
    string Type, // "incident", "payment", "resident", "reservation"
    string Title,
    string Description,
    DateTime Timestamp,
    string Status // "completed", "pending", "overdue"
);

// Query
public record GetDashboardStatsQuery(Guid? CondominiumId = null, List<Guid>? CondominiumIds = null) : IRequest<Result<DashboardStatsDto>>;

// Handler
public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, Result<DashboardStatsDto>>
{
    private readonly IApplicationDbContext _context;

    public GetDashboardStatsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<DashboardStatsDto>> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
    {
        // Get all buildings for the condominium filter
        var buildingsQuery = _context.Buildings.Where(b => !b.IsDeleted);
        
        // Filter by specific condominium or list of condominiums
        if (request.CondominiumId.HasValue)
        {
            buildingsQuery = buildingsQuery.Where(b => b.CondominiumId == request.CondominiumId.Value);
        }
        else if (request.CondominiumIds != null && request.CondominiumIds.Count > 0)
        {
            buildingsQuery = buildingsQuery.Where(b => request.CondominiumIds.Contains(b.CondominiumId));
        }
        
        var buildingIds = await buildingsQuery.Select(b => b.Id).ToListAsync(cancellationToken);

        // Units stats
        var unitsQuery = _context.Units.Where(u => buildingIds.Contains(u.BuildingId) && !u.IsDeleted);
        var totalUnits = await unitsQuery.CountAsync(cancellationToken);
        
        // Residents stats
        var unitIds = await unitsQuery.Select(u => u.Id).ToListAsync(cancellationToken);
        var residentsQuery = _context.Residents.Where(r => unitIds.Contains(r.UnitId) && !r.IsDeleted);
        
        // Count occupied units as those with at least one active resident
        var occupiedUnitIds = await residentsQuery
            .Where(r => r.IsActive)
            .Select(r => r.UnitId)
            .Distinct()
            .ToListAsync(cancellationToken);
        var occupiedUnits = occupiedUnitIds.Count;
        var vacantUnits = totalUnits - occupiedUnits;
        var occupancyPercentage = totalUnits > 0 ? Math.Round((decimal)occupiedUnits / totalUnits * 100, 1) : 0;
        var totalResidents = await residentsQuery.CountAsync(r => r.IsRegistered, cancellationToken);
        var activeResidents = await residentsQuery.CountAsync(r => r.IsActive, cancellationToken);
        var pendingInvitations = await residentsQuery.CountAsync(r => !r.IsRegistered, cancellationToken);

        // Incidents stats
        var incidentsQuery = request.CondominiumId.HasValue
            ? _context.Incidents.Where(i => i.CondominiumId == request.CondominiumId.Value)
            : _context.Incidents.AsQueryable();
        
        var openIncidents = await incidentsQuery.CountAsync(i => 
            i.Status == IncidentStatus.Open || i.Status == IncidentStatus.Acknowledged, cancellationToken);
        var inProgressIncidents = await incidentsQuery.CountAsync(i => 
            i.Status == IncidentStatus.InProgress, cancellationToken);
        
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var resolvedThisMonth = await incidentsQuery.CountAsync(i => 
            (i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Closed) && 
            i.ResolvedAt >= startOfMonth, cancellationToken);

        // Billing stats
        var chargesQuery = request.CondominiumId.HasValue
            ? _context.Charges.Where(c => c.CondominiumId == request.CondominiumId.Value)
            : _context.Charges.AsQueryable();
        
        var pendingCharges = await chargesQuery
            .Where(c => c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.PartiallyPaid)
            .ToListAsync(cancellationToken);
        
        var overdueCharges = pendingCharges.Where(c => c.DueDate < DateTime.UtcNow).ToList();
        var pendingPaymentsCount = pendingCharges.Count;
        var overduePaymentsCount = overdueCharges.Count;
        var totalPending = pendingCharges.Sum(c => c.Amount - c.PaidAmount);
        var totalOverdue = overdueCharges.Sum(c => c.Amount - c.PaidAmount);
        
        // Collection rate (paid this month vs total due this month)
        var paidAmounts = await chargesQuery
            .Where(c => c.Status == ChargeStatus.Paid && c.UpdatedAt >= startOfMonth)
            .Select(c => c.Amount)
            .ToListAsync(cancellationToken);
        var dueAmounts = await chargesQuery
            .Where(c => c.DueDate >= startOfMonth && c.DueDate < startOfMonth.AddMonths(1))
            .Select(c => c.Amount)
            .ToListAsync(cancellationToken);
        var paidThisMonth = paidAmounts.Sum();
        var totalDueThisMonth = dueAmounts.Sum();
        var collectionRate = totalDueThisMonth > 0 ? Math.Round(paidThisMonth / totalDueThisMonth * 100, 1) : 100;

        // Recent activities
        var activities = new List<RecentActivityDto>();

        // Recent incidents
        var recentIncidents = await incidentsQuery
            .OrderByDescending(i => i.CreatedAt)
            .Take(5)
            .Select(i => new { i.Id, i.Title, i.Status, i.CreatedAt })
            .ToListAsync(cancellationToken);
        
        foreach (var incident in recentIncidents)
        {
            var status = incident.Status switch
            {
                IncidentStatus.Resolved or IncidentStatus.Closed => "completed",
                IncidentStatus.Open or IncidentStatus.Acknowledged => "pending",
                _ => "pending"
            };
            activities.Add(new RecentActivityDto(
                incident.Id.ToString(),
                "incident",
                "Incidencia reportada",
                incident.Title,
                incident.CreatedAt,
                status
            ));
        }

        // Recent residents
        var recentResidents = await residentsQuery
            .OrderByDescending(r => r.CreatedAt)
            .Take(5)
            .Select(r => new { r.Id, r.FirstName, r.LastName, r.IsRegistered, r.CreatedAt })
            .ToListAsync(cancellationToken);
        
        foreach (var resident in recentResidents)
        {
            activities.Add(new RecentActivityDto(
                resident.Id.ToString(),
                "resident",
                resident.IsRegistered ? "Residente registrado" : "Invitación enviada",
                $"{resident.FirstName} {resident.LastName}",
                resident.CreatedAt,
                resident.IsRegistered ? "completed" : "pending"
            ));
        }

        // Recent payments
        var recentPayments = await _context.Payments
            .Where(p => request.CondominiumId == null || 
                        _context.Charges.Any(c => c.Id == p.ChargeId && c.CondominiumId == request.CondominiumId))
            .OrderByDescending(p => p.PaymentDate)
            .Take(5)
            .Select(p => new { p.Id, p.Amount, p.PaymentDate })
            .ToListAsync(cancellationToken);
        
        foreach (var payment in recentPayments)
        {
            activities.Add(new RecentActivityDto(
                payment.Id.ToString(),
                "payment",
                "Pago recibido",
                $"${payment.Amount:N2}",
                payment.PaymentDate,
                "completed"
            ));
        }

        // Sort all activities by timestamp
        var sortedActivities = activities
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .ToList();

        return Result.Success(new DashboardStatsDto(
            totalUnits,
            occupiedUnits,
            vacantUnits,
            occupancyPercentage,
            totalResidents,
            activeResidents,
            pendingInvitations,
            openIncidents,
            inProgressIncidents,
            resolvedThisMonth,
            totalPending,
            totalOverdue,
            pendingPaymentsCount,
            overduePaymentsCount,
            collectionRate,
            sortedActivities
        ));
    }
}
