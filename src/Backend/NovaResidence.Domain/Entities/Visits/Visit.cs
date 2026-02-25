using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Visits;

/// <summary>
/// Represents a visitor request/record for a condominium unit
/// </summary>
public class Visit : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid RequestedById { get; private set; }  // The resident who requested
    
    // Visitor information
    public string VisitorName { get; private set; } = string.Empty;
    public string? VisitorIdentification { get; private set; }
    public string? VisitorPhone { get; private set; }
    public string? VisitorEmail { get; private set; }
    public int VisitorCount { get; private set; } = 1;
    
    // Vehicle info (optional)
    public string? VehiclePlate { get; private set; }
    public string? VehicleDescription { get; private set; }
    
    // Visit details
    public VisitType Type { get; private set; }
    public VisitStatus Status { get; private set; }
    public string? Purpose { get; private set; }
    public string? Notes { get; private set; }
    
    // Scheduling
    public DateTime ExpectedArrival { get; private set; }
    public DateTime? ExpectedDeparture { get; private set; }
    
    // Actual tracking
    public DateTime? CheckInAt { get; private set; }
    public DateTime? CheckOutAt { get; private set; }
    public Guid? CheckedInById { get; private set; }   // Security guard who checked in
    public Guid? CheckedOutById { get; private set; }   // Security guard who checked out
    
    // Approval
    public Guid? ApprovedById { get; private set; }
    public DateTime? ApprovedAt { get; private set; }
    public Guid? RejectedById { get; private set; }
    public DateTime? RejectedAt { get; private set; }
    public string? RejectionReason { get; private set; }

    private Visit() { } // EF Core

    public static Visit Create(
        Guid condominiumId,
        Guid unitId,
        Guid requestedById,
        string visitorName,
        VisitType type,
        DateTime expectedArrival,
        DateTime? expectedDeparture = null,
        string? visitorIdentification = null,
        string? visitorPhone = null,
        string? visitorEmail = null,
        int visitorCount = 1,
        string? vehiclePlate = null,
        string? vehicleDescription = null,
        string? purpose = null,
        string? notes = null)
    {
        Guard.Against.NullOrWhiteSpace(visitorName, nameof(visitorName));
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.Default(unitId, nameof(unitId));
        Guard.Against.Default(requestedById, nameof(requestedById));

        if (expectedArrival <= DateTime.UtcNow)
            throw new InvalidOperationException("La hora de llegada debe ser futura");

        return new Visit
        {
            CondominiumId = condominiumId,
            UnitId = unitId,
            RequestedById = requestedById,
            VisitorName = visitorName,
            VisitorIdentification = visitorIdentification,
            VisitorPhone = visitorPhone,
            VisitorEmail = visitorEmail,
            VisitorCount = visitorCount > 0 ? visitorCount : 1,
            VehiclePlate = vehiclePlate,
            VehicleDescription = vehicleDescription,
            Type = type,
            Status = VisitStatus.Pending,
            Purpose = purpose,
            Notes = notes,
            ExpectedArrival = expectedArrival,
            ExpectedDeparture = expectedDeparture
        };
    }

    public void Update(
        string visitorName,
        VisitType type,
        DateTime expectedArrival,
        DateTime? expectedDeparture,
        string? visitorIdentification,
        string? visitorPhone,
        string? visitorEmail,
        int visitorCount,
        string? vehiclePlate,
        string? vehicleDescription,
        string? purpose,
        string? notes)
    {
        if (Status != VisitStatus.Pending)
            throw new InvalidOperationException("Solo se pueden editar visitas pendientes");
        
        Guard.Against.NullOrWhiteSpace(visitorName, nameof(visitorName));

        if (expectedArrival <= DateTime.UtcNow)
            throw new InvalidOperationException("La hora de llegada debe ser futura");

        VisitorName = visitorName;
        Type = type;
        ExpectedArrival = expectedArrival;
        ExpectedDeparture = expectedDeparture;
        VisitorIdentification = visitorIdentification;
        VisitorPhone = visitorPhone;
        VisitorEmail = visitorEmail;
        VisitorCount = visitorCount > 0 ? visitorCount : 1;
        VehiclePlate = vehiclePlate;
        VehicleDescription = vehicleDescription;
        Purpose = purpose;
        Notes = notes;
    }

    public void Approve(Guid approvedById)
    {
        if (Status != VisitStatus.Pending)
            throw new InvalidOperationException("Solo se pueden aprobar visitas pendientes");
        
        Status = VisitStatus.Approved;
        ApprovedById = approvedById;
        ApprovedAt = DateTime.UtcNow;
    }

    public void Reject(Guid rejectedById, string? reason = null)
    {
        if (Status != VisitStatus.Pending)
            throw new InvalidOperationException("Solo se pueden rechazar visitas pendientes");
        
        Status = VisitStatus.Rejected;
        RejectedById = rejectedById;
        RejectedAt = DateTime.UtcNow;
        RejectionReason = reason;
    }

    public void CheckIn(Guid securityGuardId)
    {
        if (Status != VisitStatus.Approved && Status != VisitStatus.Pending)
            throw new InvalidOperationException("Solo se pueden registrar visitas aprobadas o pendientes");
        
        Status = VisitStatus.CheckedIn;
        CheckInAt = DateTime.UtcNow;
        CheckedInById = securityGuardId;
        
        // Auto-approve if was pending
        if (ApprovedById == null)
        {
            ApprovedById = securityGuardId;
            ApprovedAt = DateTime.UtcNow;
        }
    }

    public void CheckOut(Guid securityGuardId)
    {
        if (Status != VisitStatus.CheckedIn)
            throw new InvalidOperationException("Solo se puede registrar salida de visitas que están dentro del condominio");
        
        Status = VisitStatus.CheckedOut;
        CheckOutAt = DateTime.UtcNow;
        CheckedOutById = securityGuardId;
    }

    public void Cancel()
    {
        if (Status == VisitStatus.CheckedIn || Status == VisitStatus.CheckedOut)
            throw new InvalidOperationException("No se puede cancelar una visita que ya ingresó al condominio");
        
        Status = VisitStatus.Cancelled;
    }

    public void MarkExpired()
    {
        if (Status == VisitStatus.Pending || Status == VisitStatus.Approved)
        {
            Status = VisitStatus.Expired;
        }
    }
}
