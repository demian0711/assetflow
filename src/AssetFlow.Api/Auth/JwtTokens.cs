using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;

namespace AssetFlow.Api.Auth;

public sealed class JwtTokens
{
    private const string Issuer = "AssetFlow";
    private const string Audience = "AssetFlow.Web";
    private const string RoleClaim = "role";
    private readonly SymmetricSecurityKey? signingKey;

    public JwtTokens(IConfiguration configuration)
    {
        var secret = configuration["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            return;
        }

        if (secret.Length != 64 || !secret.All(Uri.IsHexDigit))
        {
            throw new InvalidOperationException("Jwt:SigningKey must contain 64 hexadecimal characters.");
        }

        signingKey = new SymmetricSecurityKey(Convert.FromHexString(secret));
    }

    public bool IsConfigured => signingKey is not null;

    internal TokenValidationParameters ValidationParameters => new()
    {
        ValidIssuer = Issuer,
        ValidAudience = Audience,
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        IssuerSigningKey = signingKey,
        ValidateIssuerSigningKey = true,
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        NameClaimType = JwtRegisteredClaimNames.Sub,
        RoleClaimType = RoleClaim
    };

    internal LoginResponse Issue(string userId, IEnumerable<string> roles)
    {
        var issuedAt = DateTimeOffset.FromUnixTimeSeconds(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
        var expiresAt = issuedAt.AddMinutes(30);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, userId),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        claims.AddRange(roles.Select(role => new Claim(RoleClaim, role)));

        var key = signingKey ?? throw new InvalidOperationException("Configure Jwt:SigningKey before issuing tokens.");
        var handler = new JwtSecurityTokenHandler();
        var token = handler.CreateEncodedJwt(new SecurityTokenDescriptor
        {
            Issuer = Issuer,
            Audience = Audience,
            Subject = new ClaimsIdentity(claims),
            IssuedAt = issuedAt.UtcDateTime,
            NotBefore = issuedAt.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        });

        return new LoginResponse(token, expiresAt);
    }
}
