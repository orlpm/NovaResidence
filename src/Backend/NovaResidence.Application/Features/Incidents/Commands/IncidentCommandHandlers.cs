using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Incidents;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Incidents.Commands;

public class CreateIncidentCommandHandler : IRequestHandler<CreateIncidentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreateIncidentCommandHandler> _logger;

    public CreateIncidentCommandHandler(IApplicationDbContext context, ILogger<CreateIncidentCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CreateIncidentCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var incident = Incident.Create(
                request.CondominiumId,
                request.ReportedById,
                request.Title,
                request.Description,
                request.Type,
                request.Priority,
                request.UnitId,
                request.Location
            );

            _context.Incidents.Add(incident);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created incident {IncidentId} for condominium {CondominiumId}", incident.Id, request.CondominiumId);
            return Result.Success(incident.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating incident");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating incident: {ex.Message}" }, null));
        }
    }
}

public class UpdateIncidentCommandHandler : IRequestHandler<UpdateIncidentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UpdateIncidentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdateIncidentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        incident.Update(request.Title, request.Description, request.Type, request.Priority, request.Location);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class AssignIncidentCommandHandler : IRequestHandler<AssignIncidentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public AssignIncidentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(AssignIncidentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        incident.AssignTo(request.AssignedToId, request.EstimatedCompletion);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class AcknowledgeIncidentCommandHandler : IRequestHandler<AcknowledgeIncidentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public AcknowledgeIncidentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(AcknowledgeIncidentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        try
        {
            incident.Acknowledge();
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class StartIncidentProgressCommandHandler : IRequestHandler<StartIncidentProgressCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public StartIncidentProgressCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(StartIncidentProgressCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        try
        {
            incident.StartProgress();
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class ResolveIncidentCommandHandler : IRequestHandler<ResolveIncidentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ResolveIncidentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ResolveIncidentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        incident.Resolve(request.ResolvedById, request.ResolutionNotes, request.ActualCost);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class CloseIncidentCommandHandler : IRequestHandler<CloseIncidentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public CloseIncidentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(CloseIncidentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        try
        {
            incident.Close();
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class ReopenIncidentCommandHandler : IRequestHandler<ReopenIncidentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ReopenIncidentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ReopenIncidentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents.FindAsync(new object[] { request.IncidentId }, cancellationToken);
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        try
        {
            incident.Reopen(request.Reason);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class AddIncidentCommentCommandHandler : IRequestHandler<AddIncidentCommentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public AddIncidentCommentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(AddIncidentCommentCommand request, CancellationToken cancellationToken)
    {
        var incident = await _context.Incidents
            .Include(i => i.Comments)
            .FirstOrDefaultAsync(i => i.Id == request.IncidentId, cancellationToken);
            
        if (incident == null)
            return Result.NotFound(new string[] { "Incident not found" });

        incident.AddComment(request.UserId, request.Content);
        await _context.SaveChangesAsync(cancellationToken);

        var comment = incident.Comments.LastOrDefault();
        return Result.Success(comment?.Id ?? Guid.Empty);
    }
}

