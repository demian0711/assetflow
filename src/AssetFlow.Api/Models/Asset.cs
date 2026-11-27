namespace AssetFlow.Api.Models;

public enum AssetStatus
{
    Available,
    InUse,
    Retired
}

public sealed class Asset
{
    public int Id { get; set; }
    public required string AssetCode { get; set; }
    public required string Name { get; set; }
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public AssetStatus Status { get; set; } = AssetStatus.Available;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
