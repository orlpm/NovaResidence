using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Api.Security;
using NovaResidence.Domain.Entities.Operations;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccessService;
    private readonly IWebHostEnvironment _environment;

    public DocumentsController(
        ApplicationDbContext context,
        ITenantAccessService tenantAccessService,
        IWebHostEnvironment environment)
    {
        _context = context;
        _tenantAccessService = tenantAccessService;
        _environment = environment;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.CondominiumDocuments
            .AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();

        return Ok(ApiResponse<List<CondominiumDocumentDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpPost("upload")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Upload([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.FailureResponse("No se proporcionó archivo"));

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt" };
        if (!allowed.Contains(extension))
            return BadRequest(ApiResponse<object>.FailureResponse("Formato no permitido"));

        if (file.Length > 8 * 1024 * 1024)
            return BadRequest(ApiResponse<object>.FailureResponse("El archivo no debe superar 8MB"));

        var folder = Path.Combine(_environment.ContentRootPath, "uploads", "documents");
        Directory.CreateDirectory(folder);
        var storedName = $"{Guid.NewGuid()}{extension}";
        var path = Path.Combine(folder, storedName);
        await using (var stream = new FileStream(path, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var url = $"{Request.Scheme}://{Request.Host}/uploads/documents/{storedName}";
        return Ok(ApiResponse<UploadedFileDto>.SuccessResponse(new UploadedFileDto(file.FileName, url)));
    }

    [HttpPost]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Create([FromBody] CreateDocumentRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId))
            return Forbid();

        var userId = GetUserId();
        if (!userId.HasValue)
            return Unauthorized();

        var document = CondominiumDocument.Create(
            request.CondominiumId,
            request.Title,
            request.DocumentType,
            request.FileName,
            request.FileUrl,
            userId.Value);

        _context.CondominiumDocuments.Add(document);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<Guid>.SuccessResponse(document.Id, "Documento publicado"));
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirst("userId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    private static CondominiumDocumentDto Map(CondominiumDocument item) => new(
        item.Id,
        item.CondominiumId,
        item.Title,
        item.DocumentType,
        DocumentTypeName(item.DocumentType),
        item.FileName,
        item.FileUrl,
        item.CreatedAt);

    private static string DocumentTypeName(DocumentType type) => type switch
    {
        DocumentType.Contract => "Contrato",
        DocumentType.Invoice => "Factura",
        DocumentType.Receipt => "Recibo",
        DocumentType.IdentificationCard => "Identificación",
        DocumentType.PowerOfAttorney => "Poder",
        DocumentType.Regulation => "Reglamento",
        DocumentType.MeetingMinutes => "Acta",
        _ => "Otro"
    };
}

public record CondominiumDocumentDto(
    Guid Id,
    Guid CondominiumId,
    string Title,
    DocumentType DocumentType,
    string TypeName,
    string FileName,
    string FileUrl,
    DateTime CreatedAt);

public record UploadedFileDto(string FileName, string FileUrl);

public record CreateDocumentRequest(
    Guid CondominiumId,
    string Title,
    DocumentType DocumentType,
    string FileName,
    string FileUrl);
