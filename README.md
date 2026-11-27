# AssetFlow

AssetFlow is an internal IT asset management project. Employees will request equipment, and admins will approve requests, allocate equipment, and receive returns. The current stage provides a .NET 10 API, a React frontend, and a page that checks the API connection.

## Prerequisites

- .NET 10 SDK
- Node.js 22.14 or later and npm

## Run locally in Git Bash

From the repository root, start the API in one terminal.

```bash
dotnet run --project src/AssetFlow.Api
```

From the repository root, start the frontend in a second terminal.

```bash
cd web
npm ci
npm run dev
```

Open [AssetFlow](http://localhost:5173). The page displays **API connected** when the liveness check succeeds. To check the unavailable state, stop the API and reload the page.

The API listens on `http://localhost:5080`. Vite uses strict port `5173` and forwards `/api` and `/health` to the API. Check the liveness endpoint directly and through Vite with these commands.

```bash
curl -fsS http://localhost:5080/health/live
curl -fsS http://localhost:5173/health/live
```

Both commands should return `{"status":"healthy"}`.

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
