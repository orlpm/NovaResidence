using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Notifications;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Infrastructure.Services;

public class OperationalNotifier : IOperationalNotifier
{
    private readonly IApplicationDbContext _context;

    public OperationalNotifier(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task NotifyUsersAsync(
        IEnumerable<Guid> userIds,
        Guid condominiumId,
        NotificationType type,
        string title,
        string message,
        string? relatedEntityType,
        Guid? relatedEntityId,
        string? actionUrl,
        CancellationToken cancellationToken = default)
    {
        var distinctIds = userIds.Where(id => id != Guid.Empty).Distinct().ToList();
        if (distinctIds.Count == 0)
            return;

        foreach (var userId in distinctIds)
        {
            _context.Notifications.Add(Notification.Create(
                condominiumId,
                userId,
                type,
                title,
                message,
                NotificationPriority.Normal,
                relatedEntityType: relatedEntityType,
                relatedEntityId: relatedEntityId,
                actionUrl: actionUrl));
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task NotifyRoleAsync(
        Guid condominiumId,
        UserRole role,
        NotificationType type,
        string title,
        string message,
        string? relatedEntityType,
        Guid? relatedEntityId,
        string? actionUrl,
        CancellationToken cancellationToken = default)
    {
        var userIds = await _context.Users
            .Where(user => user.CondominiumRoles.Any(membership =>
                membership.CondominiumId == condominiumId && membership.Role == role))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        await NotifyUsersAsync(userIds, condominiumId, type, title, message, relatedEntityType, relatedEntityId, actionUrl, cancellationToken);
    }

    public async Task NotifyResidentsAsync(
        Guid condominiumId,
        NotificationType type,
        string title,
        string message,
        string? relatedEntityType,
        Guid? relatedEntityId,
        string? actionUrl,
        CancellationToken cancellationToken = default)
    {
        var userIds = await _context.Residents
            .Where(resident => resident.UserId != null
                && resident.IsActive
                && resident.Unit != null
                && resident.Unit.Building != null
                && resident.Unit.Building.CondominiumId == condominiumId)
            .Select(resident => resident.UserId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        await NotifyUsersAsync(userIds, condominiumId, type, title, message, relatedEntityType, relatedEntityId, actionUrl, cancellationToken);
    }
}
