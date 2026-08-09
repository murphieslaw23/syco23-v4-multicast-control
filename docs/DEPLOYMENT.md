# Deployment — split runtime (IONOS) and console (Vercel)

The runtime and the operator console ship independently:

| Half | Where | What runs there |
|---|---|---|
| Runtime API | IONOS VPS, Docker | `app/server/runtime-server.ts` — FFmpeg supervision, SQLite, provider workers, the event WebSocket |
| Operator console | Vercel | The Vite/Vue SPA built from `app/` into `dist/` |

FFmpeg pipelines, SQLite durability and long-lived WebSockets rule out running
the runtime on Vercel. Vercel hosts only the static console.

## How the two halves talk

`vercel.json` declares a proxy route: everything under `/api/*` on the console
origin is forwarded to `${RUNTIME_API_ORIGIN}`. The browser therefore sees a
single origin, which is why the SPA's relative `fetch()` calls and
`credentials: 'same-origin'` continue to work untouched, and why no CORS
configuration is required for the REST surface.

WebSocket upgrades cannot traverse that rewrite. The event socket connects to
the runtime directly, using `VITE_RUNTIME_WS_ORIGIN` (baked in at build time).
That connection is authenticated by the existing single-use ticket, which the
SPA obtains over the proxied REST call, and is additionally gated server-side by
`SYCO_ALLOWED_WS_ORIGINS`.

```
browser ──── /api/*  ──▶ Vercel edge ──▶ https://api.example.org  (IONOS)
        └─── /api/events/ws ──────────▶ wss://api.example.org     (IONOS, direct)
```

## One-time IONOS setup

Ubuntu 24.04 on a VPS-L profile, per the RUNBOOK.

1. Install Docker Engine with the Compose plugin.
2. Create the application directory, e.g. `/opt/syco23`, owned by the deploy user.
3. Copy `.env.example` to `/opt/syco23/.env` and fill it in. `SYCO_ALLOWED_WS_ORIGINS`
   must name the console origin. Keep this file off version control — the deploy
   workflow never overwrites it, it only rewrites the `SYCO_IMAGE` line.
4. Put a TLS reverse proxy (Caddy or nginx + Let's Encrypt) in front of the
   loopback port on the public API hostname. **TLS is mandatory**: the console is
   served over HTTPS and browsers will not let it call an HTTP origin.
   The proxy must forward `Upgrade`/`Connection` headers for `/api/events/ws`.
5. Add the deploy user's public key to `~/.ssh/authorized_keys`.

The first deploy copies `compose.prod.yml` and `deploy.sh` into that directory.

## GitHub secrets

Set on the `production` environment (and `preview` for the console):

| Secret | Purpose |
|---|---|
| `IONOS_HOST` | VPS hostname or IP |
| `IONOS_USER` | SSH user with Docker access |
| `IONOS_SSH_KEY` | Private key for that user |
| `IONOS_SSH_PORT` | Optional, defaults to 22 |
| `IONOS_SSH_KNOWN_HOSTS` | Optional; pins the host key. Without it the workflow falls back to trust-on-first-use |
| `IONOS_APP_DIR` | Application directory, e.g. `/opt/syco23` |
| `IONOS_API_HEALTH_URL` | Optional; public readiness URL verified after rollout |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Console deployment |

GHCR uses the built-in `GITHUB_TOKEN`; no registry secret is needed.

## Vercel project variables

Set in Vercel project settings, not in GitHub:

| Variable | Scope | Example |
|---|---|---|
| `RUNTIME_API_ORIGIN` | Expanded per request by the proxy route | `https://api.example.org` |
| `VITE_RUNTIME_WS_ORIGIN` | Read at build time by the SPA | `wss://api.example.org` |

`RUNTIME_API_ORIGIN` is resolved at request time, so repointing the console at a
different runtime is a variable change plus a redeploy — no code change.

## Rollout behaviour

`deploy-backend-ionos.yml` runs `release:check`, builds and pushes the image to
GHCR with provenance and an SBOM, then deploys the **immutable digest** rather
than a moving tag. On the VPS, `deploy.sh` records the outgoing image, pulls the
new one, waits up to 120s for the container healthcheck, and **restores the
previous image if the new release does not become healthy**. A failed rollback
is reported loudly rather than silently left broken.

To redeploy an image that already exists, run the workflow manually with
`image_tag` — the build job is skipped entirely.

## Verifying a deployment

```bash
# On the VPS
docker compose -f /opt/syco23/compose.prod.yml ps
curl --fail http://127.0.0.1:${SYCO_BIND_PORT:-3000}/api/health/ready

# Publicly
curl --fail https://api.example.org/api/health/ready
```

In the browser, the console is working end to end when the status view populates
(proxied REST) *and* live events arrive (direct WebSocket). If the view populates
but events never arrive, check `SYCO_ALLOWED_WS_ORIGINS` and that the reverse
proxy forwards upgrade headers.
