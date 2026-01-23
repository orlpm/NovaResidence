namespace NovaResidence.Application.Common.Interfaces;

/// <summary>
/// Service interfaces for external dependencies
/// Implementations will be in Infrastructure layer
/// </summary>

public interface IEmailService
{
    Task SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default);
    Task SendEmailWithTemplateAsync(string to, string templateId, object data, CancellationToken cancellationToken = default);
}

public interface ISmsService
{
    Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default);
}

public interface IBlobStorageService
{
    Task<string> UploadFileAsync(Stream fileStream, string fileName, string containerName, CancellationToken cancellationToken = default);
    Task<Stream> DownloadFileAsync(string fileName, string containerName, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string fileName, string containerName, CancellationToken cancellationToken = default);
    Task<string> GetFileUrlAsync(string fileName, string containerName, CancellationToken cancellationToken = default);
}

public interface IEventBusService
{
    Task PublishAsync<T>(T @event, CancellationToken cancellationToken = default) where T : class;
    Task PublishAsync(string eventType, object eventData, CancellationToken cancellationToken = default);
}

public interface IPaymentGatewayService
{
    Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request, CancellationToken cancellationToken = default);
    Task<PaymentResult> RefundPaymentAsync(string transactionId, decimal amount, CancellationToken cancellationToken = default);
    Task<PaymentStatus> GetPaymentStatusAsync(string transactionId, CancellationToken cancellationToken = default);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default);
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);
}

// DTOs for services
public record PaymentRequest(
    string PaymentMethod,
    decimal Amount,
    string Currency,
    Guid UserId,
    Guid InvoiceId,
    Dictionary<string, string>? Metadata = null);

public record PaymentResult(
    bool Success,
    string TransactionId,
    string? ErrorMessage = null);

public record PaymentStatus(
    string TransactionId,
    string Status,
    decimal Amount,
    DateTime ProcessedAt);
