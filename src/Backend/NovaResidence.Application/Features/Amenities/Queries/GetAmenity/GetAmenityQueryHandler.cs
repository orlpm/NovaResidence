using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Queries.GetAmenity;

public class GetAmenityQueryHandler : IRequestHandler<GetAmenityQuery, Result<AmenityDetailDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAmenityQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<AmenityDetailDto>> Handle(GetAmenityQuery request, CancellationToken cancellationToken)
    {
        var amenity = await _context.Amenities
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == request.AmenityId, cancellationToken);

        if (amenity == null)
        {
            return Result<AmenityDetailDto>.Error(new Ardalis.Result.ErrorList(new[] { "Amenity not found" }, null));
        }

        return Result<AmenityDetailDto>.Success(MapToDto(amenity));
    }

    private static AmenityDetailDto MapToDto(Amenity amenity)
    {
        return new AmenityDetailDto(
            Id: amenity.Id,
            CondominiumId: amenity.CondominiumId,
            Name: amenity.Name,
            Description: amenity.Description,
            Type: amenity.Type.ToString(),
            TypeId: (int)amenity.Type,
            Capacity: amenity.Capacity,
            RequiresReservation: amenity.RequiresReservation,
            RequiresApproval: amenity.RequiresApproval,
            IsActive: amenity.IsActive,
            ReservationFee: amenity.ReservationFee,
            MinReservationHours: amenity.MinReservationHours,
            MaxReservationHours: amenity.MaxReservationHours,
            Rules: amenity.Rules,
            OpeningTime: amenity.OpeningTime.ToString(@"hh\:mm"),
            ClosingTime: amenity.ClosingTime.ToString(@"hh\:mm"),
            CreatedAt: amenity.CreatedAt
        );
    }
}
