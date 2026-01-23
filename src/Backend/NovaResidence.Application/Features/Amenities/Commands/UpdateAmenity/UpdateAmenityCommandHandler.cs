using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.UpdateAmenity;

public class UpdateAmenityCommandHandler : IRequestHandler<UpdateAmenityCommand, Result<UpdateAmenityResponse>>
{
    private readonly IApplicationDbContext _context;

    public UpdateAmenityCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<UpdateAmenityResponse>> Handle(UpdateAmenityCommand request, CancellationToken cancellationToken)
    {
        var amenity = await _context.Amenities
            .FirstOrDefaultAsync(a => a.Id == request.AmenityId, cancellationToken);

        if (amenity == null)
        {
            return Result<UpdateAmenityResponse>.Error(new Ardalis.Result.ErrorList(new[] { "Amenity not found" }, null));
        }

        amenity.Update(
            name: request.Name,
            description: request.Description,
            capacity: request.Capacity,
            openingTime: request.OpeningTime,
            closingTime: request.ClosingTime
        );

        amenity.SetReservationLimits(
            request.MinReservationHours,
            request.MaxReservationHours,
            request.ReservationFee
        );

        await _context.SaveChangesAsync(cancellationToken);

        return Result<UpdateAmenityResponse>.Success(new UpdateAmenityResponse(
            AmenityId: amenity.Id,
            Name: amenity.Name,
            IsActive: amenity.IsActive
        ));
    }
}
