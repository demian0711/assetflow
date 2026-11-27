# AssetFlow

AssetFlow is an internal IT asset management project. Employees request equipment, and admins approve requests, allocate equipment, and receive returns. The current stage provides a .NET 10 API, a React frontend, and a PostgreSQL-backed data model with optional local demo data.

## Prerequisites

- .NET 10 SDK
- Node.js 22.14 or later and npm
- Docker with the Docker Compose plugin

## Run locally in Git Bash

Run these commands from the repository root to generate local credentials, start PostgreSQL 17, and apply the EF Core migration.

```bash
node scripts/setup-env.mjs
docker compose up -d --wait db
dotnet tool restore
bash scripts/db-update.sh
```

The setup script creates `.env` from `.env.example` and leaves an existing `.env` intact. Compose stores the database in a named volume and exposes it at `127.0.0.1:5434`. Keep the generated database password for that volume.

Start the API in one terminal.

```bash
bash scripts/dev-api.sh
```

Start the frontend from the repository root in a second terminal.

```bash
cd web
npm ci
npm run dev
```

Open [AssetFlow](http://localhost:5173). The page displays **API connected** when the liveness check succeeds. Stop the API and reload the page to see **API unavailable**.

The API listens on `http://localhost:5080`. Vite uses strict port `5173` and proxies `/api` and `/health` to the API.

```bash
curl -fsS http://localhost:5080/health/live
curl -fsS http://localhost:5080/health/ready
curl -fsS http://localhost:5173/health/live
```

Both health endpoints return HTTP 200 and `{"status":"healthy"}` when the API and database are reachable. If PostgreSQL stops while the API is running, liveness stays at 200 and readiness returns HTTP 503 with `{"status":"unhealthy"}`.

## Local demo accounts

After applying the migration, set `DemoSeed__Enabled=true` in `.env` and start or restart the API with `bash scripts/dev-api.sh`. The seed runs only in Development when enabled. It creates these ASP.NET Core Identity accounts, four categories, and 24 devices. Repeated starts preserve existing accounts and inventory.

| Role | Email |
| --- | --- |
| Admin | `admin@assetflow.test` |
| Employee | `employee1@assetflow.test` |
| Employee | `employee2@assetflow.test` |

The accounts share the generated `DemoSeed__Password` in your local `.env`. View it locally with `grep '^DemoSeed__Password=' .env`. That password is used when each account is first created. The accounts are available in the Identity store for a later sign-in stage.

## Build and check

Run these commands from the repository root.

```bash
dotnet build AssetFlow.slnx
cd web
npm ci
npm run lint
npm run typecheck
npm run build
```
