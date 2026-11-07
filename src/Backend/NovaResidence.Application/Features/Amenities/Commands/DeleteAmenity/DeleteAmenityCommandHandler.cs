using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.DeleteAmenity;

public class DeleteAmenityCommandHandler : IRequestHandler<DeleteAmenityCommand, Result<bool>>
{
    private readonly IApplicationDbContext _context;

    public DeleteAmenityCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<bool>> Handle(DeleteAmenityCommand request, CancellationToken cancellationToken)
    {
        var amenity = await _context.Amenities
            .FirstOrDefaultAsync(a => a.Id == request.AmenityId, cancellationToken);

        if (amenity == null)
        {
            return Result<bool>.Error(new Ardalis.Result.ErrorList(new[] { "Amenity not found" }, null));
        }

        // Soft delete - the SaveChangesAsync will handle it
        _context.Amenities.Remove(amenity);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<bool>.Success(true);
    }
}
