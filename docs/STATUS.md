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

Use the [README](../README.md) to repeat the local checks. The database, sign-in, and equipment workflows are planned for later stages.
