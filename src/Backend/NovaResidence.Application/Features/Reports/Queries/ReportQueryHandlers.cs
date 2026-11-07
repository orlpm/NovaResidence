using Mediator;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;
using NovaResidence.Application.Features.Billing.Queries;
using System.Globalization;
using NovaResidence.Domain.Entities.Condominiums;
using IncidentPriority = NovaResidence.Domain.Enums.IncidentPriority;
using IncidentType = NovaResidence.Domain.Enums.IncidentType;
using IncidentStatus = NovaResidence.Domain.Enums.IncidentStatus;

namespace NovaResidence.Application.Features.Reports.Queries;

// ========== Helper ==========
internal static class ReportHelpers
{
    private static readonly CultureInfo ES = new("es-ES");
    public static string MonthLabel(int month, int year) =>
        $"{ES.DateTimeFormat.GetAbbreviatedMonthName(month)} {year}";

    public static string GetIncidentTypeName(IncidentType t) => t switch
    {
        IncidentType.Maintenance => "Mantenimiento",
        IncidentType.Plumbing => "Plomería",
        IncidentType.Electrical => "Eléctrico",
        IncidentType.Security => "Seguridad",
        IncidentType.Noise => "Ruido",
        IncidentType.Parking => "Estacionamiento",
        IncidentType.CommonArea => "Área Común",
        IncidentType.Cleaning => "Limpieza",
        IncidentType.Elevator => "Elevador",
        IncidentType.HVAC => "Climatización",
        IncidentType.Structural => "Estructural",
        IncidentType.Pest => "Plagas",
        _ => "Otro"
    };

    public static string GetIncidentPriorityName(IncidentPriority p) => p switch
    {
        IncidentPriority.Low => "Baja",
        IncidentPriority.Medium => "Media",
        IncidentPriority.High => "Alta",
        IncidentPriority.Critical => "Crítica",
        _ => p.ToString()
    };

    public static string GetResidentTypeName(ResidentType type) => type switch
    {
        ResidentType.Owner => "Propietario",
        ResidentType.Tenant => "Inquilino",
        ResidentType.FamilyMember => "Familiar",
        ResidentType.Authorized => "Autorizado",
        _ => "Otro"
    };

    public static string GetAnnouncementTypeName(AnnouncementType t) => t switch
    {
        AnnouncementType.General => "General",
        AnnouncementType.Circular => "Circular",
        AnnouncementType.MeetingMinutes => "Minutas",
        AnnouncementType.Emergency => "Emergencia",
        AnnouncementType.Maintenance => "Mantenimiento",
        AnnouncementType.Event => "Evento",
        AnnouncementType.PolicyChange => "Políticas",
        _ => t.ToString()
    };
}

// ========== Financial Report Handler ==========
public class GetFinancialReportQueryHandler : IRequestHandler<GetFinancialReportQuery, Result<FinancialReportDto>>
{
    private readonly IApplicationDbContext _context;
    public GetFinancialReportQueryHandler(IApplicationDbContext context) => _context = context;

