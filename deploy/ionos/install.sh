#!/usr/bin/env bash
#
# First-time installer for the SYCO23 Multicast Control runtime on an IONOS VPS.
#
# Adapted from the SYCO23 v5 IONOS deploy bundle, which had the better
# packaging: it inventories the host before touching it, refuses to start when
# something else already owns ports 80/443, preserves an active UFW policy,
# keeps credentials root-only, and obtains TLS automatically through Caddy.
# The application it installs is this repository's v4 runtime, pulled as a
# published image rather than built on the server.
#
#   DEPLOY_USER=syco23-deploy DOMAIN=api.example.org EXPECTED_IP=203.0.113.10 \
#   SYCO_IMAGE=ghcr.io/owner/repo@sha256:... ./install.sh
#
# Re-running is safe: an existing .env and its generated credentials are reused,
# never regenerated, so operators do not get logged out by a reinstall.
set -Eeuo pipefail
umask 077

DOMAIN="${DOMAIN:?Set DOMAIN to the public API hostname}"
EXPECTED_IP="${EXPECTED_IP:-}"
UI_ORIGIN="${UI_ORIGIN:-}"
SYCO_IMAGE="${SYCO_IMAGE:?Set SYCO_IMAGE to the GHCR image reference to install}"
DEPLOY_USER="${DEPLOY_USER:?Set DEPLOY_USER to the non-root account used by GitHub Actions}"
DEPLOY_GROUP="${DEPLOY_GROUP:-syco23-deploy}"
APP_ROOT="${APP_ROOT:-/opt/syco23-multicast-control}"
BUNDLE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$APP_ROOT/shared/.env"
CREDENTIALS_FILE="${CREDENTIALS_FILE:-/root/syco23-runtime-credentials.txt}"
LOG_FILE="/var/log/syco23-multicast-control-install.log"
RUN_STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
INITIAL_RELEASE="$APP_ROOT/releases/install-$RUN_STAMP"

exec > >(tee -a "$LOG_FILE") 2>&1

