using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Common;

namespace NovaResidence.Application.Common.Interfaces;

/// <summary>
/// Application database context interface
/// This abstracts EF Core DbContext for the Application layer
/// </summary>
public interface IApplicationDbContext
{
    // Authentication Module
    DbSet<Domain.Entities.Authentication.User> Users { get; }
    DbSet<Domain.Entities.Authentication.Permission> Permissions { get; }
    DbSet<Domain.Entities.Authentication.RolePermission> RolePermissions { get; }
    DbSet<Domain.Entities.Authentication.UserPermission> UserPermissions { get; }
    DbSet<Domain.Entities.Authentication.CondominiumRolePermission> CondominiumRolePermissions { get; }
    
    // Condominium Module
    DbSet<Domain.Entities.Condominiums.Condominium> Condominiums { get; }
    DbSet<Domain.Entities.Condominiums.Building> Buildings { get; }
    DbSet<Domain.Entities.Condominiums.Unit> Units { get; }
    DbSet<Domain.Entities.Condominiums.CommonArea> CommonAreas { get; }
    DbSet<Domain.Entities.Condominiums.CommonAreaReservation> CommonAreaReservations { get; }
    DbSet<Domain.Entities.Condominiums.CondominiumCommonArea> CondominiumCommonAreas { get; }
    DbSet<Domain.Entities.Condominiums.Amenity> Amenities { get; }
    DbSet<Domain.Entities.Condominiums.Reservation> Reservations { get; }
    DbSet<Domain.Entities.Condominiums.Resident> Residents { get; }
    DbSet<Domain.Entities.Maps.CondominiumMap> CondominiumMaps { get; }
    DbSet<Domain.Entities.Maps.CondominiumMapMarker> CondominiumMapMarkers { get; }
    
    // Incidents Module
    DbSet<Domain.Entities.Incidents.Incident> Incidents { get; }
    DbSet<Domain.Entities.Incidents.IncidentComment> IncidentComments { get; }
    DbSet<Domain.Entities.Incidents.IncidentAttachment> IncidentAttachments { get; }
    
    // Billing Module
    DbSet<Domain.Entities.Billing.Charge> Charges { get; }
    DbSet<Domain.Entities.Billing.Payment> Payments { get; }
    DbSet<Domain.Entities.Billing.Invoice> Invoices { get; }
    DbSet<Domain.Entities.Billing.FeeConfiguration> FeeConfigurations { get; }
    
    // Communications Module
    DbSet<Domain.Entities.Communications.Announcement> Announcements { get; }
    DbSet<Domain.Entities.Communications.AnnouncementAttachment> AnnouncementAttachments { get; }
    DbSet<Domain.Entities.Communications.AnnouncementRecipient> AnnouncementRecipients { get; }
    DbSet<Domain.Entities.Communications.Poll> Polls { get; }
    DbSet<Domain.Entities.Communications.PollOption> PollOptions { get; }
    DbSet<Domain.Entities.Communications.PollVote> PollVotes { get; }
    DbSet<Domain.Entities.Communications.Meeting> Meetings { get; }
    DbSet<Domain.Entities.Communications.MeetingAttendee> MeetingAttendees { get; }
    DbSet<Domain.Entities.Communications.ForumPost> ForumPosts { get; }
    DbSet<Domain.Entities.Communications.ForumComment> ForumComments { get; }
    DbSet<Domain.Entities.Communications.ForumPostAttachment> ForumPostAttachments { get; }
    
    // Notifications Module
    DbSet<Domain.Entities.Notifications.Notification> Notifications { get; }
    
    // Subscriptions Module
    DbSet<Domain.Entities.Subscriptions.SubscriptionPlan> SubscriptionPlans { get; }
    DbSet<Domain.Entities.Subscriptions.Subscription> Subscriptions { get; }
    DbSet<Domain.Entities.Subscriptions.SubscriptionPayment> SubscriptionPayments { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Unit of Work pattern for transaction management
/// </summary>
public interface IUnitOfWork : IDisposable
{
    IUserRepository Users { get; }
    ICondominiumRepository Condominiums { get; }
    IUnitRepository Units { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task BeginTransactionAsync(CancellationToken cancellationToken = default);
    Task CommitTransactionAsync(CancellationToken cancellationToken = default);
    Task RollbackTransactionAsync(CancellationToken cancellationToken = default);
}
