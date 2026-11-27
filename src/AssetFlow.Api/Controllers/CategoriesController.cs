using AssetFlow.Api.Auth;
using AssetFlow.Api.Data;
using AssetFlow.Api.Inventory;
using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize(Policy = AuthRoles.WorkspaceMember)]
public sealed class CategoriesController(AssetFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CategoryDto>> List(CancellationToken cancellationToken) =>
        await db.Categories.AsNoTracking().OrderBy(category => category.Name)
            .Select(category => new CategoryDto(category.Id, category.Name)).ToListAsync(cancellationToken);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CategoryDto>> Get(int id, CancellationToken cancellationToken)
    {
        var category = await db.Categories.AsNoTracking().Where(category => category.Id == id)
            .Select(category => new CategoryDto(category.Id, category.Name)).SingleOrDefaultAsync(cancellationToken);
        return category is null ? NotFound() : category;
    }

    [HttpPost]
    [Authorize(Policy = AuthRoles.Admin)]
    public async Task<ActionResult<CategoryDto>> Create(CategoryInput input, CancellationToken cancellationToken)
    {
        var category = new Category { Name = input.Name.Trim() };
        db.Categories.Add(category);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException error) when (InventoryProblems.IsDuplicate(error, "IX_Categories_Name"))
        {
            return DuplicateName();
        }

        return CreatedAtAction(nameof(Get), new { category.Id }, new CategoryDto(category.Id, category.Name));
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthRoles.Admin)]
    public async Task<ActionResult<CategoryDto>> Update(int id, CategoryInput input, CancellationToken cancellationToken)
    {
        var category = await db.Categories.SingleOrDefaultAsync(category => category.Id == id, cancellationToken);
        if (category is null)
        {
            return NotFound();
        }

        category.Name = input.Name.Trim();
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException error) when (InventoryProblems.IsDuplicate(error, "IX_Categories_Name"))
        {
            return DuplicateName();
        }

        return new CategoryDto(category.Id, category.Name);
    }

    private ObjectResult DuplicateName() =>
        Problem(statusCode: 409, detail: "A category with this name already exists.",
            extensions: InventoryProblems.FieldError("name", "A category with this name already exists."));
}
