using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Application.Features.Incidents.Queries;

public class GetIncidentQueryHandler : IRequestHandler<GetIncidentQuery, Result<IncidentDetailDto>>
{
    private readonly IApplicationDbContext _context;

    public GetIncidentQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<IncidentDetailDto>> Handle(GetIncidentQuery request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents
            .Include(i => i.Comments)
            .FirstOrDefaultAsync(i => i.Id == request.IncidentId, cancellationToken);

        if (incident == null)
            return Result.NotFound("Incident not found");

        var reportedBy = await _context.Users.FindAsync(new object[] { incident.ReportedById }, cancellationToken);
        var assignedTo = incident.AssignedToId.HasValue 
            ? await _context.Users.FindAsync(new object[] { incident.AssignedToId.Value }, cancellationToken)
            : null;
        var unit = incident.UnitId.HasValue
            ? await _context.Units.FindAsync(new object[] { incident.UnitId.Value }, cancellationToken)
            : null;

        var commentUserIds = incident.Comments.Select(c => c.UserId).Distinct().ToList();
        var users = await _context.Users
            .Where(u => commentUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken);

        var dto = new IncidentDetailDto(
            incident.Id,
            incident.CondominiumId,
            incident.UnitId,
            incident.ReportedById,
            incident.AssignedToId,
            incident.Title,
            incident.Description,
            incident.Type,
            IncidentEnumHelpers.GetTypeName(incident.Type),
            incident.Priority,
            IncidentEnumHelpers.GetPriorityName(incident.Priority),
            incident.Status,
            IncidentEnumHelpers.GetStatusName(incident.Status),
            incident.Location,
            incident.ResolutionNotes,
            incident.ResolvedAt,
            incident.AcknowledgedAt,
            incident.InProgressAt,
            incident.EstimatedCompletionDate,
            incident.EstimatedCost,
            incident.ActualCost,
            reportedBy != null ? $"{reportedBy.FirstName} {reportedBy.LastName}" : "Unknown",
            assignedTo != null ? $"{assignedTo.FirstName} {assignedTo.LastName}" : null,
            unit?.UnitNumber,
            incident.CreatedAt,
            incident.Comments.Select(c => new IncidentCommentDto(
                c.Id,
                c.UserId,
                users.GetValueOrDefault(c.UserId, "Unknown"),
                c.Content,
                c.IsInternal,
                c.CreatedAt
            )).OrderBy(c => c.CreatedAt).ToList()
        );

        return Result.Success(dto);
    }
}

public class GetCondominiumIncidentsQueryHandler : IRequestHandler<GetCondominiumIncidentsQuery, Result<List<IncidentListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetCondominiumIncidentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<IncidentListDto>>> Handle(GetCondominiumIncidentsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Incidents
            .Where(i => i.CondominiumId == request.CondominiumId);

        if (request.Status.HasValue)
            query = query.Where(i => i.Status == request.Status.Value);
        
        if (request.Type.HasValue)
            query = query.Where(i => i.Type == request.Type.Value);
        
        if (request.Priority.HasValue)
            query = query.Where(i => i.Priority == request.Priority.Value);

        var incidents = await query
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

        var userIds = incidents.SelectMany(i => new[] { i.ReportedById, i.AssignedToId ?? Guid.Empty })
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken);

        var unitIds = incidents.Where(i => i.UnitId.HasValue).Select(i => i.UnitId!.Value).Distinct().ToList();
        var units = await _context.Units
            .Where(u => unitIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UnitNumber, cancellationToken);

        var result = incidents.Select(i => new IncidentListDto(
            i.Id,
            i.Title,
            i.Description,
            i.Type,
            IncidentEnumHelpers.GetTypeName(i.Type),
            i.Priority,
            IncidentEnumHelpers.GetPriorityName(i.Priority),
            i.Status,
            IncidentEnumHelpers.GetStatusName(i.Status),
            i.Location,
            users.GetValueOrDefault(i.ReportedById, "Unknown"),
            i.AssignedToId.HasValue ? users.GetValueOrDefault(i.AssignedToId.Value, "Unknown") : null,
            i.UnitId.HasValue ? units.GetValueOrDefault(i.UnitId.Value, "") : null,
            i.CreatedAt,
            i.ResolvedAt
        )).ToList();

        return Result.Success(result);
    }
}