    public async ValueTask<Result<FinancialReportDto>> Handle(GetFinancialReportQuery request, CancellationToken ct)
    {
        var charges = await _context.Charges
            .Include(c => c.Unit).ThenInclude(u => u.Building)
            .Where(c => c.CondominiumId == request.CondominiumId && !c.IsDeleted
                && c.DueDate >= request.StartDate && c.DueDate <= request.EndDate)
            .ToListAsync(ct);

        var payments = await _context.Payments
            .Include(p => p.Charge)
            .Where(p => p.Charge.CondominiumId == request.CondominiumId && !p.IsDeleted
                && p.PaymentDate >= request.StartDate && p.PaymentDate <= request.EndDate)
            .ToListAsync(ct);

        var chargeSnapshots = charges.Select(c => new
        {
            Charge = c,
            Outstanding = BillingEnumNames.GetOutstandingBalance(c.Status, c.DueDate, c.Balance),
            EffectiveStatus = BillingEnumNames.GetEffectiveStatus(c.Status, c.DueDate, c.Balance)
        }).ToList();

        var totalCharged = chargeSnapshots.Sum(c => c.Charge.Amount);
        var totalCollected = chargeSnapshots.Sum(c => c.Charge.PaidAmount);
        var totalPending = chargeSnapshots
            .Where(c => c.EffectiveStatus == ChargeStatus.Pending || c.EffectiveStatus == ChargeStatus.PartiallyPaid)
            .Sum(c => c.Outstanding);
        var totalOverdue = chargeSnapshots
            .Where(c => c.EffectiveStatus == ChargeStatus.Overdue)
            .Sum(c => c.Outstanding);
        var collectionRate = totalCharged > 0 ? Math.Round(totalCollected / totalCharged * 100, 1) : 0;
        var unverifiedPayments = payments.Count(p => !p.IsVerified && !p.IsRefunded);

        // Monthly trend (last 6 months within range)
        var monthlyTrend = charges
            .GroupBy(c => new { c.BillingPeriodMonth, c.BillingPeriodYear })
            .Select(g =>
            {
                var charged = g.Sum(c => c.Amount);
                var collected = g.Sum(c => c.PaidAmount);
                return new MonthlyTrendDto(g.Key.BillingPeriodMonth, g.Key.BillingPeriodYear,
                    ReportHelpers.MonthLabel(g.Key.BillingPeriodMonth, g.Key.BillingPeriodYear),
                    charged, collected, charged > 0 ? Math.Round(collected / charged * 100, 1) : 0);
            })
            .OrderBy(m => m.Year).ThenBy(m => m.Month)
            .ToList();

        // By fee type
        var byFeeType = charges
            .GroupBy(c => c.FeeType)
            .Select(g => new FeeTypeBreakdownDto(
                BillingEnumNames.GetFeeTypeName(g.Key),
                g.Sum(c => c.Amount), g.Sum(c => c.PaidAmount), g.Count()))
            .OrderByDescending(f => f.Amount).ToList();

        // By payment method
        var byMethod = payments
            .Where(p => !p.IsRefunded)
            .GroupBy(p => p.PaymentMethod)
            .Select(g => new PaymentMethodBreakdownDto(
                BillingEnumNames.GetPaymentMethodName(g.Key),
                g.Sum(p => p.Amount), g.Count()))
            .OrderByDescending(m => m.Amount).ToList();

        // Delinquent units (top 10)
        var now = DateTime.UtcNow;
        var delinquent = chargeSnapshots
            .Where(c => c.EffectiveStatus == ChargeStatus.Overdue)
            .GroupBy(c => new { c.Charge.Unit.UnitNumber, BuildingName = c.Charge.Unit.Building!.Name })
            .Select(g => new DelinquentUnitDto(g.Key.UnitNumber, g.Key.BuildingName,
                g.Sum(c => c.Outstanding), g.Count(),
                (int)(now - g.Min(c => c.Charge.DueDate)).TotalDays))
            .OrderByDescending(d => d.OverdueAmount)
            .Take(10).ToList();

        return Result.Success(new FinancialReportDto(
            totalCharged, totalCollected, totalPending, totalOverdue, collectionRate,
            chargeSnapshots.Count, chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Paid),
            chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Pending || c.EffectiveStatus == ChargeStatus.PartiallyPaid),
            chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Overdue),
            unverifiedPayments, monthlyTrend, byFeeType, byMethod, delinquent));
    }
}

// ========== Operational Report Handler ==========
public class GetOperationalReportQueryHandler : IRequestHandler<GetOperationalReportQuery, Result<OperationalReportDto>>
{
    private readonly IApplicationDbContext _context;
    public GetOperationalReportQueryHandler(IApplicationDbContext context) => _context = context;

