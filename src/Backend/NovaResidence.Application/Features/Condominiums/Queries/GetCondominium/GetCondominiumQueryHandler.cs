using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetCondominium;

public class GetCondominiumQueryHandler : IRequestHandler<GetCondominiumQuery, Result<CondominiumDetailDto>>
{
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly IApplicationDbContext _context;
    private readonly ILogger<GetCondominiumQueryHandler> _logger;

    public GetCondominiumQueryHandler(
        ICondominiumRepository condominiumRepository,
        IApplicationDbContext context,
        ILogger<GetCondominiumQueryHandler> logger)
    {
        _condominiumRepository = condominiumRepository;
        _context = context;
        _logger = logger;
    }

    public async Task<Result<CondominiumDetailDto>> Handle(
        GetCondominiumQuery request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Fetching condominium with ID: {CondominiumId}", request.CondominiumId);

        var condominium = await _condominiumRepository
            .GetCondominiumWithBuildingsAsync(request.CondominiumId, cancellationToken);

        if (condominium == null)
        {
            return Result.NotFound($"Condominium with ID {request.CondominiumId} not found");
        }

        // Get all unit IDs for this condominium
        var unitIds = condominium.Buildings.SelectMany(b => b.Units).Select(u => u.Id).ToList();
        
        // Query residents info for all units in one query
        var residentsInfo = await _context.Residents
            .Where(r => unitIds.Contains(r.UnitId) && !r.IsDeleted && r.IsActive)
            .GroupBy(r => r.UnitId)
            .Select(g => new 
            {
                UnitId = g.Key,
                HasOwner = g.Any(r => r.Type == ResidentType.Owner),
                HasRegistered = g.Any(r => r.IsRegistered),
                TotalResidents = g.Count()
            })
            .ToDictionaryAsync(x => x.UnitId, cancellationToken);

        var dto = new CondominiumDetailDto(
            condominium.Id,
            condominium.Name,
            condominium.Description,
            new AddressDto(
                condominium.Address.Street,
                condominium.Address.City,
                condominium.Address.State,
                condominium.Address.PostalCode,
                condominium.Address.Country),
            condominium.IsActive,
            condominium.Buildings.Count,
            condominium.Buildings.Sum(b => b.Units.Count),
            condominium.CreatedAt,
            condominium.Buildings.Select(b => new BuildingDetailDto(
                b.Id,
                b.Name,
                b.Description,
                b.TotalFloors,
                b.StartsAtGroundFloor,
                b.Units.Count,
                b.Units.Select(u => {
                    var info = residentsInfo.GetValueOrDefault(u.Id);
                    return new UnitDetailDto(
                        u.Id,
                        u.UnitNumber,
                        u.Floor,
                        u.Area,
                        u.Bedrooms,
                        u.Bathrooms,
                        info?.HasOwner ?? false,
                        info?.HasRegistered ?? false,
                        info?.TotalResidents ?? 0
                    );
                }).ToList()
            )).ToList());

        return Result.Success(dto);
    }
}
