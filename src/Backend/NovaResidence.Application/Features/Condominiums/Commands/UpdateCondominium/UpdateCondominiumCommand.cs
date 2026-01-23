using MediatR;
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
    string Country
) : IRequest<Result>;
