using Mediator;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Incidents.Commands;

// Create Incident
public record CreateIncidentCommand(
    Guid CondominiumId,
    Guid ReportedById,
    string Title,
    string Description,
    IncidentType Type,
    IncidentPriority Priority,
    Guid? UnitId = null,
    string? Location = null,
    string? PhotoUrl = null
) : IRequest<Result<Guid>>;

// Update Incident
public record UpdateIncidentCommand(
    Guid IncidentId,
    string Title,
    string Description,
    IncidentType Type,
    IncidentPriority Priority,
    string? Location = null
) : IRequest<Result>;

// Assign Incident
public record AssignIncidentCommand(
    Guid IncidentId,
    Guid AssignedToId,
    DateTime? EstimatedCompletion = null
) : IRequest<Result>;

// Acknowledge Incident
public record AcknowledgeIncidentCommand(Guid IncidentId) : IRequest<Result>;

// Start Progress
public record StartIncidentProgressCommand(Guid IncidentId) : IRequest<Result>;

// Resolve Incident
public record ResolveIncidentCommand(
    Guid IncidentId,
    Guid ResolvedById,
    string ResolutionNotes,
    decimal? ActualCost = null
) : IRequest<Result>;

// Close Incident
public record CloseIncidentCommand(Guid IncidentId) : IRequest<Result>;

// Reopen Incident
public record ReopenIncidentCommand(Guid IncidentId, string Reason) : IRequest<Result>;

// Add Comment
public record AddIncidentCommentCommand(
    Guid IncidentId,
    Guid UserId,
    string Content,
    bool IsInternal = false
) : IRequest<Result<Guid>>;
