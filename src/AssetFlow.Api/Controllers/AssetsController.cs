using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AssetFlow.Api.Auth;
using AssetFlow.Api.Data;
using AssetFlow.Api.Inventory;
using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AssetFlow.Api.Controllers;

[ApiController]
[Route("api/assets")]
[Authorize(Policy = AuthRoles.WorkspaceMember)]
public sealed class AssetsController(AssetFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<AssetPage> List([FromQuery] AssetFilters filters, CancellationToken cancellationToken)
    {
        var query = db.Assets.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(filters.Search))
        {
            var search = filters.Search.Trim().Replace(@"\", @"\\").Replace("%", @"\%").Replace("_", @"\_");
            var pattern = $"%{search}%";
            query = query.Where(asset => EF.Functions.ILike(asset.Name, pattern, @"\") ||
                EF.Functions.ILike(asset.AssetCode, pattern, @"\"));
        }

        if (filters.CategoryId is int categoryId)
        {
            query = query.Where(asset => asset.CategoryId == categoryId);
        }

        if (filters.Status is AssetStatus status)
        {
            query = query.Where(asset => asset.Status == status);
        }

        var total = await query.CountAsync(cancellationToken);
        var page = Math.Min(filters.Page, Math.Max(1, (int)(((long)total + filters.PageSize - 1) / filters.PageSize)));
        var items = await query.OrderBy(asset => asset.AssetCode).ThenBy(asset => asset.Id)
            .Skip((page - 1) * filters.PageSize).Take(filters.PageSize)
            .Select(AssetDto.Projection).ToListAsync(cancellationToken);
        return new AssetPage(items, total, page, filters.PageSize);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<AssetDto>> Get(int id, CancellationToken cancellationToken)
    {
        var asset = await FindAsync(id, cancellationToken);
        return asset is null ? NotFound() : asset;
    }

    [HttpPost]
    [Authorize(Policy = AuthRoles.Admin)]
    public async Task<ActionResult<AssetDto>> Create(AssetInput input, CancellationToken cancellationToken)
    {
        var category = await db.Categories.FindAsync([input.CategoryId], cancellationToken);
        if (category is null)
        {
            return InvalidCategory();
        }

        var asset = new Asset
        {
            AssetCode = input.AssetCode.Trim().ToUpperInvariant(),
            Name = input.Name.Trim(),
            Category = category
        };
        db.Assets.Add(asset);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException error) when (InventoryProblems.IsDuplicate(error, "IX_Assets_AssetCode"))
        {
            return DuplicateCode();
        }

        var result = new AssetDto(asset.Id, asset.AssetCode, asset.Name, category.Id, category.Name, asset.Status);
        return CreatedAtAction(nameof(Get), new { asset.Id }, result);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthRoles.Admin)]
    public async Task<ActionResult<AssetDto>> Update(int id, AssetInput input, CancellationToken cancellationToken)
    {
        var current = await FindAsync(id, cancellationToken);
        if (current is null)
        {
            return NotFound();
        }

        if (current.Status == AssetStatus.InUse && current.CategoryId != input.CategoryId)
        {
            return Problem(statusCode: 409, detail: "An in-use asset cannot change category.",
                extensions: InventoryProblems.FieldError("categoryId", "An in-use asset cannot change category."));
        }

        if (!await db.Categories.AnyAsync(category => category.Id == input.CategoryId, cancellationToken))
        {
            return InvalidCategory();
        }

        try
        {
            var updated = await db.Assets
                .Where(asset => asset.Id == id && asset.Status == current.Status && asset.CategoryId == current.CategoryId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(asset => asset.AssetCode, input.AssetCode.Trim().ToUpperInvariant())
                    .SetProperty(asset => asset.Name, input.Name.Trim())
                    .SetProperty(asset => asset.CategoryId, input.CategoryId), cancellationToken);

            if (updated == 0)
            {
                return Problem(statusCode: 409, detail: "The asset changed. Refresh and try again.");
            }
        }
        catch (PostgresException error) when (InventoryProblems.IsDuplicate(error, "IX_Assets_AssetCode"))
        {
            return DuplicateCode();
        }

        return Ok(await FindAsync(id, cancellationToken));
    }

    [HttpPost("{id:int}/retire")]
    [Authorize(Policy = AuthRoles.Admin)]
    public async Task<ActionResult<AssetDto>> Retire(int id, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var updated = await db.Assets.Where(asset => asset.Id == id && asset.Status == AssetStatus.Available)
            .ExecuteUpdateAsync(setters => setters.SetProperty(asset => asset.Status, AssetStatus.Retired), cancellationToken);

        if (updated == 0)
        {
            return await db.Assets.AnyAsync(asset => asset.Id == id, cancellationToken)
                ? Problem(statusCode: 409, detail: "Only available assets can be retired.")
                : NotFound();
        }

        db.AuditEvents.Add(new AuditEvent
        {
            Action = "AssetRetired",
            EntityType = nameof(Asset),
            EntityId = id.ToString(CultureInfo.InvariantCulture),
            ActorId = User.FindFirstValue(JwtRegisteredClaimNames.Sub)
        });
        await db.SaveChangesAsync(cancellationToken);
        var result = await FindAsync(id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(result);
    }

    private Task<AssetDto?> FindAsync(int id, CancellationToken cancellationToken) =>
        db.Assets.AsNoTracking().Where(asset => asset.Id == id)
            .Select(AssetDto.Projection).SingleOrDefaultAsync(cancellationToken);

    private ObjectResult InvalidCategory() =>
        Problem(statusCode: 400, detail: "Choose an existing category.",
            extensions: InventoryProblems.FieldError("categoryId", "Choose an existing category."));

    private ObjectResult DuplicateCode() =>
        Problem(statusCode: 409, detail: "This asset code is already in use.",
            extensions: InventoryProblems.FieldError("assetCode", "This asset code is already in use."));
}