public class GetUnitIncidentsQueryHandler : IRequestHandler<GetUnitIncidentsQuery, Result<List<IncidentListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetUnitIncidentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<IncidentListDto>>> Handle(GetUnitIncidentsQuery request, CancellationToken cancellationToken)
    {
        var incidents = await _context.Incidents
            .Where(i => i.UnitId == request.UnitId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

        var userIds = incidents.SelectMany(i => new[] { i.ReportedById, i.AssignedToId ?? Guid.Empty })
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken);

        var unit = await _context.Units.FindAsync(new object[] { request.UnitId }, cancellationToken);

        var result = incidents.Select(i => new IncidentListDto(
            i.Id,
            i.Title,
            i.Description,
            i.Type,
            IncidentEnumHelpers.GetTypeName(i.Type),
            i.Priority,
            IncidentEnumHelpers.GetPriorityName(i.Priority),
            i.Status,
            IncidentEnumHelpers.GetStatusName(i.Status),
            i.Location,
            users.GetValueOrDefault(i.ReportedById, "Unknown"),
            i.AssignedToId.HasValue ? users.GetValueOrDefault(i.AssignedToId.Value, "Unknown") : null,
            unit?.UnitNumber,
            i.CreatedAt,
            i.ResolvedAt
        )).ToList();

        return Result.Success(result);
    }
}

public class GetMyIncidentsQueryHandler : IRequestHandler<GetMyIncidentsQuery, Result<List<IncidentListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetMyIncidentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<IncidentListDto>>> Handle(GetMyIncidentsQuery request, CancellationToken cancellationToken)
    {
        var incidents = await _context.Incidents
            .Where(i => i.ReportedById == request.UserId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

        var userIds = incidents.SelectMany(i => new[] { i.ReportedById, i.AssignedToId ?? Guid.Empty })
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken);

        var unitIds = incidents.Where(i => i.UnitId.HasValue).Select(i => i.UnitId!.Value).Distinct().ToList();
        var units = await _context.Units
            .Where(u => unitIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UnitNumber, cancellationToken);

        var result = incidents.Select(i => new IncidentListDto(
            i.Id,
            i.Title,
            i.Description,
            i.Type,
            IncidentEnumHelpers.GetTypeName(i.Type),
            i.Priority,
            IncidentEnumHelpers.GetPriorityName(i.Priority),
            i.Status,
            IncidentEnumHelpers.GetStatusName(i.Status),
            i.Location,
            users.GetValueOrDefault(i.ReportedById, "Unknown"),
            i.AssignedToId.HasValue ? users.GetValueOrDefault(i.AssignedToId.Value, "Unknown") : null,
            i.UnitId.HasValue ? units.GetValueOrDefault(i.UnitId.Value, "") : null,
            i.CreatedAt,
            i.ResolvedAt
        )).ToList();

        return Result.Success(result);
    }
}

public class GetAssignedIncidentsQueryHandler : IRequestHandler<GetAssignedIncidentsQuery, Result<List<IncidentListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetAssignedIncidentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<IncidentListDto>>> Handle(GetAssignedIncidentsQuery request, CancellationToken cancellationToken)
    {
        var incidents = await _context.Incidents
            .Where(i => i.AssignedToId == request.UserId)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync(cancellationToken);

        var userIds = incidents.SelectMany(i => new[] { i.ReportedById, i.AssignedToId ?? Guid.Empty })
            .Where(id => id != Guid.Empty)
            .Distinct()
            .ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => $"{u.FirstName} {u.LastName}", cancellationToken);

        var unitIds = incidents.Where(i => i.UnitId.HasValue).Select(i => i.UnitId!.Value).Distinct().ToList();
        var units = await _context.Units
            .Where(u => unitIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UnitNumber, cancellationToken);

        var result = incidents.Select(i => new IncidentListDto(
            i.Id,
            i.Title,
            i.Description,
            i.Type,
            IncidentEnumHelpers.GetTypeName(i.Type),
            i.Priority,
            IncidentEnumHelpers.GetPriorityName(i.Priority),
            i.Status,
            IncidentEnumHelpers.GetStatusName(i.Status),
            i.Location,
            users.GetValueOrDefault(i.ReportedById, "Unknown"),
            i.AssignedToId.HasValue ? users.GetValueOrDefault(i.AssignedToId.Value, "Unknown") : null,
            i.UnitId.HasValue ? units.GetValueOrDefault(i.UnitId.Value, "") : null,
            i.CreatedAt,
            i.ResolvedAt
        )).ToList();

        return Result.Success(result);
    }
}
