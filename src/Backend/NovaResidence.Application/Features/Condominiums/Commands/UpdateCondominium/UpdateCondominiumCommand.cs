using Mediator;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Commands.UpdateCondominium;

public record UpdateCondominiumCommand(
    Guid CondominiumId,
    string Name,
    string? Description,
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    Guid? CountryId,
    Guid? StateId
) : IRequest<Result>;
