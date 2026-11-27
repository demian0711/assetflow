using Microsoft.AspNetCore.Identity;

namespace AssetFlow.Api.Models;

public sealed class User : IdentityUser
{
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
