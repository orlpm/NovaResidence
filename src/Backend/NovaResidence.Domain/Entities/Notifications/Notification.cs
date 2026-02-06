using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Notifications;

/// <summary>
/// Represents a notification for a user
/// </summary>
public class Notification
{
    public Guid Id { get; private set; }
    public Guid CondominiumId { get; private set; }
    public Guid UserId { get; private set; }
    
    /// <summary>
    /// Optional: Unit ID if notification is unit-specific
    /// </summary>
    public Guid? UnitId { get; private set; }
    
    public NotificationType Type { get; private set; }
    public NotificationPriority Priority { get; private set; }
    
    public string Title { get; private set; } = string.Empty;
    public string Message { get; private set; } = string.Empty;
    
    /// <summary>
    /// The related entity type (Announcement, Poll, Meeting, ForumPost, etc.)
    /// </summary>
    public string? RelatedEntityType { get; private set; }
    
    /// <summary>
    /// The ID of the related entity for navigation
    /// </summary>
    public Guid? RelatedEntityId { get; private set; }
    
    /// <summary>
    /// URL path to navigate to when clicking the notification
    /// </summary>
    public string? ActionUrl { get; private set; }
    
    public bool IsRead { get; private set; }
    public DateTime? ReadAt { get; private set; }
    
    public DateTime CreatedAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }

    private Notification() { }

    public static Notification Create(
        Guid condominiumId,
        Guid userId,
        NotificationType type,
        string title,
        string message,
        NotificationPriority priority = NotificationPriority.Normal,
        Guid? unitId = null,
        string? relatedEntityType = null,
        Guid? relatedEntityId = null,
        string? actionUrl = null,
        DateTime? expiresAt = null)
    {
        return new Notification
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            UserId = userId,
            UnitId = unitId,
            Type = type,
            Priority = priority,
            Title = title,
            Message = message,
            RelatedEntityType = relatedEntityType,
            RelatedEntityId = relatedEntityId,
            ActionUrl = actionUrl,
            IsRead = false,
            ReadAt = null,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt
        };
    }

    public void MarkAsRead()
    {
        if (!IsRead)
        {
            IsRead = true;
            ReadAt = DateTime.UtcNow;
        }
    }

    public void MarkAsUnread()
    {
        IsRead = false;
        ReadAt = null;
    }
}
