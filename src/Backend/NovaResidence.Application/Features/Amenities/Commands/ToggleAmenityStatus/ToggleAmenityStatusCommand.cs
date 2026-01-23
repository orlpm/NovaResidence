using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.ToggleAmenityStatus;

public record ToggleAmenityStatusCommand(Guid AmenityId, bool IsActive) : IRequest<Result<bool>>;
