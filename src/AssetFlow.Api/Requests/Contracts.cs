using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using AssetFlow.Api.Models;

namespace AssetFlow.Api.Requests;

public sealed record CreateRequestInput(
    [Range(1, int.MaxValue)] int CategoryId,
    [Required, StringLength(500, MinimumLength = 1)] string Purpose);

public sealed record RejectRequestInput([Required, StringLength(500, MinimumLength = 1)] string Reason);
public sealed record IssueRequestInput([Range(1, int.MaxValue)] int AssetId);

public sealed record RequestDto(
    int Id,
    int CategoryId,
    string CategoryName,
    string Purpose,
    [property: JsonConverter(typeof(JsonStringEnumConverter<AssetRequestStatus>))] AssetRequestStatus Status,
    DateTimeOffset CreatedAtUtc,
    string? EmployeeEmail,
    string? AssetCode,
    string? RejectionReason);

public sealed record RequestEvent(string Action, DateTimeOffset OccurredAtUtc);
public sealed record RequestDetail(RequestDto Request, IReadOnlyList<RequestEvent> Timeline);
public sealed record AssetChoice(int Id, string AssetCode, string Name);
public sealed record AssignedAsset(int RequestId, int AssetId, string AssetCode, string Name, string CategoryName);
