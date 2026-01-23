using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetUserCondominiums;

public class GetUserCondominiumsQueryHandler : IRequestHandler<GetUserCondominiumsQuery, Result<List<UserCondominiumDto>>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<GetUserCondominiumsQueryHandler> _logger;

    public GetUserCondominiumsQueryHandler(
        IApplicationDbContext context,
        ILogger<GetUserCondominiumsQueryHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<List<UserCondominiumDto>>> Handle(
        GetUserCondominiumsQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Getting condominiums for user: {UserId}", request.UserId);

        try
        {
            // Get user with their condominium roles
            var user = await _context.Users
                .Include(u => u.CondominiumRoles)
                .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

            // Get user's condominium IDs from their roles
            var userCondominiumIds = user?.CondominiumRoles
                .Select(cr => cr.CondominiumId)
                .ToList() ?? new List<Guid>();

            // Si el usuario no tiene roles de condominio, devolver lista vacía
            // (para que se muestre el wizard de creación)
            if (!userCondominiumIds.Any())
            {
                _logger.LogInformation("User {UserId} has no condominium roles, returning empty list", request.UserId);
                return Result.Success(new List<UserCondominiumDto>());
            }

            // Base query for active, non-deleted condominiums that belong to the user
            var query = _context.Condominiums
                .Where(c => !c.IsDeleted && c.IsActive && userCondominiumIds.Contains(c.Id));

            var condominiums = await query
                .Include(c => c.Buildings)
                .ThenInclude(b => b.Units)
                .OrderByDescending(c => c.CreatedAt)
                .ToListAsync(cancellationToken);

            var result = condominiums.Select(c => new UserCondominiumDto(
                c.Id,
                c.Name,
                c.Description,
                $"{c.Address.Street}, {c.Address.City}, {c.Address.State}",
                c.IsActive,
                c.Buildings.Count,
                c.Buildings.Sum(b => b.Units.Count),
                c.CreatedAt
            )).ToList();

            _logger.LogInformation("Found {Count} condominiums for user {UserId}", result.Count, request.UserId);

            return Result.Success(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting condominiums for user: {UserId}", request.UserId);
            return Result<List<UserCondominiumDto>>.Error(new Ardalis.Result.ErrorList(new[] { $"Error getting condominiums: {ex.Message}" }, null));
        }
    }
}
