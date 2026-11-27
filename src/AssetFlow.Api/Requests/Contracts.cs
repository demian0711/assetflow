using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using AssetFlow.Api.Models;

namespace AssetFlow.Api.Requests;

public sealed record CreateRequestInput(
    [Range(1, int.MaxValue)] int CategoryId,
    [Required, StringLength(500, MinimumLength = 1)] string Purpose);

public sealed record RequestDto(
    int Id,
    int CategoryId,
    string CategoryName,
    string Purpose,
    [property: JsonConverter(typeof(JsonStringEnumConverter<AssetRequestStatus>))] AssetRequestStatus Status,
    DateTimeOffset CreatedAtUtc);

public sealed record RequestEvent(string Action, DateTimeOffset OccurredAtUtc);

public sealed record RequestDetail(RequestDto Request, IReadOnlyList<RequestEvent> Timeline);
