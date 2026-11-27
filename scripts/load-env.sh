#!/usr/bin/env bash

if [[ ! -f .env ]]; then
  echo 'Missing .env. Run node scripts/setup-env.mjs from the repository root.' >&2
  exit 1
fi

set -a
source <(sed 's/\r$//' .env)
set +a