log()  { printf '[syco23-install] %s\n' "$*"; }
fail() { printf '[syco23-install] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "${EUID}" -eq 0 ]] || fail "Run this installer as root."
command -v apt-get >/dev/null 2>&1 || fail "This installer supports Debian/Ubuntu hosts with apt-get."
command -v ss      >/dev/null 2>&1 || fail "The host is missing ss/iproute2, so port safety cannot be verified."
id -u "$DEPLOY_USER" >/dev/null 2>&1 || fail "DEPLOY_USER '$DEPLOY_USER' does not exist. Create the non-root SSH account first."
[[ "$(id -u "$DEPLOY_USER")" -ne 0 ]] || fail "DEPLOY_USER must be a non-root account."
[[ "$DEPLOY_GROUP" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || fail "DEPLOY_GROUP must be a valid Linux group name."

# ── Inventory before mutation ────────────────────────────────────────────────
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
log "Inventory written to $APP_ROOT/preflight-$RUN_STAMP.txt"

# ── DNS must already point here, or Caddy cannot obtain a certificate ────────
RESOLVED_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR == 1 { print $1 }')"
[[ -n "$RESOLVED_IP" ]] || fail "$DOMAIN does not resolve yet. Wait for DNS propagation and rerun."
if [[ -n "$EXPECTED_IP" && "$RESOLVED_IP" != "$EXPECTED_IP" ]]; then
  fail "$DOMAIN resolves to $RESOLVED_IP, expected $EXPECTED_IP."
fi
log "$DOMAIN resolves to $RESOLVED_IP."

# ── Never evict another service from 80/443 ─────────────────────────────────
PORT_CONFLICTS="$(ss -ltnp | awk '$4 ~ /:80$/ || $4 ~ /:443$/ { print }')"
if [[ -n "$PORT_CONFLICTS" ]]; then
  OURS=""
  if command -v docker >/dev/null 2>&1; then
    OURS="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E '^syco23-multicast-control-caddy$' || true)"
  fi
  if [[ -n "$OURS" ]]; then
    log "Ports 80/443 belong to this stack's own Caddy; continuing with an in-place update."
  else
    printf '%s\n' "$PORT_CONFLICTS"
    fail "Ports 80 or 443 are already occupied. Nothing was stopped. Integrate with the existing reverse proxy instead of replacing it."
  fi
fi

# ── Host prerequisites, only what is missing ────────────────────────────────
log "Installing missing host prerequisites."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y --no-install-recommends ca-certificates curl openssl
command -v docker >/dev/null 2>&1 || apt-get install -y --no-install-recommends docker.io
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

# ── Application directory and delegated rollout access ─────────────────────
# The workflow account gets no ownership of the application or secret files.
# A private group grants only the access required to stage releases, advance
# the pointer, and update SYCO_IMAGE in shared/.env. The application root and
# stable current link stay root-owned.
if ! getent group "$DEPLOY_GROUP" >/dev/null 2>&1; then
  groupadd --system "$DEPLOY_GROUP"
fi
if ! id -nG "$DEPLOY_USER" | tr ' ' '\n' | grep -Fxq "$DEPLOY_GROUP"; then
  usermod -a -G "$DEPLOY_GROUP" "$DEPLOY_USER"
fi

install -d -o root -g root            -m 0755 "$APP_ROOT"
install -d -o root -g "$DEPLOY_GROUP" -m 0750 "$APP_ROOT/shared"
install -d -o root -g "$DEPLOY_GROUP" -m 2770 "$APP_ROOT/releases"
install -d -o root -g "$DEPLOY_GROUP" -m 2770 "$APP_ROOT/pointers"

if [[ (-e "$APP_ROOT/current" || -L "$APP_ROOT/current") && ! -L "$APP_ROOT/current" ]]; then
  fail "$APP_ROOT/current is not a symlink. Preserve it and migrate its assets before enabling immutable releases."
fi
if [[ -L "$APP_ROOT/current" && "$(readlink "$APP_ROOT/current")" != "pointers/current" ]]; then
  fail "$APP_ROOT/current has an unexpected target. Preserve it and inspect the host before continuing."
fi

HAD_ACTIVE_RELEASE=0
if [[ -L "$APP_ROOT/pointers/current" ]]; then
  HAD_ACTIVE_RELEASE=1
fi

install -d -o root -g "$DEPLOY_GROUP" -m 2770 "$INITIAL_RELEASE"
install -o root -g "$DEPLOY_GROUP" -m 0660 "$BUNDLE_DIR/compose.prod.yml" "$INITIAL_RELEASE/compose.prod.yml"
install -o root -g "$DEPLOY_GROUP" -m 0660 "$BUNDLE_DIR/Caddyfile"        "$INITIAL_RELEASE/Caddyfile"
install -o root -g "$DEPLOY_GROUP" -m 0770 "$BUNDLE_DIR/deploy.sh"        "$INITIAL_RELEASE/deploy.sh"

if [[ ! -L "$APP_ROOT/current" ]]; then
  ln -s "pointers/current" "$APP_ROOT/current"
fi
if [[ "$HAD_ACTIVE_RELEASE" -eq 0 ]]; then
  ln -s "../releases/install-$RUN_STAMP" "$APP_ROOT/pointers/current"
fi

# ── Secrets, generated once and then left alone ─────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  log "Generating the runtime environment and administrator credentials."
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -d '\n')"
  {
    printf 'COMPOSE_PROJECT_NAME=syco23_multicast_control\n'
    printf 'DOMAIN=%s\n' "$DOMAIN"
    printf 'SYCO_IMAGE=%s\n' "$SYCO_IMAGE"
    printf 'SYCO_BIND_PORT=3000\n'
    # The Vercel console connects its event socket straight to this runtime, so
    # its origin has to be named explicitly. Same-origin upgrades always pass.
    printf 'SYCO_ALLOWED_WS_ORIGINS=%s\n' "$UI_ORIGIN"
    printf 'SYCO_BOOTSTRAP_ADMIN_USER=operator\n'
    printf 'SYCO_BOOTSTRAP_ADMIN_PASSWORD=%s\n' "$ADMIN_PASSWORD"
    printf 'SYCO_AZURACAST_URL=\n'
    printf 'SYCO_AZURACAST_STATION=\n'
    printf 'SYCO_AZURACAST_API_KEY=\n'
    printf 'STREAM_INGEST_URL=\n'
  } > "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  {
    printf 'SYCO23 Multicast Control runtime\n'
    printf 'URL: https://%s\n' "$DOMAIN"
    printf 'Username: operator\n'
    printf 'Password: %s\n' "$ADMIN_PASSWORD"
    printf 'Created: %s\n' "$RUN_STAMP"
    printf '\nRemove SYCO_BOOTSTRAP_ADMIN_PASSWORD from the environment once the\n'
    printf 'account exists, then restart the stack.\n'
  } > "$CREDENTIALS_FILE"
  chmod 600 "$CREDENTIALS_FILE"
else
  log "Reusing the existing restricted environment and root-only credentials."
  # Existing installations advance the image through deploy.sh so a failed
  # reinstall can restore the prior image and release assets together.
  if [[ "$HAD_ACTIVE_RELEASE" -eq 0 ]]; then
    if grep -q '^SYCO_IMAGE=' "$ENV_FILE"; then
      sed -i "s|^SYCO_IMAGE=.*|SYCO_IMAGE=${SYCO_IMAGE}|" "$ENV_FILE"
    else
      printf 'SYCO_IMAGE=%s\n' "$SYCO_IMAGE" >> "$ENV_FILE"
    fi
  fi
fi

# deploy.sh must update only SYCO_IMAGE. Keep ownership with root while granting
# that single deployment group read/write access to the operator-managed file.
chown root:"$DEPLOY_GROUP" "$ENV_FILE"
chmod 0660 "$ENV_FILE"

# ── Start ───────────────────────────────────────────────────────────────────
if [[ -n "${GHCR_USER:-}" && -n "${GHCR_TOKEN:-}" ]]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
fi

if [[ "$HAD_ACTIVE_RELEASE" -eq 1 ]]; then
  "$INITIAL_RELEASE/deploy.sh" "$SYCO_IMAGE"
  [[ -n "${GHCR_TOKEN:-}" ]] && docker logout ghcr.io >/dev/null 2>&1 || true
  log "Deployment complete."
  log "Runtime URL: https://$DOMAIN"
  log "Credentials are stored root-only at $CREDENTIALS_FILE"
  log "Rollouts use non-root account $DEPLOY_USER through group $DEPLOY_GROUP."
  exit 0
fi

cd "$INITIAL_RELEASE"
"${COMPOSE[@]}" -f compose.prod.yml --env-file "$ENV_FILE" config >/dev/null
"${COMPOSE[@]}" -f compose.prod.yml --env-file "$ENV_FILE" pull
"${COMPOSE[@]}" -f compose.prod.yml --env-file "$ENV_FILE" up -d

log "Waiting for the public TLS endpoint (Caddy must complete an ACME challenge)."
READY=0
for _ in $(seq 1 36); do
  if curl --silent --show-error --fail --max-time 8 "https://$DOMAIN/api/health/ready" >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 5
done

if [[ "$READY" -ne 1 ]]; then
  "${COMPOSE[@]}" -f compose.prod.yml --env-file "$ENV_FILE" ps
  "${COMPOSE[@]}" -f compose.prod.yml --env-file "$ENV_FILE" logs --tail=120 syco23-control caddy
  fail "Public health check failed. Confirm the IONOS Cloud Firewall allows inbound TCP 80/443, then rerun."
fi

[[ -n "${GHCR_TOKEN:-}" ]] && docker logout ghcr.io >/dev/null 2>&1 || true

"${COMPOSE[@]}" -f compose.prod.yml --env-file "$ENV_FILE" ps
curl --silent --show-error --fail "https://$DOMAIN/api/health/ready"; printf '\n'

log "Deployment complete."
log "Runtime URL: https://$DOMAIN"
log "Credentials are stored root-only at $CREDENTIALS_FILE"
log "Rollouts use non-root account $DEPLOY_USER through group $DEPLOY_GROUP."
log "Open a new SSH session before the first workflow rollout so group membership is active."
log "Set SYCO_ALLOWED_WS_ORIGINS to the console origin, or live events will not arrive."
