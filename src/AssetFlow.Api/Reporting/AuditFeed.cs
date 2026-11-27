using System.Text.RegularExpressions;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Reporting;

internal static class AuditFeed
{
    private static readonly string[] RequestActions =
    [
        "RequestCreated", "RequestCancelled", "RequestApproved", "RequestRejected",
        "RequestIssued", "RequestReturned"
    ];

    public static IQueryable<AuditEvent> Visible(AssetFlowDbContext db) =>
        db.AuditEvents.AsNoTracking()
            .Where(entry => Regex.IsMatch(entry.EntityId, "^[1-9][0-9]{0,9}$") &&
                (entry.EntityType == nameof(AssetRequest) && RequestActions.Contains(entry.Action) ||
                entry.EntityType == nameof(Asset) && entry.Action == "AssetRetired"));

    public static IOrderedQueryable<AuditEvent> RecentFirst(IQueryable<AuditEvent> query) =>
        query.OrderByDescending(entry => entry.OccurredAtUtc).ThenByDescending(entry => entry.Id);
}
