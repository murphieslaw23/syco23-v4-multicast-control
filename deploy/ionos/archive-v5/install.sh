#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

DOMAIN="${DOMAIN:-api.syco23.org}"
EXPECTED_IP="${EXPECTED_IP:-87.106.219.4}"
UI_ORIGIN="${UI_ORIGIN:-https://syco23-multicast-control-v5.vercel.app}"
APP_ROOT="/opt/syco23-multicast-control"
BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCHIVE="$BUNDLE_DIR/SYCO23-Multicast-Control-v5.zip"
LOG_FILE="/var/log/syco23-multicast-control-install.log"
ENV_FILE="$APP_ROOT/shared/.env"
CREDENTIALS_FILE="/root/syco23-runtime-credentials.txt"
RUN_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

exec > >(tee -a "$LOG_FILE") 2>&1

log() {
  printf '[syco23-install] %s\n' "$*"
}

fail() {
  printf '[syco23-install] ERROR: %s\n' "$*" >&2
  exit 1
}

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run this installer as root."
fi

[[ -f "$ARCHIVE" ]] || fail "Missing $ARCHIVE"
command -v apt-get >/dev/null 2>&1 || fail "This installer supports Debian/Ubuntu hosts with apt-get."
command -v ss >/dev/null 2>&1 || fail "The host is missing ss/iproute2, so port safety cannot be verified."

log "Recording read-only host inventory."
mkdir -p "$APP_ROOT"
{
  uname -a
  cat /etc/os-release
  df -h /
  free -h || true
  ss -lntup || true
  systemctl --no-pager --type=service --state=running || true
  command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}} {{.Image}} {{.Status}} {{.Ports}}' || true
} > "$APP_ROOT/preflight-$RUN_STAMP.txt"

RESOLVED_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR == 1 { print $1 }')"
[[ -n "$RESOLVED_IP" ]] || fail "$DOMAIN does not resolve yet. Wait for DNS propagation and rerun."
[[ "$RESOLVED_IP" == "$EXPECTED_IP" ]] || fail "$DOMAIN resolves to $RESOLVED_IP, expected $EXPECTED_IP."

PORT_CONFLICTS="$(ss -ltnp | awk '$4 ~ /:80$/ || $4 ~ /:443$/ { print }')"
if [[ -n "$PORT_CONFLICTS" ]]; then
  EXISTING_SYCO_CADDY=""
  if command -v docker >/dev/null 2>&1; then
    EXISTING_SYCO_CADDY="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^syco23_multicast_control[-_]caddy[-_][0-9]+$' || true)"
  fi

  if [[ -n "$EXISTING_SYCO_CADDY" ]]; then
    log "Ports 80/443 belong to the existing SYCO23 Caddy container; continuing with an in-place update."
  else
    printf '%s\n' "$PORT_CONFLICTS"
    fail "Ports 80 or 443 are already occupied. Nothing was stopped; integrate with the existing reverse proxy instead."
  fi
fi

log "Installing only missing host prerequisites."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl unzip openssl
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y --no-install-recommends docker.io
fi
systemctl enable --now docker

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  apt-get install -y --no-install-recommends docker-compose-v2 \
    || apt-get install -y --no-install-recommends docker-compose-plugin \
    || apt-get install -y --no-install-recommends docker-compose

  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    fail "Docker Compose could not be installed."
  fi
fi

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  log "UFW is active; preserving it and adding only SSH/HTTP/HTTPS allowances."
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 443/udp
fi

STAMP="$RUN_STAMP"
RELEASE_DIR="$APP_ROOT/releases/v5-$STAMP"
mkdir -p "$APP_ROOT/releases" "$APP_ROOT/shared" "$RELEASE_DIR"
unzip -q "$ARCHIVE" -d "$RELEASE_DIR"
SOURCE_DIR="$RELEASE_DIR/syco23-multicast-control-v5"
[[ -f "$SOURCE_DIR/Dockerfile.runtime" ]] || fail "Release archive layout is invalid."

install -m 0644 "$BUNDLE_DIR/docker-compose.ionos.yml" "$SOURCE_DIR/docker-compose.ionos.yml"
install -m 0644 "$BUNDLE_DIR/Caddyfile" "$SOURCE_DIR/Caddyfile"

if [[ ! -f "$ENV_FILE" ]]; then
  JWT_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"

  {
    printf 'COMPOSE_PROJECT_NAME=syco23_multicast_control\n'
    printf 'DOMAIN=%s\n' "$DOMAIN"
    printf 'ALLOWED_ORIGIN=%s\n' "$UI_ORIGIN"
    printf 'JWT_SECRET=%s\n' "$JWT_SECRET"
    printf 'BOOTSTRAP_ADMIN_USERNAME=operator\n'
    printf 'BOOTSTRAP_ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
    printf 'MEDIA_MODE=virtual\n'
    printf 'YOUTUBE_STREAM_KEY=\n'
    printf 'TELEGRAM_STREAM_KEY=\n'
    printf 'TWITCH_STREAM_KEY=\n'
    printf 'LOCAL_PREVIEW_KEY=\n'
  } > "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  {
    printf 'SYCO23 Multicast Control runtime\n'
    printf 'URL: https://%s\n' "$DOMAIN"
    printf 'Username: operator\n'
    printf 'Password: %s\n' "$ADMIN_PASSWORD"
    printf 'Created: %s\n' "$STAMP"
  } > "$CREDENTIALS_FILE"
  chmod 600 "$CREDENTIALS_FILE"
else
  log "Reusing the existing root-only runtime environment and credentials."
fi

ln -sfn "$ENV_FILE" "$SOURCE_DIR/.env"

cd "$SOURCE_DIR"
"${COMPOSE[@]}" -f docker-compose.ionos.yml config >/dev/null
"${COMPOSE[@]}" -f docker-compose.ionos.yml pull caddy
"${COMPOSE[@]}" -f docker-compose.ionos.yml build --pull runtime
"${COMPOSE[@]}" -f docker-compose.ionos.yml up -d

log "Waiting for the runtime and public TLS endpoint."
READY=0
for _ in $(seq 1 36); do
  if curl --silent --show-error --fail --max-time 8 "https://$DOMAIN/api/health" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 5
done

if [[ "$READY" -ne 1 ]]; then
  "${COMPOSE[@]}" -f docker-compose.ionos.yml ps
  "${COMPOSE[@]}" -f docker-compose.ionos.yml logs --tail=120 runtime caddy
  fail "Public health check failed. Check IONOS firewall access for TCP 80/443 and rerun."
fi

ln -sfn "$SOURCE_DIR" "$APP_ROOT/current"

"${COMPOSE[@]}" -f docker-compose.ionos.yml ps
curl --silent --show-error --fail "https://$DOMAIN/api/health"
printf '\n'

log "Deployment complete."
log "Runtime URL: https://$DOMAIN"
log "Credentials are stored root-only at $CREDENTIALS_FILE"
log "MEDIA_MODE remains virtual until provider keys and sandbox tests are complete."
