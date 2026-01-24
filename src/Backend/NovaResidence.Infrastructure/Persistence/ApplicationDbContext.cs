using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Entities.Authentication;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Entities.Incidents;
using NovaResidence.Domain.Entities.Billing;
using System.Reflection;

// Aliases for disambiguation
using BillingPayment = NovaResidence.Domain.Entities.Billing.Payment;
using IncidentEntity = NovaResidence.Domain.Entities.Incidents.Incident;

namespace NovaResidence.Infrastructure.Persistence;

/// <summary>
/// Main database context using EF Core
/// Configured for SQL Server and Azure SQL Database
/// </summary>
public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    // Authentication Module
    public DbSet<User> Users => Set<User>();

    // Condominium Module
    public DbSet<Condominium> Condominiums => Set<Condominium>();
    public DbSet<Building> Buildings => Set<Building>();
    public DbSet<Unit> Units => Set<Unit>();
    public DbSet<CommonArea> CommonAreas => Set<CommonArea>();
    public DbSet<CommonAreaReservation> CommonAreaReservations => Set<CommonAreaReservation>();
    public DbSet<Resident> Residents => Set<Resident>();
    public DbSet<Amenity> Amenities => Set<Amenity>();
    public DbSet<Reservation> Reservations => Set<Reservation>();
    
    // Incidents Module
    public DbSet<IncidentEntity> Incidents => Set<IncidentEntity>();
    public DbSet<IncidentComment> IncidentComments => Set<IncidentComment>();
    public DbSet<IncidentAttachment> IncidentAttachments => Set<IncidentAttachment>();
    
    // Billing Module
    public DbSet<Charge> Charges => Set<Charge>();
    public DbSet<BillingPayment> Payments => Set<BillingPayment>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<FeeConfiguration> FeeConfigurations => Set<FeeConfiguration>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Apply all configurations from the assembly
        modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());

        // Global query filters for soft delete
        modelBuilder.Entity<User>().HasQueryFilter(u => !u.IsDeleted);
        modelBuilder.Entity<Condominium>().HasQueryFilter(c => !c.IsDeleted);
        modelBuilder.Entity<Building>().HasQueryFilter(b => !b.IsDeleted);
        modelBuilder.Entity<Unit>().HasQueryFilter(u => !u.IsDeleted);
        modelBuilder.Entity<CommonArea>().HasQueryFilter(ca => !ca.IsDeleted);
        modelBuilder.Entity<CommonAreaReservation>().HasQueryFilter(r => !r.IsDeleted);
        modelBuilder.Entity<Resident>().HasQueryFilter(r => !r.IsDeleted);
        modelBuilder.Entity<Amenity>().HasQueryFilter(a => !a.IsDeleted);
        modelBuilder.Entity<Reservation>().HasQueryFilter(r => !r.IsDeleted);
        
        // Incidents query filters
        modelBuilder.Entity<IncidentEntity>().HasQueryFilter(i => !i.IsDeleted);
        modelBuilder.Entity<IncidentComment>().HasQueryFilter(ic => !ic.IsDeleted);
        modelBuilder.Entity<IncidentAttachment>().HasQueryFilter(ia => !ia.IsDeleted);
        
        // Billing query filters
        modelBuilder.Entity<Charge>().HasQueryFilter(c => !c.IsDeleted);
        modelBuilder.Entity<BillingPayment>().HasQueryFilter(p => !p.IsDeleted);
        modelBuilder.Entity<Invoice>().HasQueryFilter(i => !i.IsDeleted);
        modelBuilder.Entity<FeeConfiguration>().HasQueryFilter(fc => !fc.IsDeleted);
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Handle auditing fields
        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    // TODO: Set CreatedBy from current user context
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    // TODO: Set UpdatedBy from current user context
                    break;

                case EntityState.Deleted:
                    entry.State = EntityState.Modified;
                    entry.Entity.IsDeleted = true;
                    entry.Entity.DeletedAt = DateTime.UtcNow;
                    // TODO: Set DeletedBy from current user context
                    break;
            }
        }

        // Dispatch domain events
        var domainEvents = ChangeTracker.Entries<BaseEntity>()
            .Select(e => e.Entity)
            .Where(e => e.DomainEvents.Any())
            .SelectMany(e => e.DomainEvents)
            .ToList();

        var result = await base.SaveChangesAsync(cancellationToken);

        // Clear domain events after saving
        foreach (var entity in ChangeTracker.Entries<BaseEntity>().Select(e => e.Entity))
        {
            entity.ClearDomainEvents();
        }

        // TODO: Publish domain events to event bus

        return result;
    }
}
