using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Repositories;

public class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<User?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(u => u.Email == email.ToLower(), cancellationToken);
    }

    public async Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .AnyAsync(u => u.Email == email.ToLower(), cancellationToken);
    }

    public async Task<IReadOnlyList<User>> GetUsersByCondominiumAsync(
        Guid condominiumId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(u => u.CondominiumRoles.Any(cr => cr.CondominiumId == condominiumId))
            .ToListAsync(cancellationToken);
    }
}

public class CondominiumRepository : Repository<Domain.Entities.Condominiums.Condominium>, ICondominiumRepository
{
    public CondominiumRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Condominium>> GetActiveCondominiumsAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(c => c.IsActive)
            .ToListAsync(cancellationToken);
    }

    public async Task<Domain.Entities.Condominiums.Condominium?> GetCondominiumWithBuildingsAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(c => c.Buildings)
                .ThenInclude(b => b.Units)
            .Include(c => c.CommonAreas)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }
}

public class BuildingRepository : Repository<Domain.Entities.Condominiums.Building>, IBuildingRepository
{
    public BuildingRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Building>> GetBuildingsByCondominiumAsync(
        Guid condominiumId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(b => b.CondominiumId == condominiumId)
            .Include(b => b.Units)
            .ToListAsync(cancellationToken);
    }

    public async Task<Domain.Entities.Condominiums.Building?> GetBuildingWithUnitsAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(b => b.Units)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);
    }
}

public class UnitRepository : Repository<Domain.Entities.Condominiums.Unit>, IUnitRepository
{
    public UnitRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Unit>> GetUnitsByBuildingAsync(
        Guid buildingId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(u => u.BuildingId == buildingId)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Unit>> GetUnitsByCondominiumAsync(
        Guid condominiumId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(u => u)
            .Where(u => _context.Buildings
                .Any(b => b.Id == u.BuildingId && b.CondominiumId == condominiumId))
            .ToListAsync(cancellationToken);
    }

    public async Task<Domain.Entities.Condominiums.Unit?> GetUnitByNumberAsync(
        Guid buildingId,
        string unitNumber,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(u => u.BuildingId == buildingId && u.UnitNumber == unitNumber, cancellationToken);
    }
}

public class ResidentRepository : Repository<Domain.Entities.Condominiums.Resident>, IResidentRepository
{
    public ResidentRepository(ApplicationDbContext context) : base(context)
    {
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Resident>> GetResidentsByUnitAsync(
        Guid unitId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(r => r.UnitId == unitId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Resident>> GetActiveResidentsByUnitAsync(
        Guid unitId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(r => r.UnitId == unitId && r.IsActive)
            .OrderBy(r => r.Type)
            .ThenBy(r => r.FirstName)
            .ToListAsync(cancellationToken);
    }

    public async Task<Domain.Entities.Condominiums.Resident?> GetByEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .FirstOrDefaultAsync(r => r.Email == email.ToLower() && r.IsActive, cancellationToken);
    }

    public async Task<Domain.Entities.Condominiums.Resident?> GetByInvitationTokenAsync(
        string token,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(r => r.Unit)
            .FirstOrDefaultAsync(r => r.InvitationToken == token, cancellationToken);
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Resident>> GetResidentsByCondominiumAsync(
        Guid condominiumId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(r => r.Unit)
                .ThenInclude(u => u!.Building)
            .Where(r => r.IsActive && _context.Buildings
                .Any(b => _context.Units
                    .Any(u => u.Id == r.UnitId && u.BuildingId == b.Id && b.CondominiumId == condominiumId)))
            .OrderBy(r => r.LastName)
            .ThenBy(r => r.FirstName)
            .ToListAsync(cancellationToken);
    }

    public async Task<Domain.Entities.Condominiums.Resident?> GetByUserIdAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Include(r => r.Unit)
                .ThenInclude(u => u!.Building)
            .FirstOrDefaultAsync(r => r.UserId == userId && r.IsActive, cancellationToken);
    }

    public async Task<IReadOnlyList<Domain.Entities.Condominiums.Resident>> GetResidentsWithoutUserAsync(
        CancellationToken cancellationToken = default)
    {
        return await _dbSet
            .Where(r => r.UserId == null && r.IsActive)
            .ToListAsync(cancellationToken);
    }
}
