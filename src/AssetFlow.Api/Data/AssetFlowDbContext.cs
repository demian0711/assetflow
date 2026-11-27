using AssetFlow.Api.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace AssetFlow.Api.Data;

public sealed class AssetFlowDbContext(DbContextOptions<AssetFlowDbContext> options)
    : IdentityDbContext<User>(options)
{
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetRequest> AssetRequests => Set<AssetRequest>();
    public DbSet<AuditEvent> AuditEvents => Set<AuditEvent>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<User>()
            .HasIndex(user => user.NormalizedEmail)
            .IsUnique();

        builder.Entity<Category>(category =>
        {
            category.Property(item => item.Name).HasMaxLength(100);
            category.HasIndex(item => item.Name).IsUnique();
        });

        builder.Entity<Asset>(asset =>
        {
            asset.Property(item => item.Version).IsRowVersion();
            asset.Property(item => item.AssetCode).HasMaxLength(50);
            asset.Property(item => item.Name).HasMaxLength(150);
            asset.Property(item => item.Status).HasConversion<string>().HasMaxLength(20);
            asset.HasIndex(item => item.AssetCode).IsUnique();
            asset.HasIndex(item => new { item.CategoryId, item.Status });
            asset.HasOne(item => item.Category).WithMany()
                .HasForeignKey(item => item.CategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AssetRequest>(request =>
        {
            request.Property(item => item.Version).IsRowVersion();
            request.Property(item => item.RejectionReason).HasMaxLength(500);
            request.Property(item => item.Purpose).HasMaxLength(500);
            request.Property(item => item.Status).HasConversion<string>().HasMaxLength(20);
            request.HasIndex(item => new { item.EmployeeId, item.CreatedAtUtc });
            request.HasIndex(item => new { item.Status, item.CreatedAtUtc });
            request.HasIndex(item => item.AssetId, "IX_AssetRequests_IssuedAsset")
                .IsUnique().HasFilter("\"Status\" = 'Issued'");
            request.HasOne(item => item.Employee).WithMany()
                .HasForeignKey(item => item.EmployeeId).OnDelete(DeleteBehavior.Restrict);
            request.HasOne(item => item.Category).WithMany()
                .HasForeignKey(item => item.CategoryId).OnDelete(DeleteBehavior.Restrict);
            request.HasOne(item => item.Asset).WithMany()
                .HasForeignKey(item => item.AssetId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AuditEvent>(audit =>
        {
            audit.Property(item => item.Action).HasMaxLength(100);
            audit.Property(item => item.EntityType).HasMaxLength(100);
            audit.Property(item => item.EntityId).HasMaxLength(100);
            audit.HasIndex(item => new { item.EntityType, item.EntityId, item.OccurredAtUtc });
            audit.HasOne(item => item.Actor).WithMany()
                .HasForeignKey(item => item.ActorId).OnDelete(DeleteBehavior.SetNull);
        });
    }
}
