using Npgsql;

namespace AssetFlow.Api.Inventory;

internal static class InventoryProblems
{
    public static bool IsDuplicate(Exception error, string index) =>
        (error as PostgresException ?? error.InnerException as PostgresException) is
        { SqlState: PostgresErrorCodes.UniqueViolation } postgres && postgres.ConstraintName == index;

    public static IDictionary<string, object?> FieldError(string field, string message) =>
        new Dictionary<string, object?>
        {
            ["errors"] = new Dictionary<string, string[]> { [field] = [message] }
        };
}
