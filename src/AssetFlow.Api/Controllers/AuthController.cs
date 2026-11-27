using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AssetFlow.Api.Auth;
using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace AssetFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class AuthController(UserManager<User> users, SignInManager<User> signIn, JwtTokens tokens) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        if (!tokens.IsConfigured)
        {
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Authentication is unavailable.");
        }

        var user = await users.FindByEmailAsync(request.Email);
        if (user is null || !(await signIn.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true)).Succeeded)
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Sign-in failed.",
                detail: "Email or password is incorrect.");
        }

        return tokens.Issue(user.Id, await users.GetRolesAsync(user));
    }

    [Authorize(Policy = AuthRoles.WorkspaceMember)]
    [HttpGet("me")]
    public async Task<ActionResult<CurrentUserResponse>> Me()
    {
        var id = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        var user = id is null ? null : await users.FindByIdAsync(id);
        if (user is null)
        {
            return Challenge();
        }

        return new CurrentUserResponse(user.Id, user.Email, await users.GetRolesAsync(user), user.CreatedAtUtc);
    }
}
