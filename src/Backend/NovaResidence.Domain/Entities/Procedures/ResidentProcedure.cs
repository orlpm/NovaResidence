using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Procedures;

public enum ProcedureType
{
    Electricity = 0,
    Water = 1,
    Gas = 2,
    Internet = 3,
    Other = 99
}

public enum ProcedureStatus
{
    Pending = 0,
    Completed = 1,
    Overdue = 2,
    Cancelled = 3
}

public class ResidentProcedure : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid ResidentId { get; private set; }
    public Guid CreatedById { get; private set; }
    public Guid? ProcedureTemplateId { get; private set; }
    public ProcedureTemplate? ProcedureTemplate { get; private set; }

    public ProcedureType Type { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Requirements { get; private set; } = string.Empty;
    public DateTime DueDate { get; private set; }
    public bool IsMandatory { get; private set; }

    public ProcedureStatus Status { get; private set; }
    public DateTime? CompletedAt { get; private set; }
    public string? CompletionNotes { get; private set; }

    private ResidentProcedure() { }

    public static ResidentProcedure Create(
        Guid condominiumId,
        Guid residentId,
        Guid createdById,
        ProcedureType type,
        string title,
        string description,
        string requirements,
        DateTime dueDate,
        bool isMandatory,
        Guid? procedureTemplateId = null)
    {
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.Default(residentId, nameof(residentId));
        Guard.Against.Default(createdById, nameof(createdById));
        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));

        var procedure = new ResidentProcedure
        {
            CondominiumId = condominiumId,
            ResidentId = residentId,
            CreatedById = createdById,
            ProcedureTemplateId = procedureTemplateId,
            Type = type,
            Title = title.Trim(),
            Description = description.Trim(),
            Requirements = requirements?.Trim() ?? string.Empty,
            DueDate = dueDate,
            IsMandatory = isMandatory,
            Status = ProcedureStatus.Pending
        };

        procedure.EvaluateOverdue();
        return procedure;
    }

    public void UpdateDetails(
        ProcedureType type,
        string title,
        string description,
        string requirements,
        DateTime dueDate,
        bool isMandatory)
    {
        if (Status == ProcedureStatus.Completed || Status == ProcedureStatus.Cancelled)
            throw new InvalidOperationException("No se puede editar un trámite completado o cancelado");

        Guard.Against.NullOrWhiteSpace(title, nameof(title));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));

        Type = type;
        Title = title.Trim();
        Description = description.Trim();
        Requirements = requirements?.Trim() ?? string.Empty;
        DueDate = dueDate;
        IsMandatory = isMandatory;

        EvaluateOverdue();
    }

    public void MarkCompleted(string? notes = null)
    {
        if (Status == ProcedureStatus.Cancelled)
            throw new InvalidOperationException("No se puede completar un trámite cancelado");

        if (Status == ProcedureStatus.Completed)
            return;

        Status = ProcedureStatus.Completed;
        CompletedAt = DateTime.UtcNow;
        CompletionNotes = notes?.Trim();
    }

    public void Cancel()
    {
        if (Status == ProcedureStatus.Completed)
            throw new InvalidOperationException("No se puede cancelar un trámite completado");

        Status = ProcedureStatus.Cancelled;
    }

    public void EvaluateOverdue()
    {
        if (Status == ProcedureStatus.Pending && DueDate < DateTime.UtcNow)
        {
            Status = ProcedureStatus.Overdue;
        }

        if (Status == ProcedureStatus.Overdue && DueDate >= DateTime.UtcNow)
        {
            Status = ProcedureStatus.Pending;
        }
    }
}
