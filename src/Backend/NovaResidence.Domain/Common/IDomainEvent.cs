namespace NovaResidence.Domain.Common;

/// <summary>
/// Marker interface for domain events
/// </summary>
public interface IDomainEvent
{
    DateTime OccurredOn { get; }
    Guid EventId { get; }
}

public abstract record DomainEvent : IDomainEvent
{
    public DateTime OccurredOn { get; init; } = DateTime.UtcNow;
    public Guid EventId { get; init; } = Guid.NewGuid();
}
