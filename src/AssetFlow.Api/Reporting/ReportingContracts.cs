using System.ComponentModel.DataAnnotations;

namespace AssetFlow.Api.Reporting;

public sealed record AuditEntry(long Id, string? Actor, string Action, string EntityType, string EntityId, DateTimeOffset OccurredAtUtc);
public sealed record AuditPage(IReadOnlyList<AuditEntry> Items, int Total, int Page, int PageSize);
public sealed record Metric(string Key, int Count);
public sealed record CategoryTotal(string Name, int Count);
public sealed record Dashboard(IReadOnlyList<Metric> Metrics, IReadOnlyList<CategoryTotal> Categories, IReadOnlyList<AuditEntry> Activity);

public sealed class AuditFilters
{
    [StringLength(256)]
    public string? Actor { get; init; }

    [StringLength(100)]
    public string? Action { get; init; }

    [StringLength(100)]
    public string? EntityType { get; init; }

    [Range(1, int.MaxValue / 100)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;
}
