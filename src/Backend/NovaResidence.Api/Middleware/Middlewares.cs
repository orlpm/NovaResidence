using System.Net;
using System.Text.Json;
using NovaResidence.Shared.Exceptions;

namespace NovaResidence.Api.Middleware;

/// <summary>
/// Global exception handling middleware
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "An error occurred: {Message}", exception.Message);

        context.Response.ContentType = "application/json";

        var (statusCode, message, errors) = exception switch
        {
            ValidationException validationEx => (
                HttpStatusCode.BadRequest,
                "Validation error",
                validationEx.Errors.SelectMany(e => e.Value).ToList()
            ),
            NotFoundException notFoundEx => (
                HttpStatusCode.NotFound,
                notFoundEx.Message,
                new List<string>()
            ),
            UnauthorizedException => (
                HttpStatusCode.Unauthorized,
                "Unauthorized access",
                new List<string>()
            ),
            ForbiddenException => (
                HttpStatusCode.Forbidden,
                "Access forbidden",
                new List<string>()
            ),
            ConflictException conflictEx => (
                HttpStatusCode.Conflict,
                conflictEx.Message,
                new List<string>()
            ),
            _ => (
                HttpStatusCode.InternalServerError,
                "An internal server error occurred",
                new List<string> { exception.Message }
            )
        };

        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            Success = false,
            Message = message,
            Errors = errors,
            Timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(response);
        await context.Response.WriteAsync(json);
    }
}

/// <summary>
/// Middleware to resolve tenant (condominium) from request
/// For multi-tenancy support
/// </summary>
public class TenantResolutionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<TenantResolutionMiddleware> _logger;

    public TenantResolutionMiddleware(RequestDelegate next, ILogger<TenantResolutionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Try to get tenant ID from header, subdomain, or JWT claim
        var tenantId = GetTenantId(context);

        if (!string.IsNullOrEmpty(tenantId))
        {
            context.Items["TenantId"] = tenantId;
            _logger.LogInformation("Tenant resolved: {TenantId}", tenantId);
        }

        await _next(context);
    }

    private string? GetTenantId(HttpContext context)
    {
        // Option 1: From custom header
        if (context.Request.Headers.TryGetValue("X-Tenant-Id", out var tenantIdHeader))
        {
            return tenantIdHeader.FirstOrDefault();
        }

        // Option 2: From subdomain (e.g., condominio1.novaresidence.com)
        var host = context.Request.Host.Host;
        if (host.Contains('.'))
        {
            var subdomain = host.Split('.')[0];
            if (subdomain != "www" && subdomain != "api")
            {
                return subdomain;
            }
        }

        // Option 3: From JWT claims (to be implemented)
        // var tenantClaim = context.User?.FindFirst("tenant_id");
        // if (tenantClaim != null)
        // {
        //     return tenantClaim.Value;
        // }

        return null;
    }
}
