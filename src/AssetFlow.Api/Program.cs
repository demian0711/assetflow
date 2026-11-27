using System.IdentityModel.Tokens.Jwt;
using AssetFlow.Api.Auth;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();
builder.Services.AddProblemDetails();

var connectionString = DatabaseConfiguration.GetConnectionString(builder.Configuration);
builder.Services.AddDbContext<AssetFlowDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddIdentityCore<User>(options => options.User.RequireUniqueEmail = true)
    .AddRoles<IdentityRole>()
    .AddSignInManager()
    .AddEntityFrameworkStores<AssetFlowDbContext>();

var tokens = new JwtTokens(builder.Configuration);
builder.Services.AddSingleton(tokens);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.IncludeErrorDetails = false;
        options.TokenValidationParameters = tokens.ValidationParameters;
    });
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthRoles.Employee, policy => policy.RequireRole(AuthRoles.Employee).RequireClaim(JwtRegisteredClaimNames.Sub))
    .AddPolicy(AuthRoles.Admin, policy => policy.RequireRole(AuthRoles.Admin).RequireClaim(JwtRegisteredClaimNames.Sub))
    .AddPolicy(AuthRoles.WorkspaceMember, policy => policy.RequireRole(AuthRoles.Employee, AuthRoles.Admin));

builder.Services.AddHealthChecks().AddDbContextCheck<AssetFlowDbContext>("postgresql");

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment() && app.Configuration.GetValue<bool>("DemoSeed:Enabled"))
{
    var password = app.Configuration["DemoSeed:Password"];
    if (string.IsNullOrWhiteSpace(password))
    {
        throw new InvalidOperationException("Set DemoSeed:Password before enabling the demo seed.");
    }

    await using var scope = app.Services.CreateAsyncScope();
    await DemoDataSeeder.SeedAsync(scope.ServiceProvider, password);
    app.Logger.LogInformation("Development demo seed completed.");
}

app.MapControllers();
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    ResponseWriter = (context, report) => context.Response.WriteAsJsonAsync(new
    {
        status = report.Status.ToString().ToLowerInvariant()
    })
});
app.Run();

public partial class Program { }
