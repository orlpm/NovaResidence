using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.ToggleAmenityStatus;

public class ToggleAmenityStatusCommandHandler : IRequestHandler<ToggleAmenityStatusCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;

    public ToggleAmenityStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<bool>> Handle(ToggleAmenityStatusCommand request, CancellationToken cancellationToken)
    {
        var amenity = await _context.Amenities
            .FirstOrDefaultAsync(a => a.Id == request.AmenityId, cancellationToken);

        if (amenity == null)
        {
            return Result<bool>.Error(new Ardalis.Result.ErrorList(new[] { "Amenity not found" }, null));
        }

        if (request.IsActive)
        {
            amenity.Activate();
        }
        else
        {
            amenity.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
