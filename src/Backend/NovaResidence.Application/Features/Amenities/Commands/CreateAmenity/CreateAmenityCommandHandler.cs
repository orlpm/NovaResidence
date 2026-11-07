using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.CreateAmenity;

public class CreateAmenityCommandHandler : IRequestHandler<CreateAmenityCommand, Result<CreateAmenityResponse>>
{
    private readonly IApplicationDbContext _context;

    public CreateAmenityCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<CreateAmenityResponse>> Handle(CreateAmenityCommand request, CancellationToken cancellationToken)
    {
        // Verify condominium exists
        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == request.CondominiumId, cancellationToken);

        if (condominium == null)
        {
            return Result<CreateAmenityResponse>.Error(new Ardalis.Result.ErrorList(new[] { "Condominium not found" }, null));
        }

        // Create the amenity
        var amenity = Amenity.Create(
            condominiumId: request.CondominiumId,
            name: request.Name,
            description: request.Description,
            type: (AmenityType)request.Type,
            capacity: request.Capacity,
            requiresReservation: request.RequiresReservation,
            requiresApproval: request.RequiresApproval,
            openingTime: request.OpeningTime,
            closingTime: request.ClosingTime,
            reservationFee: request.ReservationFee
        );

        // Set reservation limits if provided
        if (request.MinReservationHours > 0 || request.MaxReservationHours > 0)
        {
            amenity.SetReservationLimits(
                request.MinReservationHours > 0 ? request.MinReservationHours : 1,
                request.MaxReservationHours > 0 ? request.MaxReservationHours : 4,
                request.ReservationFee
            );
        }

        _context.Amenities.Add(amenity);
        await _context.SaveChangesAsync(cancellationToken);

        return Result<CreateAmenityResponse>.Success(new CreateAmenityResponse(
            AmenityId: amenity.Id,
            Name: amenity.Name,
            Type: ((AmenityType)request.Type).ToString(),
            IsActive: amenity.IsActive
        ));
    }
}
