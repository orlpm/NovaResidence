using Ardalis.Result;
using MediatR;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Notifications.Queries;

// DTOs
public record NotificationDto(
    Guid Id,
    Guid CondominiumId,
    Guid UserId,
    Guid? UnitId,
    NotificationType Type,
    NotificationPriority Priority,
    string Title,
    string Message,
    string? RelatedEntityType,
    Guid? RelatedEntityId,
    string? ActionUrl,
    bool IsRead,
    DateTime? ReadAt,
    DateTime CreatedAt,
    DateTime? ExpiresAt
);

public record NotificationSummaryDto(
    int TotalCount,
    int UnreadCount,
    List<NotificationDto> RecentNotifications
);

// Queries
public record GetUserNotificationsQuery(
    Guid UserId,
    Guid CondominiumId,
    bool? IsRead = null,
    NotificationType? Type = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<NotificationDto>>>;

public record GetNotificationSummaryQuery(
    Guid UserId,
    Guid CondominiumId,
    int RecentCount = 5
) : IRequest<Result<NotificationSummaryDto>>;

public record GetUnreadNotificationCountQuery(
    Guid UserId,
    Guid CondominiumId
) : IRequest<Result<int>>;

public record GetNotificationByIdQuery(
    Guid Id,
    Guid UserId
) : IRequest<Result<NotificationDto>>;

// Paged list helper
public record PagedList<T>(
    List<T> Items,
    int TotalCount,
    int PageNumber,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}
