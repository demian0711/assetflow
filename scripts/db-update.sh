#!/usr/bin/env bash
set -euo pipefail

source scripts/load-env.sh

exec dotnet ef database update --project src/AssetFlow.Api
