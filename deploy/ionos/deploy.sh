#!/usr/bin/env bash
#
# Roll the SYCO23 runtime on the IONOS VPS forward to a published image.
#
#   ./deploy.sh ghcr.io/owner/repo:sha-abc1234
#
# The script is idempotent and self-healing: it records the image it is
# replacing, waits for the container healthcheck to pass, and restores the
# previous image if the new one fails to become healthy.
set -euo pipefail

IMAGE="${1:-}"
if [[ -z "${IMAGE}" ]]; then
  echo "usage: $0 <image-reference>" >&2
  exit 2
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${APP_DIR}"

COMPOSE_FILE="compose.prod.yml"
ENV_FILE=".env"
CONTAINER="syco23-multicast-control"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "error: ${APP_DIR}/${ENV_FILE} is missing. Create it from .env.example before the first deploy." >&2
  exit 1
fi

compose() { docker compose --file "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"; }

# Upsert SYCO_IMAGE in the env file, leaving every operator-managed value alone.
set_image() {
  local image="$1"
  if grep -q '^SYCO_IMAGE=' "${ENV_FILE}"; then
    sed -i "s|^SYCO_IMAGE=.*|SYCO_IMAGE=${image}|" "${ENV_FILE}"
  else
    printf '\nSYCO_IMAGE=%s\n' "${image}" >>"${ENV_FILE}"
  fi
}

await_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  while ((SECONDS < deadline)); do
    local status
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "${CONTAINER}" 2>/dev/null || echo "missing")"
    case "${status}" in
      healthy) return 0 ;;
      unhealthy) echo "container reported unhealthy" >&2; return 1 ;;
      *) sleep 3 ;;
    esac
  done
  echo "timed out after ${HEALTH_TIMEOUT_SECONDS}s waiting for ${CONTAINER} to become healthy" >&2
  return 1
}

PREVIOUS_IMAGE="$(grep '^SYCO_IMAGE=' "${ENV_FILE}" | tail -n1 | cut -d= -f2- || true)"
echo "deploying ${IMAGE} (previous: ${PREVIOUS_IMAGE:-none})"

set_image "${IMAGE}"
compose pull
compose up -d --remove-orphans

if await_health; then
  echo "deployment healthy: ${IMAGE}"
  docker image prune --force --filter "until=168h" >/dev/null 2>&1 || true
  exit 0
fi

echo "deployment failed; recent logs:" >&2
compose logs --tail=100 syco23-control >&2 || true

if [[ -z "${PREVIOUS_IMAGE}" ]]; then
  echo "no previous image recorded, leaving the failed release in place for inspection" >&2
  exit 1
fi

echo "rolling back to ${PREVIOUS_IMAGE}" >&2
set_image "${PREVIOUS_IMAGE}"
compose pull
compose up -d --remove-orphans
if await_health; then
  echo "rollback to ${PREVIOUS_IMAGE} healthy" >&2
else
  echo "rollback to ${PREVIOUS_IMAGE} did NOT become healthy — manual intervention required" >&2
fi
exit 1
