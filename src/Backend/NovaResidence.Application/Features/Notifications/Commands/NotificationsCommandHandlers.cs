using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Notifications;

namespace NovaResidence.Application.Features.Notifications.Commands;

public class CreateNotificationCommandHandler : IRequestHandler<CreateNotificationCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public CreateNotificationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(CreateNotificationCommand request, CancellationToken cancellationToken)
    {
        var notification = Notification.Create(
            request.CondominiumId,
            request.UserId,
            request.Type,
            request.Title,
            request.Message,
            request.Priority,
            request.UnitId,
            request.RelatedEntityType,
            request.RelatedEntityId,
            request.ActionUrl,
            request.ExpiresAt
        );

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(notification.Id);
    }
}

public class CreateBulkNotificationsCommandHandler : IRequestHandler<CreateBulkNotificationsCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;

    public CreateBulkNotificationsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<int>> Handle(CreateBulkNotificationsCommand request, CancellationToken cancellationToken)
    {
        var notifications = request.UserIds.Select(userId => 
            Notification.Create(
                request.CondominiumId,
                userId,
                request.Type,
                request.Title,
                request.Message,
                request.Priority,
                null,
                request.RelatedEntityType,
                request.RelatedEntityId,
                request.ActionUrl,
                request.ExpiresAt
            )
        ).ToList();

        _context.Notifications.AddRange(notifications);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(notifications.Count);
    }
}

public class MarkNotificationAsReadCommandHandler : IRequestHandler<MarkNotificationAsReadCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public MarkNotificationAsReadCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(MarkNotificationAsReadCommand request, CancellationToken cancellationToken)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == request.NotificationId && n.UserId == request.UserId, cancellationToken);

        if (notification == null)
            return Result.NotFound("Notification not found");

        notification.MarkAsRead();
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class MarkAllNotificationsAsReadCommandHandler : IRequestHandler<MarkAllNotificationsAsReadCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;

    public MarkAllNotificationsAsReadCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<int>> Handle(MarkAllNotificationsAsReadCommand request, CancellationToken cancellationToken)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == request.UserId && n.CondominiumId == request.CondominiumId && !n.IsRead)
            .ToListAsync(cancellationToken);

        foreach (var notification in notifications)
        {
            notification.MarkAsRead();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(notifications.Count);
    }
}

public class DeleteNotificationCommandHandler : IRequestHandler<DeleteNotificationCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteNotificationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteNotificationCommand request, CancellationToken cancellationToken)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == request.NotificationId && n.UserId == request.UserId, cancellationToken);

        if (notification == null)
            return Result.NotFound("Notification not found");

        _context.Notifications.Remove(notification);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class DeleteAllReadNotificationsCommandHandler : IRequestHandler<DeleteAllReadNotificationsCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;

    public DeleteAllReadNotificationsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<int>> Handle(DeleteAllReadNotificationsCommand request, CancellationToken cancellationToken)
    {
        var notifications = await _context.Notifications
            .Where(n => n.UserId == request.UserId && n.CondominiumId == request.CondominiumId && n.IsRead)
            .ToListAsync(cancellationToken);

        _context.Notifications.RemoveRange(notifications);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(notifications.Count);
    }
}
