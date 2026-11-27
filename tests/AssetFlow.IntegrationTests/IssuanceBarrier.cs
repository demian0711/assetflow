using System.Collections.Concurrent;
using AssetFlow.Api.Models;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace AssetFlow.IntegrationTests;

internal sealed class IssuanceBarrier
{
    private readonly TaskCompletionSource release = new(TaskCreationOptions.RunContinuationsAsynchronously);
    private readonly ConcurrentQueue<uint> versions = new();
    private int arrivals;
    private int conflicts;

    public uint[] ReadVersions => versions.ToArray();
    public int Conflicts => Volatile.Read(ref conflicts);
    public int? AssetId { get; set; }

    public SaveChangesInterceptor Interceptor => new Checkpoint(this);

    private sealed class Checkpoint(IssuanceBarrier barrier) : SaveChangesInterceptor
    {
        public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(DbContextEventData eventData,
            InterceptionResult<int> result, CancellationToken cancellationToken = default)
        {
            var candidate = eventData.Context?.ChangeTracker.Entries<Asset>().SingleOrDefault(entry =>
                entry.Entity.Id == barrier.AssetId && entry.Entity.Status == AssetStatus.InUse &&
                entry.OriginalValues.GetValue<AssetStatus>(nameof(Asset.Status)) == AssetStatus.Available);
            if (candidate is not null)
            {
                barrier.versions.Enqueue(candidate.OriginalValues.GetValue<uint>(nameof(Asset.Version)));
                if (Interlocked.Increment(ref barrier.arrivals) == 2) barrier.release.TrySetResult();
                await barrier.release.Task.WaitAsync(TimeSpan.FromSeconds(15), cancellationToken);
            }

            return result;
        }

        public override ValueTask<InterceptionResult> ThrowingConcurrencyExceptionAsync(
            ConcurrencyExceptionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default)
        {
            if (eventData.Entries.Any(entry => entry.Entity is Asset asset && asset.Id == barrier.AssetId))
            {
                Interlocked.Increment(ref barrier.conflicts);
            }

            return ValueTask.FromResult(result);
        }
    }
}
