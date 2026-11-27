using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();

var connectionString = DatabaseConfiguration.GetConnectionString(builder.Configuration);
builder.Services.AddDbContext<AssetFlowDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddIdentityCore<User>(options => options.User.RequireUniqueEmail = true)
    .AddRoles<IdentityRole>()
    .AddEntityFrameworkStores<AssetFlowDbContext>();

builder.Services.AddHealthChecks().AddDbContextCheck<AssetFlowDbContext>("postgresql");

var app = builder.Build();

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
