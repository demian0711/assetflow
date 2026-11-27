# AssetFlow

- Backend uses ASP.NET Core .NET 10 controllers in `src/AssetFlow.Api`, with `AssetFlow.slnx` at the root. Local API runs at `http://localhost:5080`.
- Frontend uses Vite, React, and TypeScript in `web/`. Vite runs at `http://localhost:5173` and proxies `/api` and `/health` to the API.
- Build the solution from the root with `dotnet build AssetFlow.slnx`. In `web/`, run `npm ci`, `npm run lint`, `npm run typecheck`, and `npm run build`.
- Product goal. Employees request equipment. Admins approve requests, allocate equipment, and receive returned equipment.
- Work only on the scope assigned for the current task. Record verified progress in `docs/STATUS.md`.
