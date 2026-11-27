namespace AssetFlow.Api.Models;

public sealed class AuditEvent
{
    public long Id { get; set; }
    public string? ActorId { get; set; }
    public User? Actor { get; set; }
    public required string Action { get; set; }
    public required string EntityType { get; set; }
    public required string EntityId { get; set; }
    public DateTimeOffset OccurredAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
