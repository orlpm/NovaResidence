using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Queries.GetCondominiumAmenities;

public class GetCondominiumAmenitiesQueryHandler : IRequestHandler<GetCondominiumAmenitiesQuery, Result<List<AmenityListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetCondominiumAmenitiesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<AmenityListDto>>> Handle(GetCondominiumAmenitiesQuery request, CancellationToken cancellationToken)
    {
        var amenities = await _context.Amenities
            .AsNoTracking()
            .Where(a => a.CondominiumId == request.CondominiumId)
            .OrderBy(a => a.Name)
            .ToListAsync(cancellationToken);

        var result = amenities.Select(MapToDto).ToList();

        return Result<List<AmenityListDto>>.Success(result);
    }

    private static AmenityListDto MapToDto(Amenity amenity)
    {
        return new AmenityListDto(
            Id: amenity.Id,
            Name: amenity.Name,
            Description: amenity.Description,
            Type: amenity.Type.ToString(),
            TypeId: (int)amenity.Type,
            Capacity: amenity.Capacity,
            RequiresReservation: amenity.RequiresReservation,
            RequiresApproval: amenity.RequiresApproval,
            IsActive: amenity.IsActive,
            ReservationFee: amenity.ReservationFee,
            OpeningTime: amenity.OpeningTime.ToString(@"hh\:mm"),
            ClosingTime: amenity.ClosingTime.ToString(@"hh\:mm")
        );
    }
}
