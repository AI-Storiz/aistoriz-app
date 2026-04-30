#!/usr/bin/env bash
# S3 smoke test through the API (no comic generation). Requires: jq, server running, valid user.
# Usage:
#   API_URL=http://127.0.0.1:5001 EMAIL=you@example.com PASSWORD=yourpass ./scripts/curl-test-s3.sh
set -euo pipefail

API_URL="${API_URL:-http://127.0.0.1:5001}"
if [[ -z "${EMAIL:-}" || -z "${PASSWORD:-}" ]]; then
  echo "Usage: API_URL=$API_URL EMAIL=you@example.com PASSWORD=secret $0" >&2
  exit 1
fi

TOKEN="$(curl -sf -X POST "${API_URL%/}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg e "$EMAIL" --arg p "$PASSWORD" '{email:$e,password:$p}')" | jq -r .token)"
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Login failed" >&2
  exit 1
fi

echo "POST /api/test-s3 ..."
curl -sS -X POST "${API_URL%/}/api/test-s3" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq .
