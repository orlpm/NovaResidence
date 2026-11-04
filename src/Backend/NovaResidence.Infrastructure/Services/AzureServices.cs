using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using MailKit.Net.Smtp;
using MailKit.Security;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Net.Http.Json;
using System.Text.Json;
using MimeKit;

namespace NovaResidence.Infrastructure.Services;

public class AzureBlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<AzureBlobStorageService> _logger;

    public AzureBlobStorageService(
        BlobServiceClient blobServiceClient,
        ILogger<AzureBlobStorageService> logger)
    {
        _blobServiceClient = blobServiceClient;
        _logger = logger;
    }

    public async Task<string> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
            await containerClient.CreateIfNotExistsAsync(cancellationToken: cancellationToken);

            var blobClient = containerClient.GetBlobClient(fileName);
            await blobClient.UploadAsync(fileStream, overwrite: true, cancellationToken);

            _logger.LogInformation("File uploaded successfully: {FileName} to container: {Container}",
                fileName, containerName);

            return blobClient.Uri.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file: {FileName}", fileName);
            throw;
        }
    }

    public async Task<Stream> DownloadFileAsync(
        string fileName,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(fileName);

        var response = await blobClient.DownloadStreamingAsync(cancellationToken: cancellationToken);
        return response.Value.Content;
    }

    public async Task DeleteFileAsync(
        string fileName,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(fileName);

        await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
    }

    public Task<string> GetFileUrlAsync(
        string fileName,
        string containerName,
        CancellationToken cancellationToken = default)
    {
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        var blobClient = containerClient.GetBlobClient(fileName);

        return Task.FromResult(blobClient.Uri.ToString());
    }
}

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public EmailService(
        ILogger<EmailService> logger,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task SendEmailAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        await CaptureOutboxAsync(to, subject, body, cancellationToken);

        if (_configuration.GetValue<bool>("Email:DisableSending"))
        {
            _logger.LogInformation("Email sending disabled. Skipping email to: {To}, Subject: {Subject}", to, subject);
            await Task.CompletedTask;
            return;
        }

        if (IsReservedTestRecipient(to))
        {
            _logger.LogInformation("Skipping email to reserved test domain: {To}, Subject: {Subject}", to, subject);
            return;
        }

        var apiKey = _configuration["Email:BrevoApiKey"];
        var senderEmail = _configuration["Email:FromEmail"];
        var senderName = _configuration["Email:FromName"] ?? "DomusCond";

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(senderEmail))
        {
            throw new InvalidOperationException("Brevo email is not configured. Set Email:BrevoApiKey and Email:FromEmail.");
        }
        
        if (apiKey.StartsWith("xsmtpsib-", StringComparison.OrdinalIgnoreCase))
        {
            await SendEmailViaBrevoSmtpAsync(to, subject, body, senderEmail, senderName, apiKey, cancellationToken);
            return;
        }

        var client = _httpClientFactory.CreateClient("BrevoEmail");
        using var response = await client.PostAsJsonAsync(
            "v3/smtp/email",
            new
            {
                sender = new { email = senderEmail, name = senderName },
                to = new[] { new { email = to } },
                subject,
                htmlContent = body,
                textContent = ConvertHtmlToPlainText(body)
            },
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Brevo email send failed. Status: {StatusCode}, Response: {Response}", response.StatusCode, errorContent);
            throw new InvalidOperationException("No fue posible enviar el correo con Brevo.");
        }

        _logger.LogInformation("Email sent via Brevo to: {To}, Subject: {Subject}", to, subject);
    }

    public async Task SendEmailWithTemplateAsync(string to, string templateId, object data, CancellationToken cancellationToken = default)
    {
        await CaptureOutboxAsync(to, $"template:{templateId}", JsonSerializer.Serialize(data), cancellationToken);

        if (_configuration.GetValue<bool>("Email:DisableSending"))
        {
            _logger.LogInformation("Email sending disabled. Skipping template email to: {To}, Template: {TemplateId}", to, templateId);
            await Task.CompletedTask;
            return;
        }

        if (IsReservedTestRecipient(to))
        {
            _logger.LogInformation("Skipping template email to reserved test domain: {To}, Template: {TemplateId}", to, templateId);
            return;
        }

        var apiKey = _configuration["Email:BrevoApiKey"];
        var senderEmail = _configuration["Email:FromEmail"];
        var senderName = _configuration["Email:FromName"] ?? "DomusCond";

        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(senderEmail))
        {
            throw new InvalidOperationException("Brevo email is not configured. Set Email:BrevoApiKey and Email:FromEmail.");
        }
        
        if (apiKey.StartsWith("xsmtpsib-", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Brevo template sending requires an API key (xkeysib-), not an SMTP key.");
        }

        if (!int.TryParse(templateId, out var templateIdValue))
        {
            throw new InvalidOperationException("Brevo template id must be numeric.");
        }

        var client = _httpClientFactory.CreateClient("BrevoEmail");
        using var response = await client.PostAsJsonAsync(
            "v3/smtp/email",
            new
            {
                sender = new { email = senderEmail, name = senderName },
                to = new[] { new { email = to } },
                templateId = templateIdValue,
                @params = data
            },
            cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogError("Brevo template email send failed. Status: {StatusCode}, Response: {Response}", response.StatusCode, errorContent);
            throw new InvalidOperationException("No fue posible enviar el correo templado con Brevo.");
        }

        _logger.LogInformation("Template email sent via Brevo to: {To}, Template: {TemplateId}", to, templateId);
    }

    private async Task CaptureOutboxAsync(string to, string subject, string body, CancellationToken cancellationToken)
    {
        if (!_configuration.GetValue<bool>("Email:CaptureOutbox"))
            return;

        var directory = _configuration["Email:OutboxPath"];
        if (string.IsNullOrWhiteSpace(directory))
            directory = Path.Combine("data", "email-outbox");

        Directory.CreateDirectory(directory);
        var fileName = $"{DateTime.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}.json";
        var payload = JsonSerializer.Serialize(new { to, subject, body, createdAt = DateTime.UtcNow });
        await File.WriteAllTextAsync(Path.Combine(directory, fileName), payload, cancellationToken);
    }

    // RFC 2606 / RFC 6761 names never receive mail; sending to them only produces bounces.
    private static readonly string[] ReservedTestTlds = { ".test", ".example", ".invalid", ".localhost", ".local" };
    private static readonly string[] ReservedTestDomains = { "example.com", "example.net", "example.org" };

    internal static bool IsReservedTestRecipient(string to)
    {
        var at = to.LastIndexOf('@');
        if (at < 0)
            return false;

        var domain = to[(at + 1)..].Trim().TrimEnd('.').ToLowerInvariant();
        return ReservedTestTlds.Any(tld => domain.EndsWith(tld, StringComparison.Ordinal))
            || ReservedTestDomains.Any(reserved => domain == reserved || domain.EndsWith("." + reserved, StringComparison.Ordinal));
    }

    private static string ConvertHtmlToPlainText(string html)
    {
        if (string.IsNullOrWhiteSpace(html))
        {
            return string.Empty;
        }

        var withoutTags = System.Text.RegularExpressions.Regex.Replace(html, "<[^>]+>", " ");
        var decoded = System.Net.WebUtility.HtmlDecode(withoutTags);
        return System.Text.RegularExpressions.Regex.Replace(decoded, "\\s+", " ").Trim();
    }

    private async Task SendEmailViaBrevoSmtpAsync(
        string to,
        string subject,
        string body,
        string senderEmail,
        string senderName,
        string smtpKey,
        CancellationToken cancellationToken)
    {
        var smtpHost = _configuration["Email:SmtpHost"] ?? "smtp-relay.brevo.com";
        var smtpPort = _configuration.GetValue<int?>("Email:SmtpPort") ?? 587;
        var configuredUsername = _configuration["Email:SmtpUsername"];
        var usernameCandidates = new[] { configuredUsername, senderEmail, "apikey" }
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(senderName, senderEmail));
        message.To.Add(MailboxAddress.Parse(to));
        message.Subject = subject;
        message.Body = new BodyBuilder
        {
            HtmlBody = body,
            TextBody = ConvertHtmlToPlainText(body)
        }.ToMessageBody();

        Exception? lastException = null;

        foreach (var smtpUsername in usernameCandidates)
        {
            try
            {
                using var smtpClient = new SmtpClient();
                await smtpClient.ConnectAsync(smtpHost, smtpPort, SecureSocketOptions.StartTls, cancellationToken);
                await smtpClient.AuthenticateAsync(smtpUsername, smtpKey, cancellationToken);
                await smtpClient.SendAsync(message, cancellationToken);
                await smtpClient.DisconnectAsync(true, cancellationToken);

                _logger.LogInformation(
                    "Email sent via Brevo SMTP to: {To}, Subject: {Subject}, Username: {Username}",
                    to,
                    subject,
                    smtpUsername);

                return;
            }
            catch (Exception ex)
            {
                lastException = ex;
                _logger.LogWarning(ex, "Brevo SMTP authentication/send failed for username {Username}", smtpUsername);
            }
        }

        throw new InvalidOperationException(
            "No fue posible enviar el correo con Brevo SMTP. Configura Email:SmtpUsername con el usuario SMTP correcto.",
            lastException);
    }
}

