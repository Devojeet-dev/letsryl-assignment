#!/usr/bin/env bash
# End-to-end smoke test against a running stack:
#   ./scripts/smoke-test.sh [base-url]
# Uploads samples/uploads/*.csv, waits for completion, prints KPIs and downloads
# the Excel report into samples/reports/.
set -euo pipefail

BASE_URL="${1:-http://localhost:4000/api/v1}"
API_ORIGIN="${BASE_URL%/api/v1}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPLOAD_DIR="$ROOT_DIR/samples/uploads"
REPORT_DIR="$ROOT_DIR/samples/reports"
TMP_JSON="$(mktemp)"
trap 'rm -f "$TMP_JSON"' EXIT

json() {
  # Reads one JSON document from stdin. Call sites use dotted paths such as
  # `d.id`, where the leading `d` is the document itself and is stripped here.
  node -e 'const d=JSON.parse(require("fs").readFileSync(0,"utf8"));const v=process.argv[1].split(".").reduce((o,k)=>o?.[k],d);console.log(v ?? "")' "${1#d.}"
}

echo "==> Resolving credentials"
TOKEN="${TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(curl -fsS -X POST "$BASE_URL/auth/demo-session" | json 'd.accessToken' || true)"
fi
if [[ -z "$TOKEN" ]]; then
  echo "No token available. Demo sign-in is disabled; re-run with TOKEN=<bearer>." >&2
  exit 1
fi

echo "==> Uploading CSVs from samples/uploads"
ARGS=()
for file in "$UPLOAD_DIR"/*.csv; do
  ARGS+=(-F "files=@$file;type=text/csv")
done

curl -fsS -X POST "$BASE_URL/batches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: smoke-$(date +%s)" \
  "${ARGS[@]}" > "$TMP_JSON"

BATCH_ID="$(json 'd.id' < "$TMP_JSON")"
echo "    batchId=$BATCH_ID"

echo "==> Waiting for processing"
for _ in $(seq 1 120); do
  curl -fsS "$BASE_URL/batches/$BATCH_ID" -H "Authorization: Bearer $TOKEN" > "$TMP_JSON"
  STATUS="$(json 'd.status' < "$TMP_JSON")"
  if [[ "$STATUS" == "COMPLETED" || "$STATUS" == "FAILED" ]]; then
    break
  fi
  sleep 1
done
echo "    status=$STATUS $(json 'd.counts.completed' < "$TMP_JSON") completed, $(json 'd.counts.failed' < "$TMP_JSON") failed"

echo "==> Dashboard KPIs"
curl -fsS "$BASE_URL/batches/$BATCH_ID/analytics" -H "Authorization: Bearer $TOKEN" > "$TMP_JSON"
node -e '
const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const amount = d.fields.find((f) => f.field === "amount");
console.log(`    rows=${d.dataQuality?.validRows ?? 0}/${d.dataQuality?.totalRows ?? 0}` +
  ` amount.mean=${amount?.mean ?? "N/A"} amount.median=${amount?.median ?? "N/A"}` +
  ` highRisk=${d.highRisk?.count ?? 0} types=${d.byTransactionType.length} branches=${d.byBranch.length}`);
' "$TMP_JSON"

echo "==> Requesting Excel report"
curl -fsS -X POST "$BASE_URL/batches/$BATCH_ID/report" -H "Authorization: Bearer $TOKEN" > /dev/null || true
for _ in $(seq 1 120); do
  curl -fsS "$BASE_URL/batches/$BATCH_ID/report/status" -H "Authorization: Bearer $TOKEN" > "$TMP_JSON"
  REPORT_STATUS="$(json 'd.status' < "$TMP_JSON")"
  if [[ "$REPORT_STATUS" == "READY" || "$REPORT_STATUS" == "FAILED" ]]; then
    break
  fi
  sleep 1
done

if [[ "$REPORT_STATUS" != "READY" ]]; then
  echo "Report status: $REPORT_STATUS" >&2
  exit 1
fi

mkdir -p "$REPORT_DIR"
OUT="$REPORT_DIR/batch-$BATCH_ID.xlsx"
curl -fsS "$BASE_URL/batches/$BATCH_ID/report" \
  -H "Authorization: Bearer $TOKEN" -o "$OUT"
echo "    saved $OUT ($(du -h "$OUT" | cut -f1))"

echo "==> Health"
curl -fsS "$API_ORIGIN/ready" | json 'd.status' || true
echo "Smoke test passed."
