using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetCondominium;

public class GetCondominiumQueryHandler : IRequestHandler<GetCondominiumQuery, Result<CondominiumDetailDto>>
{
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly ILogger<GetCondominiumQueryHandler> _logger;

    public GetCondominiumQueryHandler(
        ICondominiumRepository condominiumRepository,
        ILogger<GetCondominiumQueryHandler> logger)
    {
        _condominiumRepository = condominiumRepository;
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
                b.Units.Count,
                b.Units.Select(u => new UnitDetailDto(
                    u.Id,
                    u.UnitNumber,
                    u.Floor,
                    u.Area,
                    u.Bedrooms,
                    u.Bathrooms
                )).ToList()
            )).ToList());

        return Result.Success(dto);
    }
}