    public async ValueTask<Result<OperationalReportDto>> Handle(GetOperationalReportQuery request, CancellationToken ct)
    {
        var buildings = await _context.Buildings
            .Where(b => b.CondominiumId == request.CondominiumId && !b.IsDeleted)
            .ToListAsync(ct);
        var buildingIds = buildings.Select(b => b.Id).ToList();

        var units = await _context.Units
            .Include(u => u.Building)
            .Where(u => buildingIds.Contains(u.BuildingId) && !u.IsDeleted)
            .ToListAsync(ct);
        var unitIds = units.Select(u => u.Id).ToList();

        var residents = await _context.Residents
            .Where(r => unitIds.Contains(r.UnitId) && !r.IsDeleted && r.IsActive)
            .ToListAsync(ct);

        var occupiedUnitIds = residents.Select(r => r.UnitId).Distinct().ToHashSet();
        var totalUnits = units.Count;
        var occupiedUnits = units.Count(u => occupiedUnitIds.Contains(u.Id));
        var vacantUnits = units.Count(u => !occupiedUnitIds.Contains(u.Id) && u.Status != UnitStatus.UnderMaintenance);
        var maintenanceUnits = units.Count(u => u.Status == UnitStatus.UnderMaintenance);
        var occupancyRate = totalUnits > 0 ? Math.Round((decimal)occupiedUnits / totalUnits * 100, 1) : 0;

        var amenities = await _context.Amenities
            .Where(a => a.CondominiumId == request.CondominiumId && !a.IsDeleted)
            .ToListAsync(ct);

        var reservations = await _context.Reservations
            .Include(r => r.Amenity)
            .Where(r => r.Amenity!.CondominiumId == request.CondominiumId && !r.IsDeleted
                && r.StartDateTime >= request.StartDate && r.StartDateTime <= request.EndDate)
            .ToListAsync(ct);

        // Building occupancy
        var buildingOccupancy = buildings.Select(b =>
        {
            var bUnits = units.Where(u => u.BuildingId == b.Id).ToList();
            var bOccupied = bUnits.Count(u => occupiedUnitIds.Contains(u.Id));
            return new BuildingOccupancyDto(b.Name, bUnits.Count, bOccupied,
                bUnits.Count > 0 ? Math.Round((decimal)bOccupied / bUnits.Count * 100, 1) : 0);
        }).OrderByDescending(b => b.OccupancyRate).ToList();

        // Amenity usage
        var amenityUsage = reservations
            .Where(r => r.Amenity != null)
            .GroupBy(r => r.Amenity!.Name)
            .Select(g => new AmenityUsageDto(g.Key, g.Count(),
                g.Sum(r => r.NumberOfGuests),
                g.Where(r => r.Fee.HasValue).Sum(r => r.Fee!.Value)))
            .OrderByDescending(a => a.ReservationCount).ToList();

        // Reservation trend by month
        var resTrend = reservations
            .GroupBy(r => new { r.StartDateTime.Month, r.StartDateTime.Year })
            .Select(g => new ReservationTrendDto(g.Key.Month, g.Key.Year,
                ReportHelpers.MonthLabel(g.Key.Month, g.Key.Year),
                g.Count(),
                g.Count(r => r.Status == ReservationStatus.Completed),
                g.Count(r => r.Status == ReservationStatus.Cancelled)))
            .OrderBy(t => t.Year).ThenBy(t => t.Month).ToList();

        return Result.Success(new OperationalReportDto(
            totalUnits, occupiedUnits, vacantUnits, maintenanceUnits, occupancyRate,
            buildings.Count, amenities.Count,
            reservations.Count(r => r.Status == ReservationStatus.Confirmed || r.Status == ReservationStatus.InProgress),
            reservations.Count,
            buildingOccupancy, amenityUsage, resTrend));
    }
}

// ========== Residents Report Handler ==========
public class GetResidentReportQueryHandler : IRequestHandler<GetResidentReportQuery, Result<ResidentReportDto>>
{
    private readonly IApplicationDbContext _context;
    public GetResidentReportQueryHandler(IApplicationDbContext context) => _context = context;

    public async ValueTask<Result<ResidentReportDto>> Handle(GetResidentReportQuery request, CancellationToken ct)
    {
        var buildingIds = await _context.Buildings
            .Where(b => b.CondominiumId == request.CondominiumId && !b.IsDeleted)
            .Select(b => b.Id).ToListAsync(ct);

        var unitIds = await _context.Units
            .Where(u => buildingIds.Contains(u.BuildingId) && !u.IsDeleted)
            .Select(u => u.Id).ToListAsync(ct);

        var units = await _context.Units
            .Include(u => u.Building)
            .Where(u => buildingIds.Contains(u.BuildingId) && !u.IsDeleted)
            .ToListAsync(ct);

        var residents = await _context.Residents
            .Where(r => unitIds.Contains(r.UnitId) && !r.IsDeleted)
            .ToListAsync(ct);

        var total = residents.Count;
        var owners = residents.Count(r => r.Type == ResidentType.Owner);
        var tenants = residents.Count(r => r.Type == ResidentType.Tenant);
        var family = residents.Count(r => r.Type == ResidentType.FamilyMember);
        var active = residents.Count(r => r.IsActive);
        var pending = residents.Count(r => !r.IsRegistered);
        var newInPeriod = residents.Count(r => r.MoveInDate.HasValue && r.MoveInDate >= request.StartDate && r.MoveInDate <= request.EndDate);
        var movedOut = residents.Count(r => r.MoveOutDate.HasValue && r.MoveOutDate >= request.StartDate && r.MoveOutDate <= request.EndDate);

        // By type
        var byType = residents.GroupBy(r => r.Type)
            .Select(g => new ResidentTypeBreakdownDto(
                ReportHelpers.GetResidentTypeName(g.Key), g.Count(),
                total > 0 ? Math.Round((decimal)g.Count() / total * 100, 1) : 0))
            .OrderByDescending(t => t.Count).ToList();

        // By building
        var byBuilding = units
            .GroupBy(u => u.Building!.Name)
            .Select(g =>
            {
                var bUnitIds = g.Select(u => u.Id).ToHashSet();
                var bResidents = residents.Where(r => bUnitIds.Contains(r.UnitId)).ToList();
                return new BuildingResidentDto(g.Key,
                    bResidents.Count,
                    bResidents.Count(r => r.Type == ResidentType.Owner),
                    bResidents.Count(r => r.Type == ResidentType.Tenant));
            }).OrderByDescending(b => b.TotalResidents).ToList();

        // Monthly trend (from residents with move-in dates in period)
        var monthlyTrend = Enumerable.Range(0, 6)
            .Select(i =>
            {
                var d = request.EndDate.AddMonths(-5 + i);
                var month = d.Month;
                var year = d.Year;
                var startOfMonth = new DateTime(year, month, 1);
                var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);
                return new MonthlyResidentTrendDto(month, year,
                    ReportHelpers.MonthLabel(month, year),
                    residents.Count(r => r.MoveInDate.HasValue && r.MoveInDate >= startOfMonth && r.MoveInDate <= endOfMonth),
                    residents.Count(r => r.MoveOutDate.HasValue && r.MoveOutDate >= startOfMonth && r.MoveOutDate <= endOfMonth));
            }).ToList();

