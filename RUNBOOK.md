# RUNBOOK — SYCO23 Multicast Control

## Production target

The canonical target is Ubuntu 24.04 x86_64 on the IONOS VPS-L profile. Docker Compose is primary; native systemd is a recovery fallback. The application binds to loopback and is expected to sit behind the production TLS reverse proxy.

## Required configuration

1. Copy `.env.example` to `.env` and keep it outside version control.
2. Keep `SYCO_DB_DRIVER=native` and place `SYCO_DB_PATH` on persistent storage.
3. Configure `SYCO_BOOTSTRAP_ADMIN_USER` and a strong one-time `SYCO_BOOTSTRAP_ADMIN_PASSWORD`, or configure role tokens.
4. Remove the bootstrap password from the environment after the administrator account exists.
5. Store provider credentials in environment variables or `/run/secrets/*`; destination records contain references only.

Production startup fails when no authentication mechanism is configured.

## Release verification

```bash
npm ci
npm run release:check
npm sbom --sbom-format cyclonedx > syco23-application.cdx.json
```

The GitHub CI pipeline additionally runs production-runtime Playwright tests, builds the hardened image, scans high/critical image findings, and stores the SBOM. Tag workflows publish the image with build provenance and SBOM attestations.

## Docker deployment

```bash
cp .env.example .env
# Edit .env before continuing.
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs --tail=200 syco23-control
curl --fail http://127.0.0.1:${SYCO_BIND_PORT:-3000}/api/health/ready
```

The container runs as UID/GID `10001`, with a read-only root filesystem, dropped capabilities, `no-new-privileges`, bounded PIDs, CPU/memory limits, log rotation and a 30-second shutdown grace period.

## Backup and restore drill

Create a backup before each upgrade and periodically prove restoration on a disposable database:

```bash
curl --fail -X POST \
  -H "Authorization: Bearer $SYCO_ADMIN_TOKEN" \
  http://127.0.0.1:3000/api/backups

curl --fail -H "Authorization: Bearer $SYCO_ADMIN_TOKEN" \
  http://127.0.0.1:3000/api/backups/export \
  --output syco23-backup.sqlite

cp syco23-backup.sqlite /tmp/syco23-restore-drill.sqlite
sqlite3 /tmp/syco23-restore-drill.sqlite 'PRAGMA integrity_check;'
```

An integrity result other than `ok` blocks deployment. Restore operations require administrator authentication and should be followed by readiness, login, destination, schedule and audit smoke checks.

## Upgrade sequence

1. Export and integrity-check a backup.
2. Pull or unpack the immutable release.
3. Run `npm ci` and `npm run release:check` in the candidate release.
4. Build the candidate image.
5. Start it against a copied database and execute readiness plus authenticated smoke tests.
6. Activate the release only after the candidate passes.
7. Retain the previous image and backup until the next successful operational review.

## Rollback

1. Stop the failed candidate without deleting persistent volumes.
2. Start the previous known-good image.
3. Restore the pre-upgrade backup only when the schema/data migration requires it.
4. Verify `/api/health/ready`, authentication, destinations, schedules, revision history and audit logging.
5. Record the rollback as an incident and preserve failed-release logs.

## Provider acceptance

The repository verifies all ten provider adapters through deterministic contract tests: destination validation, profile policy, URL construction, authenticated probes and metadata publishing. Real platform acceptance still requires isolated provider sandbox credentials and must never use production stream keys.

## Routine diagnostics

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm audit --audit-level=high
docker compose logs --since=30m syco23-control
```

Inspect SQLite with the service stopped or through a copied backup. Do not manually remove `-wal` or `-shm` files from a running database.
