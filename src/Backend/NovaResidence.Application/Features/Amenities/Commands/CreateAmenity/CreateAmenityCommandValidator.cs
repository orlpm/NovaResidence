using FluentValidation;

namespace NovaResidence.Application.Features.Amenities.Commands.CreateAmenity;

public class CreateAmenityCommandValidator : AbstractValidator<CreateAmenityCommand>
{
    public CreateAmenityCommandValidator()
    {
        RuleFor(x => x.CondominiumId)
            .NotEmpty().WithMessage("Condominium ID is required");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Name is required")
            .MaximumLength(100).WithMessage("Name cannot exceed 100 characters");

        RuleFor(x => x.Description)
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters");

        RuleFor(x => x.Type)
            .InclusiveBetween(1, 99).WithMessage("Invalid amenity type");

        RuleFor(x => x.Capacity)
            .GreaterThan(0).WithMessage("Capacity must be greater than 0");

        RuleFor(x => x.OpeningTime)
            .LessThan(x => x.ClosingTime).WithMessage("Opening time must be before closing time");

        RuleFor(x => x.MinReservationHours)
            .GreaterThan(0).When(x => x.RequiresReservation)
            .WithMessage("Minimum reservation hours must be greater than 0");

        RuleFor(x => x.MaxReservationHours)
            .GreaterThanOrEqualTo(x => x.MinReservationHours).When(x => x.RequiresReservation)
            .WithMessage("Maximum reservation hours must be greater than or equal to minimum");

        RuleFor(x => x.ReservationFee)
            .GreaterThanOrEqualTo(0).When(x => x.ReservationFee.HasValue)
            .WithMessage("Reservation fee cannot be negative");
    }
}
