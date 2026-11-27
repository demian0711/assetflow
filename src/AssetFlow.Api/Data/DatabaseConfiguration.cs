using Npgsql;

namespace AssetFlow.Api.Data;

internal static class DatabaseConfiguration
{
    public static string? GetConnectionString(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("AssetFlow");
        if (!string.IsNullOrWhiteSpace(connectionString))
        {
            return connectionString;
        }

        var password = configuration["POSTGRES_PASSWORD"];
        if (string.IsNullOrWhiteSpace(password))
        {
            return null;
        }

        return new NpgsqlConnectionStringBuilder
        {
            Host = configuration["POSTGRES_HOST"] ?? "127.0.0.1",
            Port = configuration.GetValue("POSTGRES_PORT", 5434),
            Database = configuration["POSTGRES_DB"] ?? "assetflow",
            Username = configuration["POSTGRES_USER"] ?? "assetflow",
            Password = password,
            Timeout = 3
        }.ConnectionString;
    }
}
