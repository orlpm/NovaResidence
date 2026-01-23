using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Entities.Authentication;
using NovaResidence.Domain.Entities.Condominiums;
using System.Reflection;

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
