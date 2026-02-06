using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Application.Features.Notifications.Queries;

public class GetUserNotificationsQueryHandler : IRequestHandler<GetUserNotificationsQuery, Result<PagedList<NotificationDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetUserNotificationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<PagedList<NotificationDto>>> Handle(GetUserNotificationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Notifications
            .Where(n => n.UserId == request.UserId && n.CondominiumId == request.CondominiumId)
            .Where(n => n.ExpiresAt == null || n.ExpiresAt > DateTime.UtcNow)
            .AsQueryable();

        if (request.IsRead.HasValue)
            query = query.Where(n => n.IsRead == request.IsRead.Value);

        if (request.Type.HasValue)
            query = query.Where(n => n.Type == request.Type.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var notifications = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(n => new NotificationDto(
                n.Id,
                n.CondominiumId,
                n.UserId,
                n.UnitId,
                n.Type,
                n.Priority,
                n.Title,
                n.Message,
                n.RelatedEntityType,
                n.RelatedEntityId,
                n.ActionUrl,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt,
                n.ExpiresAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedList<NotificationDto>(
            notifications,
            totalCount,
            request.Page,
            request.PageSize
        ));
    }
}

public class GetNotificationSummaryQueryHandler : IRequestHandler<GetNotificationSummaryQuery, Result<NotificationSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetNotificationSummaryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<NotificationSummaryDto>> Handle(GetNotificationSummaryQuery request, CancellationToken cancellationToken)
    {
        var baseQuery = _context.Notifications
            .Where(n => n.UserId == request.UserId && n.CondominiumId == request.CondominiumId)
            .Where(n => n.ExpiresAt == null || n.ExpiresAt > DateTime.UtcNow);

        var totalCount = await baseQuery.CountAsync(cancellationToken);
        var unreadCount = await baseQuery.CountAsync(n => !n.IsRead, cancellationToken);

        var recentNotifications = await baseQuery
            .OrderByDescending(n => n.CreatedAt)
            .Take(request.RecentCount)
            .Select(n => new NotificationDto(
                n.Id,
                n.CondominiumId,
                n.UserId,
                n.UnitId,
                n.Type,
                n.Priority,
                n.Title,
                n.Message,
                n.RelatedEntityType,
                n.RelatedEntityId,
                n.ActionUrl,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt,
                n.ExpiresAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new NotificationSummaryDto(
            totalCount,
            unreadCount,
            recentNotifications
        ));
    }
}

public class GetUnreadNotificationCountQueryHandler : IRequestHandler<GetUnreadNotificationCountQuery, Result<int>>
{
    private readonly IApplicationDbContext _context;

    public GetUnreadNotificationCountQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<int>> Handle(GetUnreadNotificationCountQuery request, CancellationToken cancellationToken)
    {
        var count = await _context.Notifications
            .Where(n => n.UserId == request.UserId && n.CondominiumId == request.CondominiumId)
            .Where(n => n.ExpiresAt == null || n.ExpiresAt > DateTime.UtcNow)
            .CountAsync(n => !n.IsRead, cancellationToken);

        return Result.Success(count);
    }
}

public class GetNotificationByIdQueryHandler : IRequestHandler<GetNotificationByIdQuery, Result<NotificationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetNotificationByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<NotificationDto>> Handle(GetNotificationByIdQuery request, CancellationToken cancellationToken)
    {
        var notification = await _context.Notifications
            .Where(n => n.Id == request.Id && n.UserId == request.UserId)
            .Select(n => new NotificationDto(
                n.Id,
                n.CondominiumId,
                n.UserId,
                n.UnitId,
                n.Type,
                n.Priority,
                n.Title,
                n.Message,
                n.RelatedEntityType,
                n.RelatedEntityId,
                n.ActionUrl,
                n.IsRead,
                n.ReadAt,
                n.CreatedAt,
                n.ExpiresAt
            ))
            .FirstOrDefaultAsync(cancellationToken);

        if (notification == null)
            return Result.NotFound("Notification not found");

        return Result.Success(notification);
    }
}
