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
    
    // Condominium Module
    DbSet<Domain.Entities.Condominiums.Condominium> Condominiums { get; }
    DbSet<Domain.Entities.Condominiums.Building> Buildings { get; }
    DbSet<Domain.Entities.Condominiums.Unit> Units { get; }
    DbSet<Domain.Entities.Condominiums.CommonArea> CommonAreas { get; }
    DbSet<Domain.Entities.Condominiums.CommonAreaReservation> CommonAreaReservations { get; }
    DbSet<Domain.Entities.Condominiums.Amenity> Amenities { get; }
    DbSet<Domain.Entities.Condominiums.Reservation> Reservations { get; }
    
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
