using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using AssetFlow.Api.Auth;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using AssetFlow.Api.Reporting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Controllers;

[ApiController]
[Route("api")]
[ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
public sealed class ReportingController(AssetFlowDbContext db) : ControllerBase
{
    [HttpGet("dashboard")]
    [Authorize(Policy = AuthRoles.WorkspaceMember)]
    public async Task<ActionResult<Dashboard>> GetDashboard(CancellationToken cancellationToken)
    {
        if (User.IsInRole(AuthRoles.Admin))
        {
            var assets = await db.Assets.GroupBy(asset => asset.Status)
                .Select(group => new { Status = group.Key, Count = group.Count() })
                .ToDictionaryAsync(group => group.Status, group => group.Count, cancellationToken);
            var pending = await db.AssetRequests.CountAsync(request => request.Status == AssetRequestStatus.Pending, cancellationToken);
            var categories = await db.Categories.OrderBy(category => category.Name)
                .Select(category => new CategoryTotal(category.Name, db.Assets.Count(asset => asset.CategoryId == category.Id)))
                .ToListAsync(cancellationToken);
            var activity = await AuditFeed.RecentFirst(AuditFeed.Visible(db)).Take(8)
                .Select(entry => new AuditEntry(entry.Id, entry.Actor == null ? null : entry.Actor.Email,
                    entry.Action, entry.EntityType, entry.EntityId, entry.OccurredAtUtc))
                .ToListAsync(cancellationToken);
            return new Dashboard([
                new("totalAssets", assets.Values.Sum()),
                new("available", assets.GetValueOrDefault(AssetStatus.Available)),
                new("inUse", assets.GetValueOrDefault(AssetStatus.InUse)),
                new("pendingRequests", pending)
            ], categories, activity);
        }

        var employeeId = User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (employeeId is null) return Forbid();

        var ownRequests = db.AssetRequests.Where(request => request.EmployeeId == employeeId);
        var counts = await ownRequests.GroupBy(request => request.Status)
            .Select(group => new { Status = group.Key, Count = group.Count() })
            .ToDictionaryAsync(group => group.Status, group => group.Count, cancellationToken);
        var assigned = await ownRequests.CountAsync(request => request.Status == AssetRequestStatus.Issued &&
            request.Asset != null && request.Asset.Status == AssetStatus.InUse, cancellationToken);
        var ownIds = ownRequests.Select(request => request.Id.ToString());
        var ownActivity = await AuditFeed.RecentFirst(AuditFeed.Visible(db)
            .Where(entry => entry.EntityType == nameof(AssetRequest) && ownIds.Contains(entry.EntityId)))
            .Take(8).Select(entry => new AuditEntry(entry.Id, null, entry.Action, entry.EntityType, entry.EntityId, entry.OccurredAtUtc))
            .ToListAsync(cancellationToken);

        return new Dashboard([
            new("myRequests", counts.Values.Sum()),
            new("pendingRequests", counts.GetValueOrDefault(AssetRequestStatus.Pending)),
            new("assignedAssets", assigned),
            new("returned", counts.GetValueOrDefault(AssetRequestStatus.Returned))
        ], [], ownActivity);
    }

    [HttpGet("admin/audit")]
    [Authorize(Policy = AuthRoles.Admin)]
    public async Task<AuditPage> GetAudit([FromQuery] AuditFilters filters, CancellationToken cancellationToken)
    {
        var query = AuditFeed.Visible(db);
        if (!string.IsNullOrWhiteSpace(filters.Actor))
        {
            var actor = filters.Actor.Trim().ToLowerInvariant();
            query = query.Where(entry => entry.Actor != null && entry.Actor.Email != null &&
                entry.Actor.Email.ToLower().Contains(actor));
        }
        if (!string.IsNullOrWhiteSpace(filters.Action))
        {
            query = query.Where(entry => entry.Action == filters.Action);
        }
        if (!string.IsNullOrWhiteSpace(filters.EntityType))
        {
            query = query.Where(entry => entry.EntityType == filters.EntityType);
        }

        var total = await query.CountAsync(cancellationToken);
        var page = Math.Min(filters.Page, Math.Max(1, (int)(((long)total + filters.PageSize - 1) / filters.PageSize)));
        var items = await AuditFeed.RecentFirst(query).Skip((page - 1) * filters.PageSize).Take(filters.PageSize)
            .Select(entry => new AuditEntry(entry.Id, entry.Actor == null ? null : entry.Actor.Email,
                entry.Action, entry.EntityType, entry.EntityId, entry.OccurredAtUtc))
            .ToListAsync(cancellationToken);
        return new AuditPage(items, total, page, filters.PageSize);
    }
}
