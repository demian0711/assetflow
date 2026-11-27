using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AssetFlow.Api.Auth;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using AssetFlow.Api.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AssetFlow.Api.Controllers;

[ApiController]
[Route("api/admin/requests")]
[Authorize(Policy = AuthRoles.Admin)]
public sealed class AdminRequestsController(AssetFlowDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<RequestDto>> List([FromQuery] AssetRequestStatus? status, CancellationToken ct)
    {
        var query = db.AssetRequests.AsNoTracking();
        if (status is AssetRequestStatus filter)
        {
            query = query.Where(request => request.Status == filter);
        }

        return await query.OrderByDescending(request => request.CreatedAtUtc).ThenByDescending(request => request.Id)
            .Select(RequestHistory.Summary).ToListAsync(ct);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<RequestDetail>> Get(int id, CancellationToken ct)
    {
        var detail = await RequestHistory.FindAsync(db, db.AssetRequests.AsNoTracking(), id, ct);
        return detail is null ? NotFound() : detail;
    }

    [HttpGet("{id:int}/available-assets")]
    public async Task<ActionResult<IReadOnlyList<AssetChoice>>> AvailableAssets(int id, CancellationToken ct)
    {
        var request = await db.AssetRequests.AsNoTracking().SingleOrDefaultAsync(request => request.Id == id, ct);
        if (request is null) return NotFound();
        if (request.Status != AssetRequestStatus.Approved) return Changed();

        return await db.Assets.AsNoTracking()
            .Where(asset => asset.CategoryId == request.CategoryId && asset.Status == AssetStatus.Available)
            .OrderBy(asset => asset.AssetCode)
            .Select(asset => new AssetChoice(asset.Id, asset.AssetCode, asset.Name)).ToListAsync(ct);
    }

    [HttpPost("{id:int}/approve")]
    public Task<ActionResult<RequestDetail>> Approve(int id, CancellationToken ct) =>
        Transition(id, AssetRequestStatus.Pending, AssetRequestStatus.Approved, "RequestApproved", ct);

    [HttpPost("{id:int}/reject")]
    public Task<ActionResult<RequestDetail>> Reject(int id, RejectRequestInput input, CancellationToken ct) =>
        Transition(id, AssetRequestStatus.Pending, AssetRequestStatus.Rejected, "RequestRejected", ct,
            rejectionReason: input.Reason.Trim());

    [HttpPost("{id:int}/issue")]
    public Task<ActionResult<RequestDetail>> Issue(int id, IssueRequestInput input, CancellationToken ct) =>
        Transition(id, AssetRequestStatus.Approved, AssetRequestStatus.Issued, "RequestIssued", ct,
            assetId: input.AssetId);

    [HttpPost("{id:int}/return")]
    public Task<ActionResult<RequestDetail>> Return(int id, CancellationToken ct) =>
        Transition(id, AssetRequestStatus.Issued, AssetRequestStatus.Returned, "RequestReturned", ct);

    private async Task<ActionResult<RequestDetail>> Transition(int id, AssetRequestStatus expected,
        AssetRequestStatus next, string eventName, CancellationToken ct, int? assetId = null, string? rejectionReason = null)
    {
        var request = await db.AssetRequests.Include(request => request.Asset).SingleOrDefaultAsync(request => request.Id == id, ct);
        if (request is null) return NotFound();
        if (request.Status != expected) return Changed();

        Asset? asset = null;
        if (next == AssetRequestStatus.Issued)
        {
            asset = await db.Assets.FindAsync([assetId!.Value], ct);
            if (asset is null || asset.CategoryId != request.CategoryId)
            {
                ModelState.AddModelError("assetId", "Choose an asset from the request's category.");
                return ValidationProblem(ModelState);
            }

            if (asset.Status != AssetStatus.Available) return Changed();
        }
        else if (next == AssetRequestStatus.Returned)
        {
            asset = request.Asset;
            if (asset?.Status != AssetStatus.InUse) return Changed();
        }

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        try
        {
            if (asset is not null)
            {
                asset.Status = next == AssetRequestStatus.Issued ? AssetStatus.InUse : AssetStatus.Available;
                // Check the asset's xmin before attempting to assign it to a request.
                await db.SaveChangesAsync(ct);
            }

            if (next == AssetRequestStatus.Issued) request.AssetId = asset!.Id;
            if (next == AssetRequestStatus.Rejected) request.RejectionReason = rejectionReason;

            request.Status = next;
            RequestHistory.Record(db, id, User.FindFirstValue(JwtRegisteredClaimNames.Sub)!, eventName, DateTimeOffset.UtcNow);
            await db.SaveChangesAsync(ct);
            var detail = await RequestHistory.FindAsync(db, db.AssetRequests.AsNoTracking(), id, ct);
            await transaction.CommitAsync(ct);
            return Ok(detail);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Changed();
        }
        catch (DbUpdateException error) when (error.InnerException is PostgresException
            { SqlState: PostgresErrorCodes.UniqueViolation, ConstraintName: "IX_AssetRequests_IssuedAsset" })
        {
            return Changed();
        }
    }

    private ObjectResult Changed() =>
        Problem(statusCode: 409, detail: "The request or asset has changed. Refresh and try again.");
}
