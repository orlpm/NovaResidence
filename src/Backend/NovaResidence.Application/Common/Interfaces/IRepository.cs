using NovaResidence.Domain.Entities.Authentication;
using NovaResidence.Domain.Entities.Condominiums;

namespace NovaResidence.Application.Common.Interfaces;

/// <summary>
/// Repository interfaces following the Repository pattern
/// These will be implemented in the Infrastructure layer
/// </summary>
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<T>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<T> AddAsync(T entity, CancellationToken cancellationToken = default);
    Task UpdateAsync(T entity, CancellationToken cancellationToken = default);
    Task DeleteAsync(T entity, CancellationToken cancellationToken = default);
}

public interface IUserRepository : IRepository<User>
{
    Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> GetByIdIncludingDeletedAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<User>> GetUsersByCondominiumAsync(Guid condominiumId, CancellationToken cancellationToken = default);
}

public interface ICondominiumRepository : IRepository<Condominium>
{
    Task<IReadOnlyList<Condominium>> GetActiveCondominiumsAsync(CancellationToken cancellationToken = default);
    Task<Condominium?> GetCondominiumWithBuildingsAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IBuildingRepository : IRepository<Building>
{
    Task<IReadOnlyList<Building>> GetBuildingsByCondominiumAsync(Guid condominiumId, CancellationToken cancellationToken = default);
    Task<Building?> GetBuildingWithUnitsAsync(Guid id, CancellationToken cancellationToken = default);
}

public interface IUnitRepository : IRepository<Unit>
{
    Task<IReadOnlyList<Unit>> GetUnitsByBuildingAsync(Guid buildingId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Unit>> GetUnitsByCondominiumAsync(Guid condominiumId, CancellationToken cancellationToken = default);
    Task<Unit?> GetUnitByNumberAsync(Guid buildingId, string unitNumber, CancellationToken cancellationToken = default);
}

public interface IResidentRepository : IRepository<Resident>
{
    Task<IReadOnlyList<Resident>> GetResidentsByUnitAsync(Guid unitId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Resident>> GetActiveResidentsByUnitAsync(Guid unitId, CancellationToken cancellationToken = default);
    Task<Resident?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<Resident?> GetByInvitationTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Resident>> GetResidentsByCondominiumAsync(Guid condominiumId, CancellationToken cancellationToken = default);
    Task<Resident?> GetByUserIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Resident>> GetResidentsWithoutUserAsync(CancellationToken cancellationToken = default);
}
