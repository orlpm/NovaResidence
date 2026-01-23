using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents an incident/issue reported by a resident
/// </summary>
public class Incident : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Condominium? Condominium { get; private set; }
    
    public Guid UnitId { get; private set; }
    public Unit? Unit { get; private set; }
    
    public Guid ReportedByUserId { get; private set; }
    
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    
    public IncidentCategory Category { get; private set; }
    public IncidentPriority Priority { get; private set; }
    public IncidentStatus Status { get; private set; }
    
    public string? Location { get; private set; }
    public string? PhotoUrls { get; private set; } // JSON array of photo URLs
    
    public Guid? AssignedToUserId { get; private set; }
    public DateTime? AssignedAt { get; private set; }
    
    public DateTime? ResolvedAt { get; private set; }
    public string? ResolutionNotes { get; private set; }
    
    // Private constructor for EF Core
    private Incident() { }
    
    public static Incident Create(
        Guid condominiumId,
        Guid unitId,
        Guid reportedByUserId,
        string title,
        string description,
        IncidentCategory category,
        IncidentPriority priority,
        string? location = null)
    {
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.Default(unitId, nameof(unitId));
        Guard.Against.Default(reportedByUserId, nameof(reportedByUserId));
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));
        
        var incident = new Incident
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            UnitId = unitId,
            ReportedByUserId = reportedByUserId,
            Title = title,
            Description = description,
            Category = category,
            Priority = priority,
            Status = IncidentStatus.Open,
            Location = location,
            CreatedAt = DateTime.UtcNow
        };
        
        return incident;
    }
    
    public void UpdateDetails(string title, string description, IncidentCategory category, IncidentPriority priority, string? location)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));
        
        Title = title;
        Description = description;
        Category = category;
        Priority = priority;
        Location = location;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void AssignTo(Guid userId)
    {
        Guard.Against.Default(userId, nameof(userId));
        
        AssignedToUserId = userId;
        AssignedAt = DateTime.UtcNow;
        
        if (Status == IncidentStatus.Open)
        {
            Status = IncidentStatus.InProgress;
        }
        
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateStatus(IncidentStatus newStatus)
    {
        Status = newStatus;
        UpdatedAt = DateTime.UtcNow;
        
        if (newStatus == IncidentStatus.Resolved || newStatus == IncidentStatus.Closed)
        {
            ResolvedAt = DateTime.UtcNow;
        }
    }
    
    public void Resolve(string resolutionNotes)
    {
        Guard.Against.NullOrWhiteSpace(resolutionNotes, nameof(resolutionNotes));
        
        Status = IncidentStatus.Resolved;
        ResolutionNotes = resolutionNotes;
        ResolvedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Close()
    {
        Status = IncidentStatus.Closed;
        if (!ResolvedAt.HasValue)
        {
            ResolvedAt = DateTime.UtcNow;
        }
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Reopen()
    {
        Status = IncidentStatus.Open;
        ResolvedAt = null;
        ResolutionNotes = null;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void AddPhotos(string photoUrls)
    {
        PhotoUrls = photoUrls;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum IncidentCategory
{
    Maintenance = 1,
    Plumbing = 2,
    Electrical = 3,
    Security = 4,
    Noise = 5,
    Cleaning = 6,
    CommonAreas = 7,
    Parking = 8,
    Other = 99
}

public enum IncidentPriority
{
    Low = 1,
    Medium = 2,
    High = 3,
    Urgent = 4
}

public enum IncidentStatus
{
    Open = 1,
    InProgress = 2,
    Resolved = 3,
    Closed = 4,
    Cancelled = 5
}
