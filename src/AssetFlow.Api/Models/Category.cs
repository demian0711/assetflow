namespace AssetFlow.Api.Models;

public sealed class Category
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
