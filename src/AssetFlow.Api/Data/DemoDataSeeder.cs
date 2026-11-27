using AssetFlow.Api.Auth;
using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Data;

internal static class DemoDataSeeder
{
    private static readonly (string Email, string Role)[] Accounts =
    [
        ("admin@assetflow.test", AuthRoles.Admin),
        ("employee1@assetflow.test", AuthRoles.Employee),
        ("employee2@assetflow.test", AuthRoles.Employee)
    ];

    private static readonly (string Name, string Code, string Device)[] Inventory =
    [
        ("Laptops", "LAP", "Demo laptop"),
        ("Monitors", "MON", "Demo monitor"),
        ("Keyboards", "KEY", "Demo keyboard"),
        ("Headsets", "HDS", "Demo headset")
    ];

    public static async Task SeedAsync(IServiceProvider services, string password)
    {
        var db = services.GetRequiredService<AssetFlowDbContext>();
        var users = services.GetRequiredService<UserManager<User>>();
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();

        await using var transaction = await db.Database.BeginTransactionAsync();

        // Keep concurrent API starts from seeding the same database at the same time.
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(1736728611)");

        foreach (var role in Accounts.Select(account => account.Role).Distinct())
        {
            if (!await roles.RoleExistsAsync(role))
            {
                EnsureSucceeded(await roles.CreateAsync(new IdentityRole(role)));
            }
        }

        foreach (var (email, role) in Accounts)
        {
            var user = await users.FindByEmailAsync(email);
            if (user is null)
            {
                user = new User { UserName = email, Email = email, EmailConfirmed = true };
                EnsureSucceeded(await users.CreateAsync(user, password));
            }

            if (!await users.IsInRoleAsync(user, role))
            {
                EnsureSucceeded(await users.AddToRoleAsync(user, role));
            }
        }

        var categoryNames = Inventory.Select(item => item.Name).ToArray();
        var categories = await db.Categories.Where(category => categoryNames.Contains(category.Name))
            .ToDictionaryAsync(category => category.Name);

        foreach (var (name, _, _) in Inventory)
        {
            if (!categories.ContainsKey(name))
            {
                var category = new Category { Name = name };
                categories.Add(name, category);
                db.Categories.Add(category);
            }
        }

        var demoAssets = Inventory.SelectMany(group => Enumerable.Range(1, 6).Select(number =>
            new Asset
            {
                AssetCode = $"DEMO-{group.Code}-{number:D3}",
                Name = $"{group.Device} {number}",
                Category = categories[group.Name]
            })).ToArray();

        var demoCodes = demoAssets.Select(asset => asset.AssetCode).ToArray();
        var existingCodes = await db.Assets.Where(asset => demoCodes.Contains(asset.AssetCode))
            .Select(asset => asset.AssetCode).ToHashSetAsync();

        db.Assets.AddRange(demoAssets.Where(asset => !existingCodes.Contains(asset.AssetCode)));
        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    private static void EnsureSucceeded(IdentityResult result)
    {
        if (!result.Succeeded)
        {
            var codes = string.Join(", ", result.Errors.Select(error => error.Code));
            throw new InvalidOperationException($"Demo Identity seed failed ({codes}).");
        }
    }
}
