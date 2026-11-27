#!/usr/bin/env bash
set -euo pipefail

source scripts/load-env.sh

export DOTNET_ENVIRONMENT=Development
export ASPNETCORE_ENVIRONMENT=Development
exec dotnet run --project src/AssetFlow.Api --no-launch-profile -- --urls http://localhost:5080
