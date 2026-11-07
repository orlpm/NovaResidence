using Mediator;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Commands.DeleteCondominium;

public record ToggleCondominiumStatusCommand(Guid CondominiumId, bool Activate) : IRequest<Result>;
