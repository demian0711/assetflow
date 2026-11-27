# AssetFlow status

## Foundation verified on 2026-11-27

Verified on Windows using Git Bash, .NET SDK 10.0.404, Node.js 22.14.0, and npm 10.9.2.

| Check | Observed result |
| --- | --- |
| `dotnet sln AssetFlow.slnx list` | Listed `src/AssetFlow.Api/AssetFlow.Api.csproj`. |
| `dotnet build AssetFlow.slnx` | Passed with 0 warnings and 0 errors. |
| `npm ci` in `web/` | Installed dependencies from `package-lock.json`. |
| `npm run lint`, `npm run typecheck`, and `npm run build` in `web/` | All passed. Vite wrote the build to `web/dist/`. |
| `GET http://localhost:5080/health/live` and `GET http://localhost:5173/health/live` | Both returned HTTP 200 and `{"status":"healthy"}`. |
| `GET http://localhost:5173/api/smoke-check` | The proxy forwarded the request and the API returned HTTP 404 for the unimplemented route. |
| AssetFlow page in headless Chrome | Displayed **API connected** with the API running and **API unavailable** after stopping it and loading the page again. |
| Vite on an occupied port | Refused to start on port 5173 with `strictPort` enabled. |

Use the [README](../README.md) to repeat the local checks.

## PostgreSQL verified on 2026-11-27

Verified on Windows with Git Bash and PostgreSQL 17.12 running as a temporary native server at `127.0.0.1:5434`. The standalone Compose CLI validated the configuration. This machine had no Docker Engine for starting the Compose container.

| Command or check | Observed result |
| --- | --- |
| `docker-compose.exe config --quiet` and `docker-compose.exe config --services` | Configuration passed validation and listed `db`. |
| `node scripts/setup-env.mjs` | Created `.env` on the first run. Repeating the command preserved the file byte for byte. |
| `dotnet tool restore` | Restored the local `dotnet-ef` 10.0.15 tool. |
| `dotnet build AssetFlow.slnx` | Passed with 0 warnings and 0 errors. |
| `dotnet ef migrations has-pending-model-changes --project src/AssetFlow.Api` | The model matched the migration snapshot. |
| `bash scripts/db-update.sh` twice | Applied `20261127135055_InitialCreate` to an empty database. The second run reported that the database was up to date. |
| `bash scripts/dev-api.sh` with `DemoSeed__Enabled=false` | Started successfully. A `psql` query counted 0 users, 0 categories, and 0 assets. |
| `bash scripts/dev-api.sh` twice with `DemoSeed__Enabled=true`, stopping the API between runs | On both starts, `psql` counted 1 Admin, 2 Employees, 4 categories, and 24 available devices with distinct asset codes. User IDs and password hashes stayed the same. |
| PostgreSQL constraint checks using `psql` | PostgreSQL rejected a duplicate asset code, an invalid category foreign key, and a 501-character request purpose. |
| HTTP checks of `/health/live` and `/health/ready` on port 5080 | Readiness returned 200 with PostgreSQL running. After stopping it, liveness returned 200 and readiness returned 503. |

## Status transitions for the workflow stage

- Requests start as `Pending`. An Admin can approve or reject them. An Employee can cancel their own request before issue, from `Pending` or `Approved`.
- An Admin issues an `Approved` request by assigning an `Available` asset from the requested category. Set the request to `Issued` and the asset to `InUse` in the same transaction. The database allows one `Issued` request per asset.
- On return, an Admin sets the request to `Returned` and the asset to `Available` in the same transaction. Keep the asset reference in the returned request for history.
- Admins can retire `Available` assets. `Retired` assets and `Rejected`, `Cancelled`, and `Returned` requests are terminal.