        return Result.Success(new ResidentReportDto(
            total, owners, tenants, family, active, pending, newInPeriod, movedOut,
            byType, byBuilding, monthlyTrend));
    }
}

// ========== Incidents Report Handler ==========
public class GetIncidentReportQueryHandler : IRequestHandler<GetIncidentReportQuery, Result<IncidentReportDto>>
{
    private readonly IApplicationDbContext _context;
    public GetIncidentReportQueryHandler(IApplicationDbContext context) => _context = context;

    public async ValueTask<Result<IncidentReportDto>> Handle(GetIncidentReportQuery request, CancellationToken ct)
    {
        var incidents = await _context.Incidents
            .Where(i => i.CondominiumId == request.CondominiumId
                && i.CreatedAt >= request.StartDate && i.CreatedAt <= request.EndDate)
            .ToListAsync(ct);

        // Load units with buildings for building-level aggregation
        var unitIds = incidents.Where(i => i.UnitId.HasValue).Select(i => i.UnitId!.Value).Distinct().ToList();
        var unitBuildingMap = await _context.Units
            .Include(u => u.Building)
            .Where(u => unitIds.Contains(u.Id) && !u.IsDeleted)
            .ToDictionaryAsync(u => u.Id, u => u.Building?.Name ?? "Sin edificio", ct);

        var total = incidents.Count;
        var open = incidents.Count(i => i.Status == IncidentStatus.Open || i.Status == IncidentStatus.Acknowledged);
        var inProgress = incidents.Count(i => i.Status == IncidentStatus.InProgress);
        var resolved = incidents.Count(i => i.Status == IncidentStatus.Resolved);
        var closed = incidents.Count(i => i.Status == IncidentStatus.Closed);
        var cancelled = incidents.Count(i => i.Status == IncidentStatus.Cancelled);

        var resolvedWithTime = incidents
            .Where(i => i.ResolvedAt.HasValue)
            .Select(i => (i.ResolvedAt!.Value - i.CreatedAt).TotalDays)
            .ToList();
        var avgDays = resolvedWithTime.Count > 0 ? Math.Round((decimal)resolvedWithTime.Average(), 1) : 0;

        // By type
        var byType = incidents.GroupBy(i => i.Type)
            .Select(g => new IncidentTypeBreakdownDto(
                ReportHelpers.GetIncidentTypeName(g.Key), g.Count(),
                g.Count(i => i.Status == IncidentStatus.Open || i.Status == IncidentStatus.Acknowledged),
                g.Count(i => i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Closed)))
            .OrderByDescending(t => t.Count).ToList();

        // By priority
        var byPriority = incidents.GroupBy(i => i.Priority)
            .Select(g => new IncidentPriorityBreakdownDto(
                ReportHelpers.GetIncidentPriorityName(g.Key), g.Count(),
                total > 0 ? Math.Round((decimal)g.Count() / total * 100, 1) : 0))
            .OrderByDescending(p => p.Count).ToList();

        // Monthly trend
        var monthlyTrend = incidents
            .GroupBy(i => new { i.CreatedAt.Month, i.CreatedAt.Year })
            .Select(g => new MonthlyIncidentTrendDto(g.Key.Month, g.Key.Year,
                ReportHelpers.MonthLabel(g.Key.Month, g.Key.Year),
                g.Count(),
                g.Count(i => i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Closed)))
            .OrderBy(t => t.Year).ThenBy(t => t.Month).ToList();

        // By building
        var byBuilding = incidents
            .Where(i => i.UnitId.HasValue && unitBuildingMap.ContainsKey(i.UnitId.Value))
            .GroupBy(i => unitBuildingMap[i.UnitId!.Value])
            .Select(g => new IncidentByBuildingDto(g.Key, g.Count(),
                g.Count(i => i.Status == IncidentStatus.Open || i.Status == IncidentStatus.Acknowledged || i.Status == IncidentStatus.InProgress),
                g.Count(i => i.Status == IncidentStatus.Resolved || i.Status == IncidentStatus.Closed)))
            .OrderByDescending(b => b.Total).ToList();

        return Result.Success(new IncidentReportDto(
            total, open, inProgress, resolved, closed, cancelled, avgDays,
            byType, byPriority, monthlyTrend, byBuilding));
    }
}

