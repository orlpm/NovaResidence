using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Common.Interfaces;

public interface IOperationalNotifier
{
    Task NotifyUsersAsync(
        IEnumerable<Guid> userIds,
        Guid condominiumId,
        NotificationType type,
        string title,
        string message,
        string? relatedEntityType,
        Guid? relatedEntityId,
        string? actionUrl,
        CancellationToken cancellationToken = default);

    Task NotifyRoleAsync(
        Guid condominiumId,
        UserRole role,
        NotificationType type,
        string title,
        string message,
        string? relatedEntityType,
        Guid? relatedEntityId,
        string? actionUrl,
        CancellationToken cancellationToken = default);

    Task NotifyResidentsAsync(
        Guid condominiumId,
        NotificationType type,
        string title,
        string message,
        string? relatedEntityType,
        Guid? relatedEntityId,
        string? actionUrl,
        CancellationToken cancellationToken = default);
}
