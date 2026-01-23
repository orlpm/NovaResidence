using Azure.Messaging.ServiceBus;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace NovaResidence.Infrastructure.Services;

public class AzureServiceBusService : IEventBusService
{
    private readonly ServiceBusClient _serviceBusClient;
    private readonly ILogger<AzureServiceBusService> _logger;
    private const string TopicName = "novaresidence-events";

    public AzureServiceBusService(
        ServiceBusClient serviceBusClient,
        ILogger<AzureServiceBusService> logger)
    {
        _serviceBusClient = serviceBusClient;
        _logger = logger;
    }

    public async Task PublishAsync<T>(T @event, CancellationToken cancellationToken = default) where T : class
    {
        var eventType = typeof(T).Name;
        await PublishAsync(eventType, @event, cancellationToken);
    }

    public async Task PublishAsync(string eventType, object eventData, CancellationToken cancellationToken = default)
    {
        try
        {
            var sender = _serviceBusClient.CreateSender(TopicName);

            var messageBody = JsonSerializer.Serialize(eventData);
            var message = new ServiceBusMessage(messageBody)
            {
                Subject = eventType,
                ContentType = "application/json",
                MessageId = Guid.NewGuid().ToString()
            };

            message.ApplicationProperties.Add("EventType", eventType);
            message.ApplicationProperties.Add("Timestamp", DateTime.UtcNow);

            await sender.SendMessageAsync(message, cancellationToken);

            _logger.LogInformation("Event published successfully: {EventType}, MessageId: {MessageId}",
                eventType, message.MessageId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error publishing event: {EventType}", eventType);
            throw;
        }
    }
}
