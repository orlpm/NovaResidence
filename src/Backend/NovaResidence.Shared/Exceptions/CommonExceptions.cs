namespace NovaResidence.Shared.Exceptions;

public abstract class NovaResidenceException : Exception
{
    protected NovaResidenceException(string message) : base(message) { }
    protected NovaResidenceException(string message, Exception innerException) : base(message, innerException) { }
}

public class DomainException : NovaResidenceException
{
    public DomainException(string message) : base(message) { }
}

public class NotFoundException : NovaResidenceException
{
    public NotFoundException(string entityName, object key)
        : base($"{entityName} with key '{key}' was not found.") { }
}

public class ValidationException : NovaResidenceException
{
    public IDictionary<string, string[]> Errors { get; }

    public ValidationException(IDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }
}

public class UnauthorizedException : NovaResidenceException
{
    public UnauthorizedException(string message = "Unauthorized access.") : base(message) { }
}

public class ForbiddenException : NovaResidenceException
{
    public ForbiddenException(string message = "Access forbidden.") : base(message) { }
}

public class ConflictException : NovaResidenceException
{
    public ConflictException(string message) : base(message) { }
}
