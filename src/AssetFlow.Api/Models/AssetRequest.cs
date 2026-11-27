namespace AssetFlow.Api.Models;

public enum AssetRequestStatus
{
    Pending,
    Approved,
    Rejected,
    Cancelled,
    Issued,
    Returned
}

public sealed class AssetRequest
{
    public int Id { get; set; }
    public uint Version { get; set; }
    public required string EmployeeId { get; set; }
    public User Employee { get; set; } = null!;
    public int CategoryId { get; set; }
    public Category Category { get; set; } = null!;
    public int? AssetId { get; set; }
    public Asset? Asset { get; set; }
    public required string Purpose { get; set; }
    public string? RejectionReason { get; set; }
    public AssetRequestStatus Status { get; set; } = AssetRequestStatus.Pending;
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
