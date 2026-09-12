#!/usr/bin/env bash
#
# Activate one immutable SYCO23 release on the IONOS VPS.
#
#   releases/<release-id>/deploy.sh ghcr.io/owner/repo@sha256:...
#
# Compose, Caddy, and this script are all read from the candidate release. The
# shared environment is the only mutable deployment input. The active pointer
# advances only after both the container and public TLS endpoint are healthy;
# any failure restarts the outgoing image with the outgoing release assets.
set -euo pipefail
umask 077

IMAGE="${1:-}"
if [[ -z "$IMAGE" ]]; then
  echo "usage: $0 <image-reference>" >&2
  exit 2
fi
[[ "$IMAGE" =~ ^[A-Za-z0-9._/:@+-]+$ ]] || {
  echo "error: image reference contains unsupported characters" >&2
  exit 2
}

RELEASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
RELEASES_DIR="$(cd "$RELEASE_DIR/.." && pwd -P)"
APP_ROOT="$(cd "$RELEASES_DIR/.." && pwd -P)"
ENV_FILE="$APP_ROOT/shared/.env"
CURRENT_LINK="$APP_ROOT/current"
POINTER_DIR="$APP_ROOT/pointers"
ACTIVE_POINTER="$POINTER_DIR/current"
RELEASE_ID="$(basename "$RELEASE_DIR")"
CONTAINER="syco23-multicast-control"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
PUBLIC_HEALTH_TIMEOUT_SECONDS="${PUBLIC_HEALTH_TIMEOUT_SECONDS:-180}"
next_pointer=""
staged_env_path=""

cleanup() {
  [[ -z "$next_pointer" ]] || rm -f -- "$next_pointer"
  [[ -z "$staged_env_path" ]] || rm -f -- "$staged_env_path"
}
trap cleanup EXIT

