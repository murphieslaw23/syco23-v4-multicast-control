# RUNBOOK — SYCO23 Multicast Control

## Current source form
- This repo is a documentation/bootstrap checkpoint for the SYCO23 v4 broadcast app.
- Runtime/broadcast source lives in the v4 reference pack in this repo root (`*.tsx`, `*.html`); the old Nuxt 3 scaffold is archived out of the active source tree.

## Branching
- Use feature branches derived from `main`.
- Keep docs changes alongside any related code/docs changes.

## Verify
- When implementing bread source: `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- When changing docs only: validate markdown structure/link references when updating indexes or runbooks.

## Branch convention
- Feature or phase work on its own branch.
- `archive-documentation` is reserved for documentation archival work only.
