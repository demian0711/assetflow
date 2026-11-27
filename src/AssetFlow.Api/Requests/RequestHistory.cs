using System.Globalization;
using System.Linq.Expressions;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Requests;

internal static class RequestHistory
{
    public static readonly Expression<Func<AssetRequest, RequestDto>> Summary =
        request => new RequestDto(request.Id, request.CategoryId, request.Category.Name,
            request.Purpose, request.Status, request.CreatedAtUtc, request.Employee.Email,
            request.Asset != null ? request.Asset.AssetCode : null, request.RejectionReason);

    public static Task<RequestDetail?> FindAsync(AssetFlowDbContext db, IQueryable<AssetRequest> scope, int id,
        CancellationToken cancellationToken)
    {
        var entityId = id.ToString(CultureInfo.InvariantCulture);
        return scope.Where(request => request.Id == id).Select(Summary)
            .Select(request => new RequestDetail(request,
                db.AuditEvents.Where(audit => audit.EntityType == nameof(AssetRequest) && audit.EntityId == entityId)
                    .OrderBy(audit => audit.OccurredAtUtc).ThenBy(audit => audit.Id)
                    .Select(audit => new RequestEvent(audit.Action, audit.OccurredAtUtc)).ToList()))
            .SingleOrDefaultAsync(cancellationToken);
    }

    public static void Record(AssetFlowDbContext db, int id, string actorId, string action, DateTimeOffset time)
    {
        db.AuditEvents.Add(new AuditEvent
        {
            ActorId = actorId,
            Action = action,
            EntityType = nameof(AssetRequest),
            EntityId = id.ToString(CultureInfo.InvariantCulture),
            OccurredAtUtc = time
        });
    }
}
