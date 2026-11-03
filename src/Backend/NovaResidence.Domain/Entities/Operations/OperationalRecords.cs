using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Operations;

public class ProviderAppointment : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid ProviderUserId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public DateTime ScheduledAt { get; private set; }
    public string? Notes { get; private set; }
    public int Status { get; private set; }

    private ProviderAppointment() { }

    public static ProviderAppointment Create(Guid condominiumId, Guid providerUserId, string title, DateTime scheduledAt, string? notes)
    {
        return new ProviderAppointment
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            ProviderUserId = providerUserId,
            Title = title.Trim(),
            ScheduledAt = scheduledAt,
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(),
            Status = 0,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Complete()
    {
        Status = 1;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class CondominiumDocument : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public DocumentType DocumentType { get; private set; }
    public string FileName { get; private set; } = string.Empty;
    public string FileUrl { get; private set; } = string.Empty;
    public Guid UploadedById { get; private set; }

    private CondominiumDocument() { }

    public static CondominiumDocument Create(
        Guid condominiumId,
        string title,
        DocumentType documentType,
        string fileName,
        string fileUrl,
        Guid uploadedById)
    {
        return new CondominiumDocument
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            Title = title.Trim(),
            DocumentType = documentType,
            FileName = fileName,
            FileUrl = fileUrl,
            UploadedById = uploadedById,
            CreatedAt = DateTime.UtcNow
        };
    }
}

public class CondominiumAreaReservation : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid CommonAreaId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid UnitId { get; private set; }
    public DateTime ReservationDate { get; private set; }
    public string StartTime { get; private set; } = string.Empty;
    public string EndTime { get; private set; } = string.Empty;
    public string? Purpose { get; private set; }
    public ReservationStatus Status { get; private set; }
    public string AreaName { get; private set; } = string.Empty;

    private CondominiumAreaReservation() { }

    public static CondominiumAreaReservation Create(
        Guid condominiumId,
        Guid commonAreaId,
        string areaName,
        Guid userId,
        Guid unitId,
        DateTime reservationDate,
        string startTime,
        string endTime,
        string? purpose)
    {
        return new CondominiumAreaReservation
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            CommonAreaId = commonAreaId,
            AreaName = areaName,
            UserId = userId,
            UnitId = unitId,
            ReservationDate = reservationDate.Date,
            StartTime = startTime,
            EndTime = endTime,
            Purpose = string.IsNullOrWhiteSpace(purpose) ? null : purpose.Trim(),
            Status = ReservationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Approve()
    {
        Status = ReservationStatus.Approved;
        UpdatedAt = DateTime.UtcNow;
    }
}
