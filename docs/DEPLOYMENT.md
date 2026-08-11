# Deployment — split runtime (IONOS) and console (Vercel)

> **This repository owns the IONOS host.** The SYCO23 v5 bundle that previously
> claimed it is superseded; its deployment assets are archived under
> [`deploy/ionos/archive-v5/`](../deploy/ionos/archive-v5/ARCHIVE.md), and its
> packaging was adapted into `deploy/ionos/install.sh`.
>
> **Run the read-only `IONOS recon` workflow before the first install.** If the
> v5 stack or anything else still holds ports 80/443 on that box, the installer
> will refuse to start rather than evict it — which is correct, but you want to
> know beforehand.

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

Ubuntu 24.04 on a VPS-L profile, per the RUNBOOK. `deploy/ionos/install.sh`
does the work — it installs only missing prerequisites, obtains TLS through
Caddy, and needs no reverse proxy to exist beforehand.

Point the API hostname's DNS `A` record at the VPS first; Caddy cannot complete
an ACME challenge until it resolves.

```bash
# On the VPS, as root, from a copy of deploy/ionos/
DOMAIN=api.syco23.org \
EXPECTED_IP=87.106.219.4 \
UI_ORIGIN=https://your-console.vercel.app \
SYCO_IMAGE=ghcr.io/murphieslaw23/syco23-v4-multicast-control:main \
./install.sh
```

For a private GHCR package, also pass `GHCR_USER` and `GHCR_TOKEN`; the
installer logs out again afterwards.

What it does, in order: writes a read-only host inventory to
`/opt/syco23-multicast-control/preflight-*.txt`; verifies DNS resolves to
`EXPECTED_IP`; **aborts if ports 80/443 already belong to another service**,
stopping nothing; installs Docker and Compose if absent; preserves an active
UFW policy while allowing 22/80/443; generates `shared/.env` and a root-only
credentials file at mode `0600`; then starts the stack and waits for
`https://$DOMAIN/api/health/ready`.

Re-running is safe. An existing `.env` and its generated administrator password
are reused, never regenerated — only the `SYCO_IMAGE` line advances.

Afterwards, set `SYCO_ALLOWED_WS_ORIGINS` in `shared/.env` to the console
origin and restart, or live events will silently never arrive. Point
`IONOS_APP_DIR` at `/opt/syco23-multicast-control/current` so subsequent
rollouts land beside the environment the installer created.

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

## Disconnect the Vercel Git integration first

`deploy-frontend-vercel.yml` is the single owner of console deployments. This
repository also has Vercel projects wired directly to GitHub
(`syco23-v4-multicast-control-kzlh` and `syco23-multicast-control-1`), which
deploy on their own whenever a branch is pushed.

Leaving both in place means every push deploys twice, from two different build
paths, racing for the same production alias. Before enabling the workflow,
disconnect the Git integration in **Vercel → project → Settings → Git**, and
retire whichever project is not the canonical console.

Keep one project — the one whose ID goes in `VERCEL_PROJECT_ID`.

**Do not set `NODE_ENV=production` as a Vercel project variable.** It makes the
install skip devDependencies, and the build then dies with
`sh: vue-tsc: command not found` and exit code 127 — `vue-tsc` and `vite` are
both devDependencies. This is exactly why the two existing projects behave
differently on the same commit: one builds, the other fails at that line.

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
