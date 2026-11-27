# AssetFlow

- Backend uses ASP.NET Core .NET 10 controllers in `src/AssetFlow.Api`, with `AssetFlow.slnx` at the root. Run `bash scripts/dev-api.sh` to start the local API at `http://localhost:5080`.
- PostgreSQL 17 uses EF Core 10 and Npgsql. Compose binds `127.0.0.1:5434`. Generate `.env` with `node scripts/setup-env.mjs`, restore tools with `dotnet tool restore`, and apply migrations with `bash scripts/db-update.sh`.
- Frontend uses Vite, React, and TypeScript in `web/`. Vite runs at `http://localhost:5173` and proxies `/api` and `/health` to the API.
- Build the solution from the root with `dotnet build AssetFlow.slnx`. In `web/`, run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- Employees request equipment. Admins approve requests, allocate equipment, and receive returned equipment. Follow the status transitions in `docs/STATUS.md`.
- Work only on the scope assigned for the current task. Record verified progress in `docs/STATUS.md`.
