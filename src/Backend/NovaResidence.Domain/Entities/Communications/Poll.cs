using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Communications;

/// <summary>
/// Represents a poll or voting session
/// </summary>
public class Poll : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public PollType Type { get; private set; }
    public PollStatus Status { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public bool AllowMultipleVotes { get; private set; }
    public bool IsAnonymous { get; private set; }
    public bool RequiresQuorum { get; private set; }
    public int? QuorumPercentage { get; private set; }
    
    // Navigation
    private readonly List<PollOption> _options = new();
    public IReadOnlyCollection<PollOption> Options => _options.AsReadOnly();
    
    private readonly List<PollVote> _votes = new();
    public IReadOnlyCollection<PollVote> Votes => _votes.AsReadOnly();

    private Poll() { } // EF Core

    public static Poll Create(
        Guid condominiumId,
        string title,
        string description,
        PollType type,
        DateTime startDate,
        DateTime endDate,
        bool allowMultipleVotes = false,
        bool isAnonymous = false,
        bool requiresQuorum = false,
        int? quorumPercentage = null)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.OutOfRange(endDate, nameof(endDate), startDate, DateTime.MaxValue);

        return new Poll
        {
            CondominiumId = condominiumId,
            Title = title,
            Description = description,
            Type = type,
            Status = PollStatus.Draft,
            StartDate = startDate,
            EndDate = endDate,
            AllowMultipleVotes = allowMultipleVotes,
            IsAnonymous = isAnonymous,
            RequiresQuorum = requiresQuorum,
            QuorumPercentage = quorumPercentage
        };
    }

    public void Update(string title, string description, DateTime startDate, DateTime endDate)
    {
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Title = title;
        Description = description;
        StartDate = startDate;
        EndDate = endDate;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Publish()
    {
        Status = PollStatus.Active;
    }

    public void Close()
    {
        Status = PollStatus.Closed;
    }

    public void Cancel()
    {
        Status = PollStatus.Cancelled;
    }

    public void AddOption(PollOption option)
    {
        Guard.Against.Null(option, nameof(option));
        _options.Add(option);
    }

    public void AddVote(PollVote vote)
    {
        Guard.Against.Null(vote, nameof(vote));
        _votes.Add(vote);
    }
}

/// <summary>
/// Option for a poll
/// </summary>
public class PollOption : BaseEntity
{
    public Guid PollId { get; private set; }
    public string Text { get; private set; } = string.Empty;
    public int DisplayOrder { get; private set; }
    
    public Poll? Poll { get; private set; }

    private PollOption() { }

    public static PollOption Create(Guid pollId, string text, int displayOrder)
    {
        Guard.Against.NullOrWhiteSpace(text, nameof(text));
        
        return new PollOption
        {
            PollId = pollId,
            Text = text,
            DisplayOrder = displayOrder
        };
    }
}

/// <summary>
/// A vote cast in a poll
/// </summary>
public class PollVote : BaseEntity
{
    public Guid PollId { get; private set; }
    public Guid PollOptionId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }
    public DateTime VotedAt { get; private set; }
    
    public Poll? Poll { get; private set; }
    public PollOption? PollOption { get; private set; }

    private PollVote() { }

    public static PollVote Create(Guid pollId, Guid pollOptionId, Guid unitId, Guid? residentId)
    {
        return new PollVote
        {
            PollId = pollId,
            PollOptionId = pollOptionId,
            UnitId = unitId,
            ResidentId = residentId,
            VotedAt = DateTime.UtcNow
        };
    }
}
