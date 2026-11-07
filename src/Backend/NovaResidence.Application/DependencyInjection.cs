using System.Reflection;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Mediator;
using NovaResidence.Application.Common.Behaviors;

namespace NovaResidence.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // Mediator: handlers depend on the scoped DbContext, so they cannot be singletons.
        services.AddMediator(options =>
        {
            options.ServiceLifetime = ServiceLifetime.Scoped;
            options.PipelineBehaviors =
            [
                typeof(ValidationBehavior<,>),
                typeof(LoggingBehavior<,>)
            ];
        });

        // FluentValidation
        services.AddValidatorsFromAssembly(assembly);

        return services;
    }
}
