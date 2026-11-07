using Mediator;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.DeleteAmenity;

public record DeleteAmenityCommand(Guid AmenityId) : IRequest<Result<bool>>;
