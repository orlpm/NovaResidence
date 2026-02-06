using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Communications;

/// <summary>
/// Represents a virtual or in-person meeting/assembly
/// </summary>
public class Meeting : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public MeetingType Type { get; private set; }
    public MeetingStatus Status { get; private set; }
    public DateTime ScheduledDate { get; private set; }
    public DateTime? StartedAt { get; private set; }
    public DateTime? EndedAt { get; private set; }
    public string? Location { get; private set; }
    public string? VirtualMeetingUrl { get; private set; }
    public string? Agenda { get; private set; }
    public string? Minutes { get; private set; }
    public int RequiredQuorumPercentage { get; private set; }
    
    // Navigation
    private readonly List<MeetingAttendee> _attendees = new();
    public IReadOnlyCollection<MeetingAttendee> Attendees => _attendees.AsReadOnly();

    private Meeting() { } // EF Core

    public static Meeting Create(
        Guid condominiumId,
        string title,
        string description,
        MeetingType type,
        DateTime scheduledDate,
        string? location = null,
        string? virtualMeetingUrl = null,
        string? agenda = null,
        int requiredQuorumPercentage = 50)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));

        return new Meeting
        {
            CondominiumId = condominiumId,
            Title = title,
            Description = description,
            Type = type,
            Status = MeetingStatus.Scheduled,
            ScheduledDate = scheduledDate,
            Location = location,
            VirtualMeetingUrl = virtualMeetingUrl,
            Agenda = agenda,
            RequiredQuorumPercentage = requiredQuorumPercentage
        };
    }

    public void Update(string title, string description, DateTime scheduledDate, string? location, string? virtualMeetingUrl, string? agenda)
    {
        Title = title;
        Description = description;
        ScheduledDate = scheduledDate;
        Location = location;
        VirtualMeetingUrl = virtualMeetingUrl;
        Agenda = agenda;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Start()
    {
        Status = MeetingStatus.InProgress;
        StartedAt = DateTime.UtcNow;
    }

    public void End(string? minutes = null)
    {
        Status = MeetingStatus.Completed;
        EndedAt = DateTime.UtcNow;
        if (minutes != null)
        {
            Minutes = minutes;
        }
    }

    public void Cancel()
    {
        Status = MeetingStatus.Cancelled;
    }

    public void SetMinutes(string minutes)
    {
        Minutes = minutes;
        UpdatedAt = DateTime.UtcNow;
    }

    public void AddAttendee(MeetingAttendee attendee)
    {
        Guard.Against.Null(attendee, nameof(attendee));
        _attendees.Add(attendee);
    }

    public decimal GetQuorumPercentage(int totalUnits)
    {
        if (totalUnits == 0) return 0;
        var attendedUnits = _attendees.Where(a => a.AttendedAt != null).Select(a => a.UnitId).Distinct().Count();
        return (decimal)attendedUnits / totalUnits * 100;
    }

    public bool HasQuorum(int totalUnits)
    {
        return GetQuorumPercentage(totalUnits) >= RequiredQuorumPercentage;
    }
}

/// <summary>
/// Represents an attendee to a meeting
/// </summary>
public class MeetingAttendee : BaseEntity
{
    public Guid MeetingId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }
    public string? ResidentName { get; private set; }
    public AttendeeStatus Status { get; private set; }
    public DateTime? ConfirmedAt { get; private set; }
    public DateTime? AttendedAt { get; private set; }
    public bool IsProxy { get; private set; }
    public string? ProxyName { get; private set; }
    
    public Meeting? Meeting { get; private set; }

    private MeetingAttendee() { }

    public static MeetingAttendee Create(Guid meetingId, Guid unitId, Guid? residentId, string? residentName)
    {
        return new MeetingAttendee
        {
            MeetingId = meetingId,
            UnitId = unitId,
            ResidentId = residentId,
            ResidentName = residentName,
            Status = AttendeeStatus.Invited
        };
    }

    public void Confirm()
    {
        Status = AttendeeStatus.Confirmed;
        ConfirmedAt = DateTime.UtcNow;
    }

    public void Decline()
    {
        Status = AttendeeStatus.Declined;
    }

    public void MarkAttended()
    {
        Status = AttendeeStatus.Attended;
        AttendedAt = DateTime.UtcNow;
    }

    public void SetProxy(string proxyName)
    {
        IsProxy = true;
        ProxyName = proxyName;
    }
}
