using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Communications;

/// <summary>
/// Represents a forum/bulletin board post
/// </summary>
public class ForumPost : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid AuthorId { get; private set; }
    public Guid? AuthorUnitId { get; private set; }
    public string AuthorName { get; private set; } = string.Empty;
    public string Title { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public ForumCategory Category { get; private set; }
    public ForumPostStatus Status { get; private set; }
    public bool IsPinned { get; private set; }
    public bool AllowComments { get; private set; }
    public int ViewCount { get; private set; }
    public DateTime? PinnedUntil { get; private set; }
    
    // Navigation
    private readonly List<ForumComment> _comments = new();
    public IReadOnlyCollection<ForumComment> Comments => _comments.AsReadOnly();
    
    private readonly List<ForumPostAttachment> _attachments = new();
    public IReadOnlyCollection<ForumPostAttachment> Attachments => _attachments.AsReadOnly();

    private ForumPost() { } // EF Core

    public static ForumPost Create(
        Guid condominiumId,
        Guid authorId,
        Guid? authorUnitId,
        string authorName,
        string title,
        string content,
        ForumCategory category,
        bool allowComments = true)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(content, nameof(content));

        return new ForumPost
        {
            CondominiumId = condominiumId,
            AuthorId = authorId,
            AuthorUnitId = authorUnitId,
            AuthorName = authorName,
            Title = title,
            Content = content,
            Category = category,
            Status = ForumPostStatus.Active,
            AllowComments = allowComments,
            ViewCount = 0
        };
    }

    public void Update(string title, string content, ForumCategory category, bool allowComments)
    {
        Title = title;
        Content = content;
        Category = category;
        AllowComments = allowComments;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Pin(DateTime? until = null)
    {
        IsPinned = true;
        PinnedUntil = until;
    }

    public void Unpin()
    {
        IsPinned = false;
        PinnedUntil = null;
    }

    public void Archive()
    {
        Status = ForumPostStatus.Archived;
    }

    public void Hide()
    {
        Status = ForumPostStatus.Hidden;
    }

    public void Restore()
    {
        Status = ForumPostStatus.Active;
    }

    public void IncrementViewCount()
    {
        ViewCount++;
    }

    public void AddComment(ForumComment comment)
    {
        Guard.Against.Null(comment, nameof(comment));
        if (AllowComments)
        {
            _comments.Add(comment);
        }
    }

    public void AddAttachment(ForumPostAttachment attachment)
    {
        Guard.Against.Null(attachment, nameof(attachment));
        _attachments.Add(attachment);
    }
}

/// <summary>
/// Represents a comment on a forum post
/// </summary>
public class ForumComment : BaseEntity
{
    public Guid ForumPostId { get; private set; }
    public Guid AuthorId { get; private set; }
    public string AuthorName { get; private set; } = string.Empty;
    public string Content { get; private set; } = string.Empty;
    public Guid? ParentCommentId { get; private set; }
    public bool IsHidden { get; private set; }
    
    public ForumPost? ForumPost { get; private set; }
    public ForumComment? ParentComment { get; private set; }
    
    private readonly List<ForumComment> _replies = new();
    public IReadOnlyCollection<ForumComment> Replies => _replies.AsReadOnly();

    private ForumComment() { }

    public static ForumComment Create(Guid forumPostId, Guid authorId, string authorName, string content, Guid? parentCommentId = null)
    {
        Guard.Against.NullOrWhiteSpace(content, nameof(content));

        return new ForumComment
        {
            ForumPostId = forumPostId,
            AuthorId = authorId,
            AuthorName = authorName,
            Content = content,
            ParentCommentId = parentCommentId,
            IsHidden = false
        };
    }

    public void Update(string content)
    {
        Content = content;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Hide()
    {
        IsHidden = true;
    }

    public void Show()
    {
        IsHidden = false;
    }
}

/// <summary>
/// Represents an attachment to a forum post
/// </summary>
public class ForumPostAttachment : BaseEntity
{
    public Guid ForumPostId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string FileUrl { get; private set; } = string.Empty;
    public string? ContentType { get; private set; }
    public long FileSize { get; private set; }
    
    public ForumPost? ForumPost { get; private set; }

    private ForumPostAttachment() { }

    public static ForumPostAttachment Create(Guid forumPostId, string fileName, string fileUrl, string? contentType, long fileSize)
    {
        Guard.Against.NullOrWhiteSpace(fileName, nameof(fileName));
        Guard.Against.NullOrWhiteSpace(fileUrl, nameof(fileUrl));

        return new ForumPostAttachment
        {
            ForumPostId = forumPostId,
            FileName = fileName,
            FileUrl = fileUrl,
            ContentType = contentType,
            FileSize = fileSize
        };
    }
}
