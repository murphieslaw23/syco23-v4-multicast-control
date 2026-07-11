# 2026-07-11 audit remediation

- Hardened HLS preview polling against empty or malformed runtime responses so a transient refresh cannot replace the last valid reactive status with `undefined`.
- Removed a provider-contract test-order race by asserting against the metadata `PATCH` request instead of unrelated in-flight provider probes.
- Verified all 259 unit/integration tests, lint, typecheck, dependency audit, and production build.
- Reconciled the M7 plan with the implemented native SQLite/WAL and signed release automation.
- Established `app/contracts/domain.ts` as the real canonical type owner and added a regression test preventing server imports from bypassing it.
- Pinned TypeScript to the lint parser's supported range and isolated the lazy HLS runtime in its own production chunk.
- Made the Playwright runtime port configurable so E2E does not collide with unrelated local services.
- Corrected WCAG AA signal/text contrast, keyboard access for scrollable tables, mobile route reachability, and bottom-navigation stacking.
- Confirmed the coverage gate remains a release blocker: 54.49% lines, 37.87% branches, 56.20% functions, and 50.76% statements versus the configured 100% target.
