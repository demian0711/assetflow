using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using AssetFlow.Api.Data;
using AssetFlow.Api.Models;
using AssetFlow.Api.Requests;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace AssetFlow.IntegrationTests;

public sealed class AdminRequestsTests : IAsyncLifetime
{
    private const string AdminPath = "/api/admin/requests/";
    private const string Password = "Integration!Fixture09";
    private readonly IssuanceBarrier barrier = new();
    private readonly string connection = Environment.GetEnvironmentVariable("ASSETFLOW_TEST_DB")
        ?? throw new InvalidOperationException("Set ASSETFLOW_TEST_DB to an isolated PostgreSQL database.");
    private readonly Dictionary<string, string?> previousEnvironment = [];
    private WebApplicationFactory<Program>? factory;
    private HttpClient admin = null!;
    private HttpClient employeeA = null!;
    private HttpClient employeeB = null!;

    public async Task InitializeAsync()
    {
        await using var db = OpenDb();
        await db.Database.MigrateAsync();
        SetEnvironment("ConnectionStrings__AssetFlow", connection);
        SetEnvironment("Jwt__SigningKey", Convert.ToHexString(RandomNumberGenerator.GetBytes(32)));
        SetEnvironment("DemoSeed__Enabled", "true");
        SetEnvironment("DemoSeed__Password", Password);

        factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
            builder.ConfigureServices(services =>
                services.ConfigureDbContext<AssetFlowDbContext>(options => options.AddInterceptors(barrier.Interceptor)));
        });
        admin = await SignIn("admin");
        employeeA = await SignIn("employee1");
        employeeB = await SignIn("employee2");
    }

    [Fact]
    public async Task Issue_with_wrong_category_is_rejected_without_writes()
    {
        var asset = await AddAvailableAsset("Laptops");
        var request = await NewApprovedRequest(employeeA, "Monitors");
        var response = await admin.PostAsJsonAsync(AdminPath + request + "/issue", new { assetId = asset });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        await using var db = OpenDb();
        Assert.Equal(AssetStatus.Available, (await db.Assets.FindAsync(asset))!.Status);
        var saved = (await db.AssetRequests.FindAsync(request))!;
        Assert.Equal(AssetRequestStatus.Approved, saved.Status);
        Assert.Null(saved.AssetId);
        Assert.Equal(new[] { "RequestCreated", "RequestApproved" }, await Actions(db, request));
    }

    [Fact]
    public async Task Return_twice_keeps_history_and_records_one_return()
    {
        var asset = await AddAvailableAsset("Laptops");
        var request = await NewApprovedRequest(employeeA, "Laptops");
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsJsonAsync(AdminPath + request + "/issue", new { assetId = asset })).StatusCode);
        Assert.Contains(await Assigned(employeeA), item => item.AssetId == asset && item.RequestId == request);
        Assert.DoesNotContain(await Assigned(employeeB), item => item.AssetId == asset);

        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsync(AdminPath + request + "/return", null)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync(AdminPath + request + "/return", null)).StatusCode);
        Assert.DoesNotContain(await Assigned(employeeA), item => item.AssetId == asset);
        await using var db = OpenDb();
        var saved = (await db.AssetRequests.FindAsync(request))!;
        Assert.Equal(AssetRequestStatus.Returned, saved.Status);
        Assert.Equal(asset, saved.AssetId);
        Assert.Equal(AssetStatus.Available, (await db.Assets.FindAsync(asset))!.Status);
        Assert.Equal(new[] { "RequestCreated", "RequestApproved", "RequestIssued", "RequestReturned" }, await Actions(db, request));
    }

    [Fact]
    public async Task Concurrent_issue_same_available_asset_after_both_reads_allows_exactly_one()
    {
        var asset = await AddAvailableAsset("Laptops");
        var first = await NewApprovedRequest(employeeA, "Laptops");
        var second = await NewApprovedRequest(employeeB, "Laptops");
        barrier.AssetId = asset;
        var responses = await Task.WhenAll(
            admin.PostAsJsonAsync(AdminPath + first + "/issue", new { assetId = asset }),
            admin.PostAsJsonAsync(AdminPath + second + "/issue", new { assetId = asset }));
        Assert.Equal(new[] { HttpStatusCode.OK, HttpStatusCode.Conflict }, responses.Select(response => response.StatusCode).Order().ToArray());
        Assert.Equal(2, barrier.ReadVersions.Length);
        Assert.NotEqual(0u, barrier.ReadVersions[0]);
        Assert.Equal(barrier.ReadVersions[0], barrier.ReadVersions[1]);
        Assert.Equal(1, barrier.Conflicts);

        await using var db = OpenDb();
        var results = await db.AssetRequests.AsNoTracking().Where(row => row.Id == first || row.Id == second).ToListAsync();
        var winner = Assert.Single(results, row => row.Status == AssetRequestStatus.Issued);
        var loser = Assert.Single(results, row => row.Status == AssetRequestStatus.Approved);
        Assert.Equal(asset, winner.AssetId);
        Assert.Null(loser.AssetId);
        Assert.Equal(1, await db.AssetRequests.CountAsync(row => row.AssetId == asset && row.Status == AssetRequestStatus.Issued));
        Assert.Equal(AssetStatus.InUse, (await db.Assets.FindAsync(asset))!.Status);
        Assert.Equal(new[] { "RequestCreated", "RequestApproved", "RequestIssued" }, await Actions(db, winner.Id));
        Assert.Equal(new[] { "RequestCreated", "RequestApproved" }, await Actions(db, loser.Id));
        var entityId = winner.Id.ToString(System.Globalization.CultureInfo.InvariantCulture);
        var issued = await db.AuditEvents.SingleAsync(row =>
            row.EntityId == entityId && row.EntityType == nameof(AssetRequest) && row.Action == "RequestIssued");
        Assert.Equal(await db.Users.Where(user => user.Email == "admin@assetflow.test").Select(user => user.Id).SingleAsync(), issued.ActorId);
    }

    [Fact]
    public async Task Reject_requires_reason_and_records_it_with_the_transition()
    {
        var id = await NewRequest(employeeA, "Laptops");
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync(AdminPath + id + "/reject", new { reason = "  " })).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await admin.PostAsJsonAsync(AdminPath + id + "/reject", new { reason = "Outside policy" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsync(AdminPath + id + "/approve", null)).StatusCode);
        await using var db = OpenDb();
        var request = (await db.AssetRequests.FindAsync(id))!;
        Assert.Equal(AssetRequestStatus.Rejected, request.Status);
        Assert.Equal("Outside policy", request.RejectionReason);
        Assert.Equal(new[] { "RequestCreated", "RequestRejected" }, await Actions(db, id));
    }

    private AssetFlowDbContext OpenDb() => new(new DbContextOptionsBuilder<AssetFlowDbContext>().UseNpgsql(connection).Options);

    private async Task<HttpClient> SignIn(string name)
    {
        var client = factory!.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new { email = name + "@assetflow.test", password = Password });
        response.EnsureSuccessStatusCode();
        var token = await response.Content.ReadFromJsonAsync<AccessToken>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token!.Token);
        return client;
    }

    private async Task<int> AddAvailableAsset(string categoryName)
    {
        await using var db = OpenDb();
        var category = await db.Categories.SingleAsync(row => row.Name == categoryName);
        var asset = new Asset { AssetCode = "QA-" + Guid.NewGuid().ToString("N"), Name = "Lifecycle test unit", CategoryId = category.Id };
        db.Assets.Add(asset);
        await db.SaveChangesAsync();
        return asset.Id;
    }

    private async Task<int> NewRequest(HttpClient employee, string categoryName)
    {
        await using var db = OpenDb();
        var category = await db.Categories.SingleAsync(row => row.Name == categoryName);
        var response = await employee.PostAsJsonAsync("/api/requests", new { categoryId = category.Id, purpose = "Lifecycle test" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<RequestDetail>())!.Request.Id;
    }

    private async Task<int> NewApprovedRequest(HttpClient employee, string category)
    {
        var id = await NewRequest(employee, category);
        var response = await admin.PostAsync(AdminPath + id + "/approve", null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null((await response.Content.ReadFromJsonAsync<RequestDetail>())!.Request.AssetCode);
        return id;
    }

    private static async Task<AssignedAsset[]> Assigned(HttpClient employee) =>
        (await employee.GetFromJsonAsync<AssignedAsset[]>("/api/requests/assigned-assets"))!;

    private static async Task<string[]> Actions(AssetFlowDbContext db, int requestId)
    {
        var id = requestId.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return await db.AuditEvents.Where(row => row.EntityType == nameof(AssetRequest) && row.EntityId == id)
            .OrderBy(row => row.OccurredAtUtc).ThenBy(row => row.Id).Select(row => row.Action).ToArrayAsync();
    }

    private void SetEnvironment(string name, string value)
    {
        previousEnvironment.Add(name, Environment.GetEnvironmentVariable(name));
        Environment.SetEnvironmentVariable(name, value);
    }

    public async Task DisposeAsync()
    {
        admin?.Dispose();
        employeeA?.Dispose();
        employeeB?.Dispose();
        if (factory is not null) await factory.DisposeAsync();
        foreach (var (name, original) in previousEnvironment) Environment.SetEnvironmentVariable(name, original);
    }

    private sealed record AccessToken([property: System.Text.Json.Serialization.JsonPropertyName("accessToken")] string Token);
}
