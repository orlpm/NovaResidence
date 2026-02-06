using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.PaymentProofs.Queries;

public class GetCondominiumPaymentProofsQueryHandler 
    : IRequestHandler<GetCondominiumPaymentProofsQuery, PagedList<PaymentProofListDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCondominiumPaymentProofsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedList<PaymentProofListDto>> Handle(
        GetCondominiumPaymentProofsQuery request, 
        CancellationToken cancellationToken)
    {
        var query = _context.PaymentProofs
            .Include(p => p.Unit)
                .ThenInclude(u => u.Building)
            .Include(p => p.Charge)
            .Include(p => p.SubmittedBy)
            .Include(p => p.ReviewedBy)
            .Where(p => p.CondominiumId == request.CondominiumId)
            .AsQueryable();

        if (request.Status.HasValue)
        {
            query = query.Where(p => p.Status == request.Status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(p => p.SubmittedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PaymentProofListDto(
                p.Id,
                p.CondominiumId,
                p.UnitId,
                p.Unit.UnitNumber,
                p.Unit.Building != null ? p.Unit.Building.Name : null,
                p.ChargeId,
                p.Charge.Concept,
                p.Charge.Amount,
                p.Amount,
                p.PaymentMethod,
                GetPaymentMethodName(p.PaymentMethod),
                p.ReferenceNumber,
                p.PaymentDate,
                p.BankName,
                p.OriginalFileName,
                p.Notes,
                p.Status,
                GetStatusName(p.Status),
                p.SubmittedAt,
                p.SubmittedBy.FirstName + " " + p.SubmittedBy.LastName,
                p.ReviewedAt,
                p.ReviewedBy != null ? p.ReviewedBy.FirstName + " " + p.ReviewedBy.LastName : null,
                p.ReviewComments
            ))
            .ToListAsync(cancellationToken);

        return new PagedList<PaymentProofListDto>(items, totalCount, request.PageNumber, request.PageSize);
    }

    private static string GetPaymentMethodName(PaymentMethod method) => method switch
    {
        PaymentMethod.Cash => "Efectivo",
        PaymentMethod.BankTransfer => "Transferencia Bancaria",
        PaymentMethod.CreditCard => "Tarjeta de Crédito",
        PaymentMethod.DebitCard => "Tarjeta de Débito",
        PaymentMethod.Check => "Cheque",
        PaymentMethod.SPEI => "SPEI",
        PaymentMethod.PayPal => "PayPal",
        _ => "Otro"
    };

    private static string GetStatusName(PaymentProofStatus status) => status switch
    {
        PaymentProofStatus.Pending => "Pendiente",
        PaymentProofStatus.Approved => "Aprobado",
        PaymentProofStatus.Rejected => "Rechazado",
        _ => "Desconocido"
    };
}

public class GetUnitPaymentProofsQueryHandler 
    : IRequestHandler<GetUnitPaymentProofsQuery, PagedList<PaymentProofListDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUnitPaymentProofsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedList<PaymentProofListDto>> Handle(
        GetUnitPaymentProofsQuery request, 
        CancellationToken cancellationToken)
    {
        var query = _context.PaymentProofs
            .Include(p => p.Unit)
                .ThenInclude(u => u.Building)
            .Include(p => p.Charge)
            .Include(p => p.SubmittedBy)
            .Include(p => p.ReviewedBy)
            .Where(p => p.UnitId == request.UnitId)
            .AsQueryable();

        if (request.Status.HasValue)
        {
            query = query.Where(p => p.Status == request.Status.Value);
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(p => p.SubmittedAt)
            .Skip((request.PageNumber - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PaymentProofListDto(
                p.Id,
                p.CondominiumId,
                p.UnitId,
                p.Unit.UnitNumber,
                p.Unit.Building != null ? p.Unit.Building.Name : null,
                p.ChargeId,
                p.Charge.Concept,
                p.Charge.Amount,
                p.Amount,
                p.PaymentMethod,
                GetPaymentMethodName(p.PaymentMethod),
                p.ReferenceNumber,
                p.PaymentDate,
                p.BankName,
                p.OriginalFileName,
                p.Notes,
                p.Status,
                GetStatusName(p.Status),
                p.SubmittedAt,
                p.SubmittedBy.FirstName + " " + p.SubmittedBy.LastName,
                p.ReviewedAt,
                p.ReviewedBy != null ? p.ReviewedBy.FirstName + " " + p.ReviewedBy.LastName : null,
                p.ReviewComments
            ))
            .ToListAsync(cancellationToken);

        return new PagedList<PaymentProofListDto>(items, totalCount, request.PageNumber, request.PageSize);
    }

    private static string GetPaymentMethodName(PaymentMethod method) => method switch
    {
        PaymentMethod.Cash => "Efectivo",
        PaymentMethod.BankTransfer => "Transferencia Bancaria",
        PaymentMethod.CreditCard => "Tarjeta de Crédito",
        PaymentMethod.DebitCard => "Tarjeta de Débito",
        PaymentMethod.Check => "Cheque",
        PaymentMethod.SPEI => "SPEI",
        PaymentMethod.PayPal => "PayPal",
        _ => "Otro"
    };

    private static string GetStatusName(PaymentProofStatus status) => status switch
    {
        PaymentProofStatus.Pending => "Pendiente",
        PaymentProofStatus.Approved => "Aprobado",
        PaymentProofStatus.Rejected => "Rechazado",
        _ => "Desconocido"
    };
}

public class GetPaymentProofQueryHandler 
    : IRequestHandler<GetPaymentProofQuery, PaymentProofDetailDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPaymentProofQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentProofDetailDto?> Handle(
        GetPaymentProofQuery request, 
        CancellationToken cancellationToken)
    {
        var proof = await _context.PaymentProofs
            .Include(p => p.Unit)
                .ThenInclude(u => u.Building)
            .Include(p => p.Charge)
            .Include(p => p.SubmittedBy)
            .Include(p => p.ReviewedBy)
            .FirstOrDefaultAsync(p => p.Id == request.PaymentProofId, cancellationToken);

        if (proof == null)
            return null;

        return new PaymentProofDetailDto(
            proof.Id,
            proof.CondominiumId,
            proof.UnitId,
            proof.Unit.UnitNumber,
            proof.Unit.Building?.Name,
            proof.ChargeId,
            proof.Charge.Concept,
            proof.Charge.Amount,
            proof.Charge.Balance,
            proof.Amount,
            proof.PaymentMethod,
            GetPaymentMethodName(proof.PaymentMethod),
            proof.ReferenceNumber,
            proof.PaymentDate,
            proof.BankName,
            proof.FileName,
            proof.OriginalFileName,
            proof.FilePath,
            proof.ContentType,
            proof.FileSize,
            proof.Notes,
            proof.Status,
            GetStatusName(proof.Status),
            proof.SubmittedAt,
            proof.SubmittedById,
            $"{proof.SubmittedBy.FirstName} {proof.SubmittedBy.LastName}",
            proof.ReviewedAt,
            proof.ReviewedById,
            proof.ReviewedBy != null ? $"{proof.ReviewedBy.FirstName} {proof.ReviewedBy.LastName}" : null,
            proof.ReviewComments,
            proof.PaymentId
        );
    }

    private static string GetPaymentMethodName(PaymentMethod method) => method switch
    {
        PaymentMethod.Cash => "Efectivo",
        PaymentMethod.BankTransfer => "Transferencia Bancaria",
        PaymentMethod.CreditCard => "Tarjeta de Crédito",
        PaymentMethod.DebitCard => "Tarjeta de Débito",
        PaymentMethod.Check => "Cheque",
        PaymentMethod.SPEI => "SPEI",
        PaymentMethod.PayPal => "PayPal",
        _ => "Otro"
    };

    private static string GetStatusName(PaymentProofStatus status) => status switch
    {
        PaymentProofStatus.Pending => "Pendiente",
        PaymentProofStatus.Approved => "Aprobado",
        PaymentProofStatus.Rejected => "Rechazado",
        _ => "Desconocido"
    };
}

public class GetPaymentProofFileQueryHandler 
    : IRequestHandler<GetPaymentProofFileQuery, PaymentProofFileDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPaymentProofFileQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentProofFileDto?> Handle(
        GetPaymentProofFileQuery request, 
        CancellationToken cancellationToken)
    {
        var proof = await _context.PaymentProofs
            .FirstOrDefaultAsync(p => p.Id == request.PaymentProofId, cancellationToken);

        if (proof == null)
            return null;

        // Read file from disk
        if (!File.Exists(proof.FilePath))
            return null;

        var content = await File.ReadAllBytesAsync(proof.FilePath, cancellationToken);

        return new PaymentProofFileDto(
            proof.OriginalFileName,
            proof.ContentType,
            content
        );
    }
}
