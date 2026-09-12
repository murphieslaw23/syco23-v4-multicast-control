# IONOS immutable release rollback

## Summary

IONOS rollouts now stage each commit in a unique release directory and switch
the active release pointer atomically only after the runtime and Caddy endpoint
are healthy.

## Operational impact

- `IONOS_APP_DIR` now identifies the application root
  (`/opt/syco23-multicast-control`), not `current/`.
- `compose.prod.yml`, `Caddyfile`, and `deploy.sh` are kept together under
  `releases/<commit>-<run>-<attempt>/`.
- A failed candidate restores the prior image with the prior release assets.
- `shared/.env` and persistent Docker volumes remain outside releases.
- The non-root deployment account writes only `releases/`, `pointers/`, and
  the existing group-writable environment file. The application root and
  administrator credentials remain root-controlled.
- Failed releases are retained for inspection; cleanup is a deliberate operator
  action.

## Migration note

The installer refuses to overwrite an older, real `current/` directory. Move
its deployment assets into the release layout under operator supervision, then
rerun the installer. This fail-closed check preserves the only rollback copy on
hosts using the earlier in-place layout.
