using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Incidents;

/// <summary>
/// Represents an incident or maintenance request in the condominium
/// </summary>
public class Incident : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid? UnitId { get; private set; }
    public Guid ReportedById { get; private set; }
    public Guid? AssignedToId { get; private set; }
    
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public IncidentType Type { get; private set; }
    public IncidentPriority Priority { get; private set; }
    public IncidentStatus Status { get; private set; }
    public string? Location { get; private set; }
    
    // Resolution
    public string? ResolutionNotes { get; private set; }
    public DateTime? ResolvedAt { get; private set; }
    public Guid? ResolvedById { get; private set; }
    
    // Tracking
    public DateTime? AcknowledgedAt { get; private set; }
    public DateTime? InProgressAt { get; private set; }
    public DateTime? EstimatedCompletionDate { get; private set; }
    
    // Cost tracking
    public decimal? EstimatedCost { get; private set; }
    public decimal? ActualCost { get; private set; }

    private readonly List<IncidentComment> _comments = new();
    public IReadOnlyCollection<IncidentComment> Comments => _comments.AsReadOnly();

    private readonly List<IncidentAttachment> _attachments = new();
    public IReadOnlyCollection<IncidentAttachment> Attachments => _attachments.AsReadOnly();

    private Incident() { } // EF Core

    public static Incident Create(
        Guid condominiumId,
        Guid reportedById,
        string title,
        string description,
        IncidentType type,
        IncidentPriority priority,
        Guid? unitId = null,
        string? location = null)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));

        var incident = new Incident
        {
            CondominiumId = condominiumId,
            ReportedById = reportedById,
            UnitId = unitId,
            Title = title,
            Description = description,
            Type = type,
            Priority = priority,
            Status = IncidentStatus.Open,
            Location = location
        };

        return incident;
    }

    public void Update(string title, string description, IncidentType type, IncidentPriority priority, string? location)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));

        Title = title;
        Description = description;
        Type = type;
        Priority = priority;
        Location = location;
    }

    public void Acknowledge()
    {
        if (Status != IncidentStatus.Open)
            throw new InvalidOperationException("Only open incidents can be acknowledged");
            
        Status = IncidentStatus.Acknowledged;
        AcknowledgedAt = DateTime.UtcNow;
    }

    public void AssignTo(Guid userId, DateTime? estimatedCompletion = null)
    {
        AssignedToId = userId;
        EstimatedCompletionDate = estimatedCompletion;
        
        if (Status == IncidentStatus.Open || Status == IncidentStatus.Acknowledged)
        {
            Status = IncidentStatus.InProgress;
            InProgressAt = DateTime.UtcNow;
        }
    }

    public void StartProgress()
    {
        if (Status == IncidentStatus.Resolved || Status == IncidentStatus.Closed)
            throw new InvalidOperationException("Cannot start progress on resolved or closed incidents");
            
        Status = IncidentStatus.InProgress;
        InProgressAt ??= DateTime.UtcNow;
    }

    public void SetEstimates(decimal? estimatedCost, DateTime? estimatedCompletion)
    {
        EstimatedCost = estimatedCost;
        EstimatedCompletionDate = estimatedCompletion;
    }

    public void Resolve(Guid resolvedById, string resolutionNotes, decimal? actualCost = null)
    {
        Guard.Against.NullOrWhiteSpace(resolutionNotes, nameof(resolutionNotes));
        
        Status = IncidentStatus.Resolved;
        ResolvedById = resolvedById;
        ResolutionNotes = resolutionNotes;
        ResolvedAt = DateTime.UtcNow;
        ActualCost = actualCost;
    }

    public void Close()
    {
        if (Status != IncidentStatus.Resolved)
            throw new InvalidOperationException("Only resolved incidents can be closed");
            
        Status = IncidentStatus.Closed;
    }

    public void Reopen(string reason)
    {
        if (Status != IncidentStatus.Resolved && Status != IncidentStatus.Closed)
            throw new InvalidOperationException("Only resolved or closed incidents can be reopened");
            
        Status = IncidentStatus.Open;
        ResolvedAt = null;
        ResolvedById = null;
        ResolutionNotes = null;
        
        AddComment(ReportedById, $"Incidencia reabierta: {reason}");
    }

    public void AddComment(Guid userId, string content)
    {
        var comment = IncidentComment.Create(Id, userId, content);
        _comments.Add(comment);
    }

    public void AddAttachment(string fileName, string fileUrl, string? contentType = null, long? fileSize = null)
    {
        var attachment = IncidentAttachment.Create(Id, fileName, fileUrl, contentType, fileSize);
        _attachments.Add(attachment);
    }
}

public class IncidentComment : BaseEntity
{
    public Guid IncidentId { get; private set; }
    public Guid UserId { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public bool IsInternal { get; private set; } // Only visible to staff

    private IncidentComment() { }

    public static IncidentComment Create(Guid incidentId, Guid userId, string content, bool isInternal = false)
    {
        Guard.Against.NullOrWhiteSpace(content, nameof(content));
        
        return new IncidentComment
        {
            IncidentId = incidentId,
            UserId = userId,
            Content = content,
            IsInternal = isInternal
        };
    }
}

public class IncidentAttachment : BaseEntity
{
    public Guid IncidentId { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string FileUrl { get; private set; } = string.Empty;
    public string? ContentType { get; private set; }
    public long? FileSize { get; private set; }

    private IncidentAttachment() { }

    public static IncidentAttachment Create(Guid incidentId, string fileName, string fileUrl, string? contentType = null, long? fileSize = null)
    {
        Guard.Against.NullOrWhiteSpace(fileName, nameof(fileName));
        Guard.Against.NullOrWhiteSpace(fileUrl, nameof(fileUrl));
        
        return new IncidentAttachment
        {
            IncidentId = incidentId,
            FileName = fileName,
            FileUrl = fileUrl,
            ContentType = contentType,
            FileSize = fileSize
        };
    }
}
