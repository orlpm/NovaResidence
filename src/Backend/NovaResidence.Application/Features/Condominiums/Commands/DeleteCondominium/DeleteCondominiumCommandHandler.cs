using Mediator;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Application.Features.Condominiums.Commands.DeleteCondominium;

public class DeleteCondominiumCommandHandler : IRequestHandler<DeleteCondominiumCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteCondominiumCommandHandler> _logger;

    public DeleteCondominiumCommandHandler(
        IApplicationDbContext context,
        IUnitOfWork unitOfWork,
        ILogger<DeleteCondominiumCommandHandler> logger)
    {
        _context = context;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async ValueTask<Result> Handle(DeleteCondominiumCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Deleting condominium {CondominiumId} and ALL associated data", request.CondominiumId);

        // Verify condominium exists
        var condominium = await _context.Condominiums
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == request.CondominiumId, cancellationToken);
        
        if (condominium == null)
        {
            return Result.NotFound($"Condominium with ID {request.CondominiumId} not found");
        }

        var deletedAt = DateTime.UtcNow;
        var counts = new Dictionary<string, int>();

        try
        {
            // Get all building and unit IDs for this condominium
            var buildingIds = await _context.Buildings
                .IgnoreQueryFilters()
                .Where(b => b.CondominiumId == request.CondominiumId)
                .Select(b => b.Id)
                .ToListAsync(cancellationToken);

            var unitIds = await _context.Units
                .IgnoreQueryFilters()
                .Where(u => buildingIds.Contains(u.BuildingId))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            // 1. Soft delete RESIDENTS
            var residents = await _context.Residents
                .IgnoreQueryFilters()
                .Where(r => unitIds.Contains(r.UnitId))
                .ToListAsync(cancellationToken);
            foreach (var resident in residents)
            {
                resident.IsDeleted = true;
                resident.DeletedAt = deletedAt;
            }
            counts["Residents"] = residents.Count;

            // 2. Soft delete UNITS
            var units = await _context.Units
                .IgnoreQueryFilters()
                .Where(u => buildingIds.Contains(u.BuildingId))
                .ToListAsync(cancellationToken);
            foreach (var unit in units)
            {
                unit.IsDeleted = true;
                unit.DeletedAt = deletedAt;
            }
            counts["Units"] = units.Count;

            // 3. Soft delete BUILDINGS
            var buildings = await _context.Buildings
                .IgnoreQueryFilters()
                .Where(b => b.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var building in buildings)
            {
                building.IsDeleted = true;
                building.DeletedAt = deletedAt;
            }
            counts["Buildings"] = buildings.Count;

            // 4. Soft delete COMMON AREAS
            var commonAreas = await _context.CommonAreas
                .IgnoreQueryFilters()
                .Where(ca => ca.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            var commonAreaIds = commonAreas.Select(ca => ca.Id).ToList();
            foreach (var ca in commonAreas)
            {
                ca.IsDeleted = true;
                ca.DeletedAt = deletedAt;
            }
            counts["CommonAreas"] = commonAreas.Count;

            // 5. Soft delete COMMON AREA RESERVATIONS
            var commonAreaReservations = await _context.CommonAreaReservations
                .IgnoreQueryFilters()
                .Where(r => commonAreaIds.Contains(r.CommonAreaId))
                .ToListAsync(cancellationToken);
            foreach (var reservation in commonAreaReservations)
            {
                reservation.IsDeleted = true;
                reservation.DeletedAt = deletedAt;
            }
            counts["CommonAreaReservations"] = commonAreaReservations.Count;

            // 6. Soft delete AMENITIES
            var amenities = await _context.Amenities
                .IgnoreQueryFilters()
                .Where(a => a.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            var amenityIds = amenities.Select(a => a.Id).ToList();
            foreach (var amenity in amenities)
            {
                amenity.IsDeleted = true;
                amenity.DeletedAt = deletedAt;
            }
            counts["Amenities"] = amenities.Count;

            // 7. Soft delete RESERVATIONS
            var reservations = await _context.Reservations
                .IgnoreQueryFilters()
                .Where(r => amenityIds.Contains(r.AmenityId))
                .ToListAsync(cancellationToken);
            foreach (var reservation in reservations)
            {
                reservation.IsDeleted = true;
                reservation.DeletedAt = deletedAt;
            }
            counts["Reservations"] = reservations.Count;

            // 8. Soft delete ANNOUNCEMENTS
            var announcements = await _context.Announcements
                .IgnoreQueryFilters()
                .Where(a => a.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var announcement in announcements)
            {
                announcement.IsDeleted = true;
                announcement.DeletedAt = deletedAt;
            }
            counts["Announcements"] = announcements.Count;

            // 9. Soft delete POLLS
            var polls = await _context.Polls
                .IgnoreQueryFilters()
                .Where(p => p.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var poll in polls)
            {
                poll.IsDeleted = true;
                poll.DeletedAt = deletedAt;
            }
            counts["Polls"] = polls.Count;

            // 10. Soft delete MEETINGS
            var meetings = await _context.Meetings
                .IgnoreQueryFilters()
                .Where(m => m.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var meeting in meetings)
            {
                meeting.IsDeleted = true;
                meeting.DeletedAt = deletedAt;
            }
            counts["Meetings"] = meetings.Count;

            // 11. Soft delete FORUM POSTS
            var forumPosts = await _context.ForumPosts
                .IgnoreQueryFilters()
                .Where(f => f.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var post in forumPosts)
            {
                post.IsDeleted = true;
                post.DeletedAt = deletedAt;
            }
            counts["ForumPosts"] = forumPosts.Count;

            // 12. Soft delete INCIDENTS (by unit, handle nullable UnitId)
            var incidents = await _context.Incidents
                .IgnoreQueryFilters()
                .Where(i => i.UnitId.HasValue && unitIds.Contains(i.UnitId.Value))
                .ToListAsync(cancellationToken);
            foreach (var incident in incidents)
            {
                incident.IsDeleted = true;
                incident.DeletedAt = deletedAt;
            }
            counts["Incidents"] = incidents.Count;

            // 13. Soft delete CHARGES
            var charges = await _context.Charges
                .IgnoreQueryFilters()
                .Where(c => c.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var charge in charges)
            {
                charge.IsDeleted = true;
                charge.DeletedAt = deletedAt;
            }
            counts["Charges"] = charges.Count;

            // 14. Soft delete FEE CONFIGURATIONS
            var feeConfigs = await _context.FeeConfigurations
                .IgnoreQueryFilters()
                .Where(f => f.CondominiumId == request.CondominiumId)
                .ToListAsync(cancellationToken);
            foreach (var fee in feeConfigs)
            {
                fee.IsDeleted = true;
                fee.DeletedAt = deletedAt;
            }
            counts["FeeConfigurations"] = feeConfigs.Count;

            // Note: Notifications entity doesn't inherit from BaseEntity and doesn't have IsDeleted/DeletedAt
            // They will be handled separately or removed by database constraints

            // 15. Finally, soft delete the CONDOMINIUM itself
            condominium.IsDeleted = true;
            condominium.DeletedAt = deletedAt;
            condominium.Deactivate();

            await _unitOfWork.SaveChangesAsync(cancellationToken);

            // Log summary
            var summary = string.Join(", ", counts.Where(kvp => kvp.Value > 0).Select(kvp => $"{kvp.Key}: {kvp.Value}"));
            _logger.LogInformation(
                "Condominium {CondominiumId} ({Name}) and ALL associated data soft-deleted successfully. Summary: {Summary}", 
                request.CondominiumId, 
                condominium.Name,
                summary.Length > 0 ? summary : "No associated data");

            return Result.Success();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting condominium {CondominiumId} and associated data", request.CondominiumId);
            return Result.CriticalError($"Error deleting condominium: {ex.Message}");
        }
    }
}