[[ "$(basename "$RELEASES_DIR")" == "releases" ]] || {
  echo "error: deploy.sh must run from APP_ROOT/releases/<release-id>" >&2
  exit 1
}
[[ "$RELEASE_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || {
  echo "error: invalid release directory name" >&2
  exit 1
}
for asset in compose.prod.yml Caddyfile deploy.sh; do
  [[ -f "$RELEASE_DIR/$asset" ]] || {
    echo "error: candidate release is missing $asset" >&2
    exit 1
  }
done
[[ -f "$ENV_FILE" && -r "$ENV_FILE" && -w "$ENV_FILE" ]] || {
  echo "error: shared environment is not readable and writable by the deployment account" >&2
  exit 1
}
[[ -L "$CURRENT_LINK" && -L "$ACTIVE_POINTER" ]] || {
  echo "error: active release pointers are missing; rerun the root installer" >&2
  exit 1
}

PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"
case "$PREVIOUS_RELEASE" in
  "$RELEASES_DIR"/*) ;;
  *) echo "error: current does not resolve beneath $RELEASES_DIR" >&2; exit 1 ;;
esac
[[ -d "$PREVIOUS_RELEASE" ]] || {
  echo "error: current release directory is missing" >&2
  exit 1
}
for asset in compose.prod.yml Caddyfile deploy.sh; do
  [[ -f "$PREVIOUS_RELEASE/$asset" ]] || {
    echo "error: current release is missing $asset" >&2
    exit 1
  }
done
[[ "$RELEASE_DIR" != "$PREVIOUS_RELEASE" ]] || {
  echo "error: candidate release is already active" >&2
  exit 1
}

compose_for() {
  local release="$1"
  shift
  docker compose --file "$release/compose.prod.yml" --env-file "$ENV_FILE" "$@"
}

# Update only SYCO_IMAGE without replacing the root-owned environment inode.
# The temporary copy is mode 0600, never printed, and deleted on every path.
set_image() {
  local image="$1"
  local replaced=0
  staged_env_path="$(mktemp "$POINTER_DIR/.env.XXXXXX")"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == SYCO_IMAGE=* ]]; then
      printf 'SYCO_IMAGE=%s\n' "$image" >>"$staged_env_path"
      replaced=1
    else
      printf '%s\n' "$line" >>"$staged_env_path"
    fi
  done <"$ENV_FILE"
  if [[ "$replaced" -eq 0 ]]; then
    printf 'SYCO_IMAGE=%s\n' "$image" >>"$staged_env_path"
  fi
  cat "$staged_env_path" >"$ENV_FILE"
  rm -f -- "$staged_env_path"
  staged_env_path=""
}

await_container_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  while ((SECONDS < deadline)); do
    local status
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CONTAINER" 2>/dev/null || echo "missing")"
    case "$status" in
      healthy) return 0 ;;
      unhealthy) echo "container reported unhealthy" >&2; return 1 ;;
      *) sleep 3 ;;
    esac
  done
  echo "timed out after ${HEALTH_TIMEOUT_SECONDS}s waiting for $CONTAINER to become healthy" >&2
  return 1
}

await_public_health() {
  local domain
  local deadline=$((SECONDS + PUBLIC_HEALTH_TIMEOUT_SECONDS))
  domain="$(grep '^DOMAIN=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
  [[ -n "$domain" ]] || {
    echo "shared environment has no DOMAIN for public verification" >&2
    return 1
  }
  while ((SECONDS < deadline)); do
    if curl --silent --show-error --fail --max-time 8 "https://$domain/api/health/ready" >/dev/null 2>&1; then
      return 0
    fi
    sleep 5
  done
  echo "timed out after ${PUBLIC_HEALTH_TIMEOUT_SECONDS}s waiting for the public TLS endpoint" >&2
  return 1
}

activate_release() {
  next_pointer="$POINTER_DIR/.current-$RELEASE_ID-$$"
  ln -s "../releases/$RELEASE_ID" "$next_pointer"
  mv -Tf "$next_pointer" "$ACTIVE_POINTER"
  next_pointer=""
}

rollback() {
  echo "rolling back image and assets from $PREVIOUS_RELEASE" >&2
  if ! set_image "$PREVIOUS_IMAGE"; then
    echo "could not restore the prior image reference" >&2
    return 1
  fi
  # A transient registry failure should not prevent use of an already-cached
  # outgoing image, so attempt the pull but always continue to compose up.
  compose_for "$PREVIOUS_RELEASE" pull || true
  if ! compose_for "$PREVIOUS_RELEASE" up -d --remove-orphans; then
    echo "could not restart the prior release assets" >&2
    return 1
  fi
  if await_container_health && await_public_health; then
    echo "rollback healthy: $PREVIOUS_IMAGE" >&2
    return 0
  fi
  echo "rollback did NOT become healthy — manual intervention required" >&2
  return 1
}

PREVIOUS_IMAGE="$(grep '^SYCO_IMAGE=' "$ENV_FILE" | tail -n1 | cut -d= -f2- || true)"
[[ -n "$PREVIOUS_IMAGE" ]] || {
  echo "error: shared environment has no previous SYCO_IMAGE" >&2
  exit 1
}
echo "deploying $IMAGE from $RELEASE_DIR (previous release: $PREVIOUS_RELEASE)"

# Validate the candidate composition before changing the shared image reference.
compose_for "$RELEASE_DIR" config >/dev/null
set_image "$IMAGE"

deployment_ok=1
compose_for "$RELEASE_DIR" pull || deployment_ok=0
if [[ "$deployment_ok" -eq 1 ]]; then
  compose_for "$RELEASE_DIR" up -d --remove-orphans || deployment_ok=0
fi
if [[ "$deployment_ok" -eq 1 ]]; then
  await_container_health || deployment_ok=0
fi
if [[ "$deployment_ok" -eq 1 ]]; then
  await_public_health || deployment_ok=0
fi
if [[ "$deployment_ok" -eq 1 ]]; then
  activate_release || deployment_ok=0
fi

if [[ "$deployment_ok" -eq 1 ]]; then
  echo "deployment healthy; current -> releases/$RELEASE_ID"
  docker image prune --force --filter "until=168h" >/dev/null 2>&1 || true
  exit 0
fi

echo "deployment failed; recent candidate logs:" >&2
compose_for "$RELEASE_DIR" logs --tail=100 syco23-control caddy >&2 || true
rollback || true
echo "failed release retained for inspection: $RELEASE_DIR" >&2
exit 1
