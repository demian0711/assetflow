using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AssetFlow.Api.Auth;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using AssetFlow.Api.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Controllers;

[ApiController]
[Route("api/requests")]
[Authorize(Policy = AuthRoles.Employee)]
public sealed class RequestsController(AssetFlowDbContext db) : ControllerBase
{
    private string EmployeeId => User.FindFirstValue(JwtRegisteredClaimNames.Sub)!;
    private IQueryable<AssetRequest> OwnRequests => db.AssetRequests.Where(request => request.EmployeeId == EmployeeId);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RequestDto>>> List(
        [FromQuery] AssetRequestStatus? status, CancellationToken cancellationToken)
    {
        var query = OwnRequests.AsNoTracking();
        if (status is AssetRequestStatus filter)
        {
            query = query.Where(request => request.Status == filter);
        }

        return await query.OrderByDescending(request => request.CreatedAtUtc).ThenByDescending(request => request.Id)
            .Select(RequestHistory.Summary).ToListAsync(cancellationToken);
    }

    [HttpGet("assigned-assets")]
    public async Task<IReadOnlyList<AssignedAsset>> AssignedAssets(CancellationToken cancellationToken) =>
        await OwnRequests.AsNoTracking()
            .Where(request => request.Status == AssetRequestStatus.Issued &&
                request.Asset != null && request.Asset.Status == AssetStatus.InUse)
            .OrderBy(request => request.Asset!.AssetCode)
            .Select(request => new AssignedAsset(request.Id, request.Asset!.Id, request.Asset.AssetCode,
                request.Asset.Name, request.Asset.Category.Name)).ToListAsync(cancellationToken);

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RequestDetail>> Get(int id, CancellationToken cancellationToken)
    {
        var detail = await FindDetailAsync(id, cancellationToken);
        return detail is null ? NotFound() : detail;
    }

    [HttpPost]
    public async Task<ActionResult<RequestDetail>> Create(CreateRequestInput input, CancellationToken cancellationToken)
    {
        if (!await db.Categories.AnyAsync(category => category.Id == input.CategoryId, cancellationToken))
        {
            ModelState.AddModelError("categoryId", "Choose an existing category.");
            return ValidationProblem(ModelState);
        }

        var request = new AssetRequest
        {
            EmployeeId = EmployeeId,
            CategoryId = input.CategoryId,
            Purpose = input.Purpose.Trim(),
            Status = AssetRequestStatus.Pending
        };

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        db.AssetRequests.Add(request);
        await db.SaveChangesAsync(cancellationToken);
        RequestHistory.Record(db, request.Id, EmployeeId, "RequestCreated", request.CreatedAtUtc);
        await db.SaveChangesAsync(cancellationToken);
        var detail = await FindDetailAsync(request.Id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { request.Id }, detail);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<RequestDetail>> Cancel(int id, CancellationToken cancellationToken)
    {
        var request = await OwnRequests.SingleOrDefaultAsync(request => request.Id == id, cancellationToken);
        if (request is null) return NotFound();
        if (request.Status is not (AssetRequestStatus.Pending or AssetRequestStatus.Approved))
        {
            return Problem(statusCode: 409, detail: "Only pending or approved requests can be cancelled.");
        }

        request.Status = AssetRequestStatus.Cancelled;
        RequestHistory.Record(db, id, EmployeeId, "RequestCancelled", DateTimeOffset.UtcNow);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Problem(statusCode: 409, detail: "The request has changed. Refresh and try again.");
        }

        return Ok(await FindDetailAsync(id, cancellationToken));
    }

    private Task<RequestDetail?> FindDetailAsync(int id, CancellationToken cancellationToken) =>
        RequestHistory.FindAsync(db, OwnRequests.AsNoTracking(), id, cancellationToken);
}
