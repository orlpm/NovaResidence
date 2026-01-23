using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Commands.CreateCondominium;

public class CreateCondominiumCommandHandler : IRequestHandler<CreateCondominiumCommand, Result<CreateCondominiumResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateCondominiumCommandHandler> _logger;

    public CreateCondominiumCommandHandler(
        IUnitOfWork unitOfWork,
        ILogger<CreateCondominiumCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<CreateCondominiumResponse>> Handle(
        CreateCondominiumCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating condominium: {Name} for user: {UserId}", request.Name, request.UserId);

        try
        {
            // Create address value object
            var address = Address.Create(
                street: request.Street,
                city: request.City,
                state: request.State,
                postalCode: request.PostalCode,
                country: request.Country,
                neighborhood: request.Neighborhood
            );

            // Create a default subscription plan ID (TODO: implement proper plan selection)
            var subscriptionPlanId = Guid.NewGuid();

            // Create the condominium
            var condominium = Condominium.Create(
                name: request.Name,
                address: address,
                subscriptionPlanId: subscriptionPlanId,
                description: request.Description
            );

            int totalUnits = 0;

            // Add buildings and units
            foreach (var buildingDto in request.Buildings)
            {
                var building = Building.Create(
                    condominiumId: condominium.Id,
                    name: buildingDto.Name,
                    totalFloors: buildingDto.TotalFloors,
                    description: buildingDto.Section
                );

                // Add units to building
                foreach (var unitDto in buildingDto.Units)
                {
                    var unit = Domain.Entities.Condominiums.Unit.Create(
                        buildingId: building.Id,
                        unitNumber: unitDto.UnitNumber,
                        floor: unitDto.Floor,
                        area: unitDto.Area > 0 ? unitDto.Area : 50m, // Default area
                        bedrooms: unitDto.Bedrooms > 0 ? unitDto.Bedrooms : 2,
                        bathrooms: unitDto.Bathrooms > 0 ? unitDto.Bathrooms : 1,
                        monthlyMaintenanceFee: unitDto.MonthlyMaintenanceFee > 0 ? unitDto.MonthlyMaintenanceFee : 100m
                    );

                    building.AddUnit(unit);
                    totalUnits++;
                }

                condominium.AddBuilding(building);
            }

            // Save condominium to database
            await _unitOfWork.Condominiums.AddAsync(condominium, cancellationToken);
            
            // Associate user as admin of the condominium
            if (request.UserId != Guid.Empty)
            {
                var user = await _unitOfWork.Users.GetByIdAsync(request.UserId, cancellationToken);
                if (user != null)
                {
                    user.AddCondominiumRole(condominium.Id, Domain.Enums.UserRole.CondominiumAdmin);
                    await _unitOfWork.Users.UpdateAsync(user, cancellationToken);
                    _logger.LogInformation("User {UserId} assigned as admin to condominium {CondominiumId}", request.UserId, condominium.Id);
                }
            }
            
            await _unitOfWork.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Condominium created successfully: {CondominiumId}, Buildings: {TotalBuildings}, Units: {TotalUnits}",
                condominium.Id, request.Buildings.Count, totalUnits);

            return Result.Success(new CreateCondominiumResponse(
                condominium.Id,
                condominium.Name,
                request.Buildings.Count,
                totalUnits
            ));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating condominium: {Name}", request.Name);
            return Result<CreateCondominiumResponse>.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating condominium: {ex.Message}" }, null));
        }
    }
}
