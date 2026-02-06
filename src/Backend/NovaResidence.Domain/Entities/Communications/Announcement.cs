using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Communications;

/// <summary>
/// Represents an announcement, circular, or meeting minute
/// </summary>
public class Announcement : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public AnnouncementType Type { get; private set; }
    public AnnouncementPriority Priority { get; private set; }
    public bool IsPublished { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public DateTime? ExpiresAt { get; private set; }
    
    // For meeting minutes
    public DateTime? MeetingDate { get; private set; }
    public string? MeetingLocation { get; private set; }
    
    // Navigation
    private readonly List<AnnouncementAttachment> _attachments = new();
    public IReadOnlyCollection<AnnouncementAttachment> Attachments => _attachments.AsReadOnly();
    
    private readonly List<AnnouncementRecipient> _recipients = new();
    public IReadOnlyCollection<AnnouncementRecipient> Recipients => _recipients.AsReadOnly();

    private Announcement() { } // EF Core

    public static Announcement Create(
        Guid condominiumId,
        string title,
        string content,
        AnnouncementType type,
        AnnouncementPriority priority = AnnouncementPriority.Normal,
        DateTime? expiresAt = null,
        DateTime? meetingDate = null,
        string? meetingLocation = null)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(content, nameof(content));

        return new Announcement
        {
            CondominiumId = condominiumId,
            Title = title,
            Content = content,
            Type = type,
            Priority = priority,
            ExpiresAt = expiresAt,
            MeetingDate = meetingDate,
            MeetingLocation = meetingLocation,
            IsPublished = false
        };
    }

    public void Update(string title, string content, AnnouncementType type, AnnouncementPriority priority, DateTime? expiresAt, DateTime? meetingDate, string? meetingLocation)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Title = title;
        Content = content;
        Type = type;
        Priority = priority;
        ExpiresAt = expiresAt;
        MeetingDate = meetingDate;
        MeetingLocation = meetingLocation;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Publish()
    {
        IsPublished = true;
        PublishedAt = DateTime.UtcNow;
    }

    public void Unpublish()
    {
        IsPublished = false;
        PublishedAt = null;
    }

    public void AddAttachment(AnnouncementAttachment attachment)
    {
        Guard.Against.Null(attachment, nameof(attachment));
        _attachments.Add(attachment);
    }

    public void AddRecipient(AnnouncementRecipient recipient)
    {
        Guard.Against.Null(recipient, nameof(recipient));
        _recipients.Add(recipient);
    }
}

/// <summary>
/// Attachment for an announcement
/// </summary>
public class AnnouncementAttachment : BaseEntity
{
    public Guid AnnouncementId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string FileUrl { get; private set; } = string.Empty;
    public string ContentType { get; private set; } = string.Empty;
    public long FileSize { get; private set; }
    
    public Announcement? Announcement { get; private set; }

    private AnnouncementAttachment() { }

    public static AnnouncementAttachment Create(
        Guid announcementId,
        string fileName,
        string fileUrl,
        string contentType,
        long fileSize)
    {
        return new AnnouncementAttachment
        {
            AnnouncementId = announcementId,
            FileName = fileName,
            FileUrl = fileUrl,
            ContentType = contentType,
            FileSize = fileSize
        };
    }
}

/// <summary>
/// Track which units/residents received the announcement
/// </summary>
public class AnnouncementRecipient : BaseEntity
{
    public Guid AnnouncementId { get; private set; }
    public Guid? UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }
    public bool IsRead { get; private set; }
    public DateTime? ReadAt { get; private set; }
    
    public Announcement? Announcement { get; private set; }

    private AnnouncementRecipient() { }

    public static AnnouncementRecipient Create(Guid announcementId, Guid? unitId, Guid? residentId)
    {
        return new AnnouncementRecipient
        {
            AnnouncementId = announcementId,
            UnitId = unitId,
            ResidentId = residentId,
            IsRead = false
        };
    }

    public void MarkAsRead()
    {
        IsRead = true;
        ReadAt = DateTime.UtcNow;
    }
}
