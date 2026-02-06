using Ardalis.Result;
using MediatR;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Notifications.Commands;

// Commands
public record CreateNotificationCommand(
    Guid CondominiumId,
    Guid UserId,
    NotificationType Type,
    string Title,
    string Message,
    NotificationPriority Priority = NotificationPriority.Normal,
    Guid? UnitId = null,
    string? RelatedEntityType = null,
    Guid? RelatedEntityId = null,
    string? ActionUrl = null,
    DateTime? ExpiresAt = null
) : IRequest<Result<Guid>>;

public record CreateBulkNotificationsCommand(
    Guid CondominiumId,
    List<Guid> UserIds,
    NotificationType Type,
    string Title,
    string Message,
    NotificationPriority Priority = NotificationPriority.Normal,
    string? RelatedEntityType = null,
    Guid? RelatedEntityId = null,
    string? ActionUrl = null,
    DateTime? ExpiresAt = null
) : IRequest<Result<int>>;

public record MarkNotificationAsReadCommand(
    Guid NotificationId,
    Guid UserId
) : IRequest<Result>;

public record MarkAllNotificationsAsReadCommand(
    Guid UserId,
    Guid CondominiumId
) : IRequest<Result<int>>;

public record DeleteNotificationCommand(
    Guid NotificationId,
    Guid UserId
) : IRequest<Result>;

public record DeleteAllReadNotificationsCommand(
    Guid UserId,
    Guid CondominiumId
) : IRequest<Result<int>>;
