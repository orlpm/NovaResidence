using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Commands.DeleteCondominium;

public record DeleteCondominiumCommand(Guid CondominiumId) : IRequest<Result>;