// ========== Communications Report Handler ==========
public class GetCommunicationsReportQueryHandler : IRequestHandler<GetCommunicationsReportQuery, Result<CommunicationsReportDto>>
{
    private readonly IApplicationDbContext _context;
    public GetCommunicationsReportQueryHandler(IApplicationDbContext context) => _context = context;

    public async ValueTask<Result<CommunicationsReportDto>> Handle(GetCommunicationsReportQuery request, CancellationToken ct)
    {
        var announcements = await _context.Announcements
            .Where(a => a.CondominiumId == request.CondominiumId && !a.IsDeleted
                && a.CreatedAt >= request.StartDate && a.CreatedAt <= request.EndDate)
            .ToListAsync(ct);

        var polls = await _context.Polls
            .Where(p => p.CondominiumId == request.CondominiumId && !p.IsDeleted
                && p.CreatedAt >= request.StartDate && p.CreatedAt <= request.EndDate)
            .ToListAsync(ct);

        var meetings = await _context.Meetings
            .Where(m => m.CondominiumId == request.CondominiumId && !m.IsDeleted
                && m.CreatedAt >= request.StartDate && m.CreatedAt <= request.EndDate)
            .ToListAsync(ct);

        var forumPosts = await _context.ForumPosts
            .Where(f => f.CondominiumId == request.CondominiumId && !f.IsDeleted
                && f.CreatedAt >= request.StartDate && f.CreatedAt <= request.EndDate)
            .ToListAsync(ct);

        // By announcement type
        var byType = announcements.GroupBy(a => a.Type)
            .Select(g => new AnnouncementTypeBreakdownDto(
                ReportHelpers.GetAnnouncementTypeName(g.Key), g.Count()))
            .OrderByDescending(t => t.Count).ToList();

        // Monthly trend
        var allDates = announcements.Select(a => a.CreatedAt)
            .Concat(polls.Select(p => p.CreatedAt))
            .Concat(meetings.Select(m => m.CreatedAt))
            .Concat(forumPosts.Select(f => f.CreatedAt));

        var months = allDates
            .GroupBy(d => new { d.Month, d.Year })
            .Select(g => new MonthlyCommunicationTrendDto(g.Key.Month, g.Key.Year,
                ReportHelpers.MonthLabel(g.Key.Month, g.Key.Year),
                announcements.Count(a => a.CreatedAt.Month == g.Key.Month && a.CreatedAt.Year == g.Key.Year),
                polls.Count(p => p.CreatedAt.Month == g.Key.Month && p.CreatedAt.Year == g.Key.Year),
                meetings.Count(m => m.CreatedAt.Month == g.Key.Month && m.CreatedAt.Year == g.Key.Year),
                forumPosts.Count(f => f.CreatedAt.Month == g.Key.Month && f.CreatedAt.Year == g.Key.Year)))
            .OrderBy(t => t.Year).ThenBy(t => t.Month).ToList();

        return Result.Success(new CommunicationsReportDto(
            announcements.Count,
            announcements.Count(a => a.IsPublished),
            polls.Count,
            polls.Count(p => p.Status == PollStatus.Active),
            meetings.Count,
            forumPosts.Count,
            byType, months));
    }
}
