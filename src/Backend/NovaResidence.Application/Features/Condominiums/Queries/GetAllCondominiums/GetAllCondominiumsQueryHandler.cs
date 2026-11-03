using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetAllCondominiums;

public class GetAllCondominiumsQueryHandler : IRequestHandler<GetAllCondominiumsQuery, Result<List<CondominiumListDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<GetAllCondominiumsQueryHandler> _logger;

    public GetAllCondominiumsQueryHandler(
        IApplicationDbContext context,
        ILogger<GetAllCondominiumsQueryHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<CondominiumListDto>>> Handle(
        GetAllCondominiumsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting all condominiums for SuperAdmin");

        try
        {
            var condominiums = await _context.Condominiums
                .Include(c => c.Buildings)
                    .ThenInclude(b => b.Units)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync(cancellationToken);

            // Get condominium IDs
            var condominiumIds = condominiums.Select(c => c.Id).ToHashSet();

            // Group in memory. SQLite cannot translate the SelectMany/GroupBy form of this query.
            var users = await _context.Users
                .AsNoTracking()
                .Include(u => u.CondominiumRoles)
                .Where(u => !u.IsDeleted)
                .ToListAsync(cancellationToken);

            var userCounts = users
                .SelectMany(u => u.CondominiumRoles)
                .Where(cr => condominiumIds.Contains(cr.CondominiumId))
                .GroupBy(cr => cr.CondominiumId)
                .ToDictionary(g => g.Key, g => g.Count());

            var adminEmails = users
                .Where(u => u.IsActive)
                .SelectMany(u => u.CondominiumRoles.Select(cr => new { cr.CondominiumId, cr.Role, u.Email }))
                .Where(x => condominiumIds.Contains(x.CondominiumId) && x.Role == NovaResidence.Domain.Enums.UserRole.CondominiumAdmin)
                .GroupBy(x => x.CondominiumId)
                .ToDictionary(g => g.Key, g => g.First().Email);

            var result = condominiums.Select(c => new CondominiumListDto(
                c.Id,
                c.Name,
                c.Description,
                $"{c.Address.Street}, {c.Address.City}, {c.Address.State}",
                c.TaxId,
                c.LegalName,
                c.IsActive,
                c.Buildings.Count,
                c.Buildings.Sum(b => b.Units.Count),
                userCounts.GetValueOrDefault(c.Id, 0),
                c.CreatedAt,
                adminEmails.GetValueOrDefault(c.Id)
            )).ToList();

            _logger.LogInformation("Found {Count} condominiums", result.Count);
            return Result.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all condominiums");
            return Result<List<CondominiumListDto>>.Error(new Ardalis.Result.ErrorList(new[] { $"Error getting condominiums: {ex.Message}" }, null));
        }
    }
}
