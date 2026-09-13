# IONOS deployment ownership hardening

The first-time installer and GitHub rollout workflow now share one explicit
non-root ownership contract.

- `DEPLOY_USER` is required and must identify an existing non-root account.
- The installer creates a private `syco23-deploy` group by default and adds only
  the selected deployment account.
- The application root and stable `current` link remain owned by root. The
  group can stage uniquely named releases, advance the pointer, and update the
  image reference in `shared/.env`.
- The administrator credentials record remains `root:root` at mode `0600`.
- Before copying files or authenticating to GHCR, the workflow proves that the
  SSH account is non-root, has the expected group membership, cannot write the
  application root, can write only the required deployment paths, and can
  access Docker.

This closes the mismatch where a root-run installation produced paths that the
documented non-root GitHub deployment account could never update.