public class SmsService : ISmsService
{
    private readonly ILogger<SmsService> _logger;

    public SmsService(ILogger<SmsService> logger)
    {
        _logger = logger;
    }

    public Task SendSmsAsync(string phoneNumber, string message, CancellationToken cancellationToken = default)
    {
        // TODO: Implement using Azure Communication Services or Twilio
        _logger.LogInformation("Sending SMS to: {PhoneNumber}", phoneNumber);
        return Task.CompletedTask;
    }
}

public class RedisCacheService : ICacheService
{
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(ILogger<RedisCacheService> logger)
    {
        _logger = logger;
    }

    public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        // TODO: Implement using Azure Cache for Redis
        return Task.FromResult<T?>(default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? expiration = null, CancellationToken cancellationToken = default)
    {
        // TODO: Implement using Azure Cache for Redis
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        // TODO: Implement using Azure Cache for Redis
        return Task.CompletedTask;
    }

    public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
    {
        // TODO: Implement using Azure Cache for Redis
        return Task.FromResult(false);
    }
}

public class PaymentGatewayService : IPaymentGatewayService
{
    private readonly ILogger<PaymentGatewayService> _logger;

    public PaymentGatewayService(ILogger<PaymentGatewayService> logger)
    {
        _logger = logger;
    }

    public Task<PaymentResult> ProcessPaymentAsync(PaymentRequest request, CancellationToken cancellationToken = default)
    {
        // TODO: Implement payment gateway integration (Stripe, OpenPay, Conekta)
        _logger.LogInformation("Processing payment for user: {UserId}, Amount: {Amount}", request.UserId, request.Amount);
        return Task.FromResult(new PaymentResult(true, Guid.NewGuid().ToString()));
    }

    public Task<PaymentResult> RefundPaymentAsync(string transactionId, decimal amount, CancellationToken cancellationToken = default)
    {
        // TODO: Implement refund logic
        return Task.FromResult(new PaymentResult(true, transactionId));
    }

    public Task<PaymentStatus> GetPaymentStatusAsync(string transactionId, CancellationToken cancellationToken = default)
    {
        // TODO: Implement status check
        return Task.FromResult(new PaymentStatus(transactionId, "Completed", 0, DateTime.UtcNow));
    }
}
