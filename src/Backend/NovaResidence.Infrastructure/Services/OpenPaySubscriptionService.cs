using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Infrastructure.Services;

public sealed class OpenPaySettings
{
    public bool Enabled { get; set; }
    public bool UseSandbox { get; set; } = true;
    public string MerchantId { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
}

public sealed class OpenPaySubscriptionService : IOpenPaySubscriptionService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly HttpClient _httpClient;
    private readonly OpenPaySettings _settings;
    private readonly ILogger<OpenPaySubscriptionService> _logger;

    public OpenPaySubscriptionService(
        HttpClient httpClient,
        IOptions<OpenPaySettings> settings,
        ILogger<OpenPaySubscriptionService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public bool IsConfigured =>
        _settings.Enabled
        && !string.IsNullOrWhiteSpace(_settings.MerchantId)
        && !string.IsNullOrWhiteSpace(_settings.PublicKey)
        && !string.IsNullOrWhiteSpace(_settings.PrivateKey);

    public async Task<OpenPayChargeResult> CreateSubscriptionChargeAsync(OpenPayCreateChargeRequest request, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return new OpenPayChargeResult(false, null, null, request.Amount, "OpenPay no está configurado");

        var payload = new OpenPayChargeRequestDto
        {
            Method = "card",
            SourceId = request.TokenId,
            Amount = request.Amount,
            Currency = request.Currency,
            Description = request.Description ?? $"Suscripción NovaResidence ({request.MonthsPaid} mes(es))",
            DeviceSessionId = request.DeviceSessionId,
            OrderId = request.OrderId ?? $"SUB-{request.SubscriptionId:N}-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}",
            Customer = new OpenPayCustomerDto
            {
                Name = request.CustomerName,
                LastName = request.CustomerLastName,
                Email = request.CustomerEmail,
                PhoneNumber = request.CustomerPhone,
                Address = string.IsNullOrWhiteSpace(request.CustomerAddressLine1)
                    && string.IsNullOrWhiteSpace(request.CustomerPostalCode)
                    && string.IsNullOrWhiteSpace(request.CustomerCity)
                    && string.IsNullOrWhiteSpace(request.CustomerState)
                    ? null
                    : new OpenPayAddressDto
                    {
                        Line1 = request.CustomerAddressLine1,
                        PostalCode = request.CustomerPostalCode,
                        City = request.CustomerCity,
                        State = request.CustomerState,
                        CountryCode = "MX"
                    }
            },
            Metadata = request.Metadata
        };

        using var message = new HttpRequestMessage(HttpMethod.Post, $"{_settings.MerchantId}/charges")
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        ApplyAuth(message);

        using var response = await _httpClient.SendAsync(message, cancellationToken);
        var raw = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("OpenPay charge creation failed: {StatusCode} - {Raw}", (int)response.StatusCode, raw);
            return new OpenPayChargeResult(false, null, null, request.Amount, DescribeOpenPayError(raw), RawPayload: raw);
        }

        var parsed = ParseCharge(raw, request.Amount);
        return parsed with { RawPayload = raw };
    }

    public async Task<OpenPayChargeResult> GetChargeAsync(string transactionId, CancellationToken cancellationToken = default)
    {
        if (!IsConfigured)
            return new OpenPayChargeResult(false, null, null, 0, "OpenPay no está configurado");

        using var message = new HttpRequestMessage(HttpMethod.Get, $"{_settings.MerchantId}/charges/{transactionId}");
        ApplyAuth(message);

        using var response = await _httpClient.SendAsync(message, cancellationToken);
        var raw = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            _logger.LogWarning("OpenPay charge query failed: {StatusCode} - {Raw}", (int)response.StatusCode, raw);
            return new OpenPayChargeResult(false, transactionId, null, 0, DescribeOpenPayError(raw), RawPayload: raw);
        }

        var parsed = ParseCharge(raw, 0);
        return parsed with { RawPayload = raw };
    }

    private void ApplyAuth(HttpRequestMessage message)
    {
        var raw = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_settings.PrivateKey}:"));
        message.Headers.Authorization = new AuthenticationHeaderValue("Basic", raw);
    }

    private static OpenPayChargeResult ParseCharge(string raw, decimal fallbackAmount)
    {
        var dto = JsonSerializer.Deserialize<OpenPayChargeResponseDto>(raw, JsonOptions);
        if (dto is null)
            return new OpenPayChargeResult(false, null, null, fallbackAmount, "Respuesta inválida de OpenPay", RawPayload: raw);

        return new OpenPayChargeResult(
            Success: !string.IsNullOrWhiteSpace(dto.Id),
            TransactionId: dto.Id,
            Status: dto.Status,
            Amount: dto.Amount ?? fallbackAmount,
            ErrorMessage: dto.ErrorMessage,
            AuthorizationCode: dto.Authorization,
            OperationDate: dto.OperationDate,
            RawPayload: raw);
    }

    private static string DescribeOpenPayError(string raw)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<OpenPayErrorResponseDto>(raw, JsonOptions);
            var parts = new[]
            {
                dto?.Description,
                dto?.ErrorCode,
                dto?.Category
            }.Where(part => !string.IsNullOrWhiteSpace(part));

            var message = string.Join(" | ", parts);
            return string.IsNullOrWhiteSpace(message) ? raw : message;
        }
        catch (JsonException)
        {
            return raw;
        }
    }

    private sealed class OpenPayChargeRequestDto
    {
        [JsonPropertyName("method")]
        public string Method { get; set; } = "card";

        [JsonPropertyName("source_id")]
        public string SourceId { get; set; } = string.Empty;

        [JsonPropertyName("amount")]
        public decimal Amount { get; set; }

        [JsonPropertyName("currency")]
        public string Currency { get; set; } = "MXN";

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("device_session_id")]
        public string DeviceSessionId { get; set; } = string.Empty;

        [JsonPropertyName("order_id")]
        public string OrderId { get; set; } = string.Empty;

        [JsonPropertyName("customer")]
        public OpenPayCustomerDto Customer { get; set; } = new();

        [JsonPropertyName("metadata")]
        public Dictionary<string, string>? Metadata { get; set; }
    }

    private sealed class OpenPayCustomerDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("last_name")]
        public string LastName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("phone_number")]
        public string? PhoneNumber { get; set; }

        [JsonPropertyName("address")]
        public OpenPayAddressDto? Address { get; set; }
    }

    private sealed class OpenPayAddressDto
    {
        [JsonPropertyName("line1")]
        public string? Line1 { get; set; }

        [JsonPropertyName("postal_code")]
        public string? PostalCode { get; set; }

        [JsonPropertyName("city")]
        public string? City { get; set; }

        [JsonPropertyName("state")]
        public string? State { get; set; }

        [JsonPropertyName("country_code")]
        public string? CountryCode { get; set; }
    }

    private sealed class OpenPayChargeResponseDto
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("status")]
        public string? Status { get; set; }

        [JsonPropertyName("amount")]
        public decimal? Amount { get; set; }

        [JsonPropertyName("authorization")]
        public string? Authorization { get; set; }

        [JsonPropertyName("operation_date")]
        public DateTime? OperationDate { get; set; }

        [JsonPropertyName("description")]
        public string? ErrorMessage { get; set; }
    }

    private sealed class OpenPayErrorResponseDto
    {
        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("error_code")]
        public string? ErrorCode { get; set; }

        [JsonPropertyName("category")]
        public string? Category { get; set; }
    }
}
