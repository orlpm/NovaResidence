using MediatR;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Incidents.Queries;

// DTOs
public record IncidentListDto(
    Guid Id,
    string Title,
    string Description,
    IncidentType Type,
    string TypeName,
    IncidentPriority Priority,
    string PriorityName,
    IncidentStatus Status,
    string StatusName,
    string? Location,
    string ReportedByName,
    string? AssignedToName,
    string? UnitNumber,
    DateTime CreatedAt,
    DateTime? ResolvedAt
);

public record IncidentDetailDto(
    Guid Id,
    Guid CondominiumId,
    Guid? UnitId,
    Guid ReportedById,
    Guid? AssignedToId,
    string Title,
    string Description,
    IncidentType Type,
    string TypeName,
    IncidentPriority Priority,
    string PriorityName,
    IncidentStatus Status,
    string StatusName,
    string? Location,
    string? ResolutionNotes,
    DateTime? ResolvedAt,
    DateTime? AcknowledgedAt,
    DateTime? InProgressAt,
    DateTime? EstimatedCompletionDate,
    decimal? EstimatedCost,
    decimal? ActualCost,
    string ReportedByName,
    string? AssignedToName,
    string? UnitNumber,
    DateTime CreatedAt,
    List<IncidentCommentDto> Comments
);

public record IncidentCommentDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    bool IsInternal,
    DateTime CreatedAt
);

// Queries
public record GetIncidentQuery(Guid IncidentId) : IRequest<Result<IncidentDetailDto>>;

public record GetCondominiumIncidentsQuery(
    Guid CondominiumId,
    IncidentStatus? Status = null,
    IncidentType? Type = null,
    IncidentPriority? Priority = null
) : IRequest<Result<List<IncidentListDto>>>;

public record GetUnitIncidentsQuery(Guid UnitId) : IRequest<Result<List<IncidentListDto>>>;

public record GetMyIncidentsQuery(Guid UserId) : IRequest<Result<List<IncidentListDto>>>;

public record GetAssignedIncidentsQuery(Guid UserId) : IRequest<Result<List<IncidentListDto>>>;
