# IONOS immutable-layout recon gate

## Summary

The deployment workflow now rejects the superseded `IONOS_APP_DIR=.../current`
contract before opening an SSH session. The read-only recon workflow reports
enough filesystem metadata to distinguish a fresh host, the older in-place
layout, and the immutable release layout without reading any secret values.

## Operational impact

- `IONOS_APP_DIR` must be the application root:
  `/opt/syco23-multicast-control`.
- Recon reports owner, group, mode, symlink targets, resolved active release,
  and release directory names.
- Recon never reads `shared/.env` and never inspects container environment
  values.
- A real `current/` directory is a fail-closed migration signal; it is not
  replaced automatically.
- No production host state is changed by recon.
