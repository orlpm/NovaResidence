using Mediator;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Entities.Localization;
using NovaResidence.Domain.Entities.Subscriptions;
using NovaResidence.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Commands.CreateCondominium;

public class CreateCondominiumCommandHandler : IRequestHandler<CreateCondominiumCommand, Result<CreateCondominiumResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IApplicationDbContext _dbContext;
    private readonly ILogger<CreateCondominiumCommandHandler> _logger;

    public CreateCondominiumCommandHandler(
        IUnitOfWork unitOfWork,
        IApplicationDbContext dbContext,
        ILogger<CreateCondominiumCommandHandler> logger)
    {
        _unitOfWork = unitOfWork;
        _dbContext = dbContext;
        _logger = logger;
    }

    public async ValueTask<Result<CreateCondominiumResponse>> Handle(
        CreateCondominiumCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Creating condominium: {Name} for user: {UserId}", request.Name, request.UserId);

        try
        {
            var resolvedCountryId = request.CountryId;
            var resolvedStateId = request.StateId;
            var countryName = request.Country;
            var stateName = request.State;

            if (request.StateId.HasValue)
            {
                var state = await _dbContext.GeoStates
                    .Include(s => s.Country)
                    .FirstOrDefaultAsync(s => s.Id == request.StateId.Value, cancellationToken);

                if (state == null)
                    return Result<CreateCondominiumResponse>.Invalid(new[] { new ValidationError { Identifier = nameof(request.StateId), ErrorMessage = "Estado no encontrado" } });

                resolvedStateId = state.Id;
                resolvedCountryId = state.CountryId;
                stateName = state.Name;
                countryName = state.Country?.Name ?? request.Country;

                if (request.CountryId.HasValue && request.CountryId.Value != state.CountryId)
                {
                    return Result<CreateCondominiumResponse>.Invalid(new[]
                    {
                        new ValidationError
                        {
                            Identifier = nameof(request.CountryId),
                            ErrorMessage = "El estado seleccionado no pertenece al país indicado"
                        }
                    });
                }
            }
            else if (request.CountryId.HasValue)
            {
                var country = await _dbContext.GeoCountries
                    .FirstOrDefaultAsync(c => c.Id == request.CountryId.Value, cancellationToken);

                if (country == null)
                    return Result<CreateCondominiumResponse>.Invalid(new[] { new ValidationError { Identifier = nameof(request.CountryId), ErrorMessage = "País no encontrado" } });

                resolvedCountryId = country.Id;
                countryName = country.Name;

                var hasActiveStates = await _dbContext.GeoStates
                    .AnyAsync(s => s.CountryId == country.Id && s.IsActive, cancellationToken);

                if (hasActiveStates)
                {
                    return Result<CreateCondominiumResponse>.Invalid(new[]
                    {
                        new ValidationError
                        {
                            Identifier = nameof(request.StateId),
                            ErrorMessage = "Debes seleccionar un estado para el país indicado"
                        }
                    });
                }
            }

            // Create address value object
            var address = Address.Create(
                street: request.Street,
                city: request.City,
                state: stateName,
                postalCode: request.PostalCode,
                country: countryName,
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
                ,
                countryId: resolvedCountryId,
                stateId: resolvedStateId
            );

            int totalUnits = 0;

            // Add buildings and units
            foreach (var buildingDto in request.Buildings)
            {
                var building = Building.Create(
                    condominiumId: condominium.Id,
                    name: buildingDto.Name,
                    totalFloors: buildingDto.TotalFloors,
                    description: buildingDto.Section,
                    startsAtGroundFloor: buildingDto.StartsAtGroundFloor
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

            // Auto-create or update a Trial subscription for the Admin user
            // SuperAdmins manage the SaaS — they don't need subscriptions
            try
            {
                if (request.UserId != Guid.Empty)
                {
                    var creatingUser = await _dbContext.Users
                        .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

                    if (creatingUser?.DefaultRole?.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) == true)
                    {
                        _logger.LogInformation("Skipping subscription for SuperAdmin {UserId}", request.UserId);
                    }
                    else
                    {
                    // Check if this admin already has a subscription
                    var existingSub = await _dbContext.Subscriptions
                        .Where(s => s.AdminUserId == request.UserId
                                && s.Status != SubscriptionStatus.Cancelled)
                        .OrderByDescending(s => s.CreatedAt)
                        .FirstOrDefaultAsync(cancellationToken);

                    if (existingSub != null)
                    {
                        // Admin already has a subscription — recalculate total units across all their condominiums
                        var adminCondoIds = await _dbContext.Users
                            .Where(u => u.Id == request.UserId)
                            .SelectMany(u => u.CondominiumRoles)
                            .Select(cr => cr.CondominiumId)
                            .ToListAsync(cancellationToken);

                        var totalAdminUnits = await _dbContext.Units
                            .Where(u => _dbContext.Buildings
                                .Where(b => adminCondoIds.Contains(b.CondominiumId))
                                .Select(b => b.Id)
                                .Contains(u.BuildingId))
                            .CountAsync(cancellationToken);

                        totalAdminUnits = Math.Max(totalAdminUnits, 1);
                        var newAmount = existingSub.Plan != null
                            ? existingSub.MonthlyAmount // keep same until plan recalc
                            : 0;

                        // Load plan for recalculation
                        var currentPlan = await _dbContext.SubscriptionPlans
                            .FirstOrDefaultAsync(p => p.Id == existingSub.SubscriptionPlanId, cancellationToken);
                        if (currentPlan != null)
                        {
                            newAmount = currentPlan.CalculateMonthlyPrice(totalAdminUnits);
                        }

                        existingSub.UpdateBilledUnits(totalAdminUnits, newAmount);
                        await _dbContext.SaveChangesAsync(cancellationToken);

                        _logger.LogInformation(
                            "Updated subscription for admin {UserId}: Units={Units}, Monthly=${Amount}",
                            request.UserId, totalAdminUnits, newAmount);
                    }
                    else
                    {
                        // No subscription yet — create a Trial for this admin
                        var effectiveUnits = Math.Max(totalUnits, 1);

                        var plans = await _dbContext.SubscriptionPlans
                            .Where(p => p.IsActive && !p.IsCustom)
                            .OrderBy(p => p.MinUnits)
                            .ToListAsync(cancellationToken);

                        var plan = plans
                            .Where(p => effectiveUnits >= p.MinUnits && (p.MaxUnits == null || effectiveUnits <= p.MaxUnits))
                            .FirstOrDefault() ?? plans.FirstOrDefault();

                        if (plan != null)
                        {
                            var monthlyAmount = plan.CalculateMonthlyPrice(effectiveUnits);
                            var subscription = Subscription.Create(
                                adminUserId: request.UserId,
                                subscriptionPlanId: plan.Id,
                                billedUnits: effectiveUnits,
                                monthlyAmount: monthlyAmount,
                                trialDays: plan.TrialDays > 0 ? plan.TrialDays : 30
                            );
                            _dbContext.Subscriptions.Add(subscription);
                            await _dbContext.SaveChangesAsync(cancellationToken);

                            _logger.LogInformation(
                                "Auto-created Trial subscription for admin {UserId}: Plan={Plan}, Units={Units}, Monthly=${Amount}",
                                request.UserId, plan.Name, effectiveUnits, monthlyAmount);
                        }
                        else
                        {
                            _logger.LogWarning("No subscription plans found. Skipping auto-subscription for admin {UserId}", request.UserId);
                        }
                    }
                    } // end else (non-SuperAdmin)
                }
            }
            catch (Exception subEx)
            {
                _logger.LogWarning(subEx, "Failed to auto-create/update subscription for admin {UserId}. It can be created manually.", request.UserId);
            }

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
