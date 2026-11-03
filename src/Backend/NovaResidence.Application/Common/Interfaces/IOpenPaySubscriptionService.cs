namespace NovaResidence.Application.Common.Interfaces;

public interface IOpenPaySubscriptionService
{
    bool IsConfigured { get; }

    Task<OpenPayChargeResult> CreateSubscriptionChargeAsync(OpenPayCreateChargeRequest request, CancellationToken cancellationToken = default);

    Task<OpenPayChargeResult> GetChargeAsync(string transactionId, CancellationToken cancellationToken = default);
}

public record OpenPayCreateChargeRequest(
    Guid SubscriptionId,
    decimal Amount,
    int MonthsPaid,
    string TokenId,
    string DeviceSessionId,
    string CustomerName,
    string CustomerLastName,
    string CustomerEmail,
    string? CustomerPhone,
    string? CustomerAddressLine1 = null,
    string? CustomerPostalCode = null,
    string? CustomerCity = null,
    string? CustomerState = null,
    string? PaymentMethod = null,
    string? Description = null,
    string Currency = "MXN",
    string? OrderId = null,
    Dictionary<string, string>? Metadata = null);

public record OpenPayChargeResult(
    bool Success,
    string? TransactionId,
    string? Status,
    decimal Amount,
    string? ErrorMessage = null,
    string? AuthorizationCode = null,
    DateTime? OperationDate = null,
    string? RawPayload = null);
