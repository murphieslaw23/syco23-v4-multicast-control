# Archived — SYCO23 Multicast Control v5 IONOS deploy bundle

**Status: superseded. Do not run these files.**

This directory preserves the deployment half of the SYCO23 Multicast Control
**v5** bundle (dated 2026-07-17). It is kept for reference and reversibility,
not for use. The active installer is `../install.sh`.

## Why v5 was retired as the application

v5 and this repository's v4 runtime were competing for the same VPS, the same
`api.syco23.org` hostname and the same ports. Comparing them:

| | v4 (this repository) | v5 (archived) |
|---|---|---|
| Source | 13,250 lines, 135 files | 7,094 lines, 83 files |
| Test files | 51 | 16 |
| Tests observed passing | 261 | none — requires Node ≥24, not run here |
| Distinct `/api` paths | 31+ | 19 |
| FFmpeg streaming | always active | real adapter, but `MEDIA_MODE` defaults to `virtual`, which allocates fake PIDs and encodes nothing |
| Operational surface | auth/RBAC, rate limiting, watchdog, scheduler, retention, idempotency, audit log, WebSocket tickets, configuration revisions, HLS preview | JWT login, bootstrap admin |
| Supply chain | signed releases with SBOM and provenance attestation | none |

v4 is roughly twice the code with three times the tests, and is the only one
whose suite has been observed green. v5's own README instructs operators to
leave `MEDIA_MODE=virtual` until provider credentials and sandbox tests pass,
so its core function was never verified.

## Why v5 was better at deployment, and what was taken from it

v5's packaging was clearly stronger, and `../install.sh` is adapted from the
`install.sh` archived here. Carried over:

- a read-only host inventory written before anything is mutated
- refusing to start when ports 80/443 already belong to another service, rather
  than evicting it
- DNS verified against the expected address before requesting a certificate
- an active UFW policy preserved, with allowances only added
- secrets generated once at mode `0600` and never regenerated on reinstall
- automatic TLS through Caddy, so the host needs no separate reverse proxy

Two deliberate departures:

1. **The image is pulled, not built on the server.** v5 unzipped source and ran
   a Docker build on the host. This repository publishes a signed image to GHCR,
   so the server installs an artifact that CI already verified.
2. **The runtime network is not `internal: true`.** v5's compose marked its
   backend network internal, which blocks outbound traffic. The v4 runtime must
   reach AzuraCast for metadata, provider APIs for acknowledgement probes, and
   the RTMP ingest endpoints it pushes to. Left internal, the container would
   look healthy while being unable to stream.

## What is not archived here

The v5 **application** archive (`SYCO23-Multicast-Control-v5.zip`, ~7.7 MB) is
not committed — it is a superseded application, and belongs in release storage
rather than in this repository's history. If it exists only as a local copy,
preserve it somewhere durable before discarding the original bundle.

`CHECKSUMS.txt` is retained so a recovered copy can be verified against the
bundle these files came from.
