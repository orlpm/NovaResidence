using Mediator;
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
    bool IsReportedByResident,
    string ReportedByRole,
    string? AssignedToName,
    string? UnitNumber,
    int AttachmentCount,
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
    bool IsReportedByResident,
    string ReportedByRole,
    string? AssignedToName,
    string? UnitNumber,
    DateTime CreatedAt,
    List<IncidentCommentDto> Comments,
    List<IncidentAttachmentDto> Attachments
);

public record IncidentCommentDto(
    Guid Id,
    Guid UserId,
    string UserName,
    string Content,
    bool IsInternal,
    DateTime CreatedAt
);

public record IncidentAttachmentDto(
    Guid Id,
    string FileName,
    string FileUrl,
    string? ContentType,
    long? FileSize,
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
