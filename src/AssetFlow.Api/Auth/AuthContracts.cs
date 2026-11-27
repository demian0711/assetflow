using System.ComponentModel.DataAnnotations;

namespace AssetFlow.Api.Auth;

public sealed record LoginRequest(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required] string Password);

public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAtUtc);

public sealed record CurrentUserResponse(
    string Id, string? Email, IList<string> Roles, DateTimeOffset CreatedAtUtc);
