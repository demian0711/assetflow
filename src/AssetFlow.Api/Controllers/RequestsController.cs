using System.Globalization;
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

    private IQueryable<AssetRequest> OwnRequests => db.AssetRequests.AsNoTracking()
        .Where(request => request.EmployeeId == EmployeeId);

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RequestDto>>> List(
        [FromQuery] AssetRequestStatus? status, CancellationToken cancellationToken)
    {
        var query = OwnRequests;
        if (status is AssetRequestStatus filter)
        {
            query = query.Where(request => request.Status == filter);
        }

        return await query.OrderByDescending(request => request.CreatedAtUtc).ThenByDescending(request => request.Id)
            .Select(request => new RequestDto(request.Id, request.CategoryId, request.Category.Name,
                request.Purpose, request.Status, request.CreatedAtUtc))
            .ToListAsync(cancellationToken);
    }

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
        RecordEvent(request.Id, "RequestCreated", request.CreatedAtUtc);
        await db.SaveChangesAsync(cancellationToken);
        var detail = await FindDetailAsync(request.Id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { request.Id }, detail);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<RequestDetail>> Cancel(int id, CancellationToken cancellationToken)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var updated = await OwnRequests.Where(request => request.Id == id &&
                (request.Status == AssetRequestStatus.Pending || request.Status == AssetRequestStatus.Approved))
            .ExecuteUpdateAsync(setters => setters.SetProperty(request => request.Status, AssetRequestStatus.Cancelled),
                cancellationToken);

        if (updated == 0)
        {
            return await OwnRequests.AnyAsync(request => request.Id == id, cancellationToken)
                ? Problem(statusCode: 409, detail: "Only pending or approved requests can be cancelled.")
                : NotFound();
        }

        RecordEvent(id, "RequestCancelled", DateTimeOffset.UtcNow);
        await db.SaveChangesAsync(cancellationToken);
        var detail = await FindDetailAsync(id, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(detail);
    }

    private Task<RequestDetail?> FindDetailAsync(int id, CancellationToken cancellationToken)
    {
        var entityId = id.ToString(CultureInfo.InvariantCulture);
        return OwnRequests.Where(request => request.Id == id)
            .Select(request => new RequestDetail(
                new RequestDto(request.Id, request.CategoryId, request.Category.Name, request.Purpose,
                    request.Status, request.CreatedAtUtc),
                db.AuditEvents.Where(audit => audit.EntityType == nameof(AssetRequest) && audit.EntityId == entityId)
                    .OrderBy(audit => audit.OccurredAtUtc).ThenBy(audit => audit.Id)
                    .Select(audit => new RequestEvent(audit.Action, audit.OccurredAtUtc)).ToList()))
            .SingleOrDefaultAsync(cancellationToken);
    }

    private void RecordEvent(int id, string action, DateTimeOffset time)
    {
        db.AuditEvents.Add(new AuditEvent
        {
            ActorId = EmployeeId,
            Action = action,
            EntityType = nameof(AssetRequest),
            EntityId = id.ToString(CultureInfo.InvariantCulture),
            OccurredAtUtc = time
        });
    }
}
