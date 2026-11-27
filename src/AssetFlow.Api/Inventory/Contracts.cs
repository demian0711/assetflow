using System.ComponentModel.DataAnnotations;
using System.Linq.Expressions;
using System.Text.Json.Serialization;
using AssetFlow.Api.Models;

namespace AssetFlow.Api.Inventory;

public sealed record CategoryInput([Required, StringLength(100)] string Name);
public sealed record CategoryDto(int Id, string Name);

public sealed record AssetInput(
    [Required, StringLength(50)] string AssetCode,
    [Required, StringLength(150)] string Name,
    [Range(1, int.MaxValue)] int CategoryId);

public sealed class AssetFilters
{
    [StringLength(150)]
    public string? Search { get; init; }

    [Range(1, int.MaxValue)]
    public int? CategoryId { get; init; }

    [EnumDataType(typeof(AssetStatus))]
    public AssetStatus? Status { get; init; }

    [Range(1, int.MaxValue / 100)]
    public int Page { get; init; } = 1;

    [Range(1, 100)]
    public int PageSize { get; init; } = 10;
}

public sealed record AssetDto(int Id, string AssetCode, string Name, int CategoryId, string CategoryName,
    [property: JsonConverter(typeof(JsonStringEnumConverter<AssetStatus>))] AssetStatus Status)
{
    internal static readonly Expression<Func<Asset, AssetDto>> Projection =
        asset => new AssetDto(asset.Id, asset.AssetCode, asset.Name, asset.CategoryId, asset.Category.Name, asset.Status);
}

public sealed record AssetPage(IReadOnlyList<AssetDto> Items, int Total, int Page, int PageSize);
