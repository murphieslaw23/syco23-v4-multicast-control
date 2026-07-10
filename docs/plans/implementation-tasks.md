[
  {
    "id": "task-0.1",
    "title": "Bootstrap Vite + Vue + TypeScript project",
    "milestone": 0,
    "branch": "milestone/0-bootstrap",
    "skills": ["vite-vue-prototype-scaffold", "nuxt4-build-recovery"],
    "steps": [
      "Create package.json with Vite, Vue 3, TypeScript, Vitest",
      "Create tsconfig.json, vite.config.ts, vitest.config.ts",
      "Add scripts: dev, build, test, lint, e2e"
    ],
    "verify": ["npm run build produces dist/", "npm run test returns 0"],
    "acceptance": "Milestone 0 coverage >= 100% on unit + integration tests"
  },
  {
    "id": "task-0.2",
    "title": "Add Playwright E2E harness and smoke test",
    "milestone": 0,
    "branch": "milestone/0-e2e-harness",
    "skills": ["cdp-screenshot-verification"],
    "steps": [
      "Install and configure Playwright",
      "Create tests/e2e/smoke.spec.ts",
      "Assert SYCO23 brand header visible on root page"
    ],
    "verify": ["npx playwright install", "npm run e2e passes"],
    "acceptance": "E2E smoke test passes"
  },
  {
    "id": "task-1.1",
    "title": "Implement design tokens and responsive layout",
    "milestone": 1,
    "branch": "milestone/1-design-system",
    "skills": ["syco23-designer", "syco23-v4-broadcast-deck"],
    "steps": [
      "Create assets/css/variables.css with SYCO23 v4 colors",
      "Implement useSycoLayout composable",
      "Add layout mode detection and CSS classes"
    ],
    "verify": ["npm run test tests/layout", "npm run e2e tests/e2e/layout-modes"],
    "acceptance": "Layout detector returns correct mode for viewport sizes; tokens present in CSS output"
  },
  {
    "id": "task-2.1",
    "title": "Refactor shared state composables",
    "milestone": 2,
    "branch": "milestone/2-composables",
    "skills": ["refactor-code"],
    "steps": [
      "Replace scaffold placeholders with canonical SycoAppState interface",
      "Implement useSourceIngest, useDestinationMatrix, useSycoMetadata, useLogs, useWatchdog",
      "Ensure reactive state survives route changes"
    ],
    "verify": ["npm run test tests/composables", "npm run e2e tests/e2e/destinations"],
    "acceptance": "State transitions propagate to log/UI layers; composables expose expected API"
  },
  {
    "id": "task-3.1",
    "title": "Add SQLite schema and server API routes",
    "milestone": 3,
    "branch": "milestone/3-server",
    "skills": ["full-stack-audit-remediation"],
    "steps": [
      "Create SQLite schema for streams/destinations/templates/output-profiles",
      "Implement mock API routes in Nitro server",
      "Wire middleware metadata endpoint"
    ],
    "verify": ["npm run test tests/server/schema", "npm run e2e tests/e2e/api-routes"],
    "acceptance": "All tables created; /api/metadata returns typed JSON; /api/destinations returns records"
  },
  {
    "id": "task-4.1",
    "title": "Build live control surface and provider management",
    "milestone": 4,
    "branch": "milestone/4-controls",
    "skills": ["syco23-v4-broadcast-deck"],
    "steps": [
      "Build app/pages/index.vue live control view",
      "Build app/pages/destinations.vue provider matrix and CRUD",
      "Implement provider state machine transitions"
    ],
    "verify": ["npm run test tests/features/destinations", "npm run e2e tests/e2e/destinations"],
    "acceptance": "TX-03: operator can manage multiple providers; TX-04 CRUD works; state transitions correct"
  },
  {
    "id": "task-5.1",
    "title": "Implement template gallery and transmission kits",
    "milestone": 5,
    "branch": "milestone/5-templates",
    "skills": ["syco23-designer"],
    "steps": [
      "Build app/pages/templates.vue gallery and preview generator",
      "Implement transmission kit generator composable",
      "Add custom template builder with image upload"
    ],
    "verify": ["npm run test tests/features/templates", "npm run e2e tests/e2e/templates-kit"],
    "acceptance": "TX-01: stream from templates; TX-02: custom templates; TX-05: transmission kits generate"
  },
  {
    "id": "task-6.1",
    "title": "Wire FFmpeg pipeline and watchdog service",
    "milestone": 6,
    "branch": "milestone/6-pipeline",
    "skills": ["docker-management", "docker-troubleshooting"],
    "steps": [
      "Implement managed FFmpeg child process wrapper",
      "Add watchdog monitoring and recovery triggers",
      "Report pipeline health to watchdog API endpoint"
    ],
    "verify": ["npm run test tests/features/pipeline", "npm run e2e tests/e2e/pipeline-watchdog"],
    "acceptance": "TX-09: watchdog detects failures; FFmpeg fans out to multiple destinations; health updates visible"
  },
  {
    "id": "task-7.1",
    "title": "Build log viewer and status views",
    "milestone": 7,
    "branch": "milestone/7-logs",
    "skills": [],
    "steps": [
      "Build app/pages/logs.vue colorized real-time log viewer",
      "Build app/pages/archive.vue and status view",
      "Ensure mobile-readable layout and filtering"
    ],
    "verify": ["npm run test tests/features/logs", "npm run e2e tests/e2e/logs-status-archive"],
    "acceptance": "TX-07: logs filterable by level; TX-08: status and archive views functional on mobile"
  },
  {
    "id": "task-8.1",
    "title": "Accessibility polish and coverage gates",
    "milestone": 8,
    "branch": "milestone/8-release",
    "skills": ["project-audit"],
    "steps": [
      "Add a11y contrast/touch-target checks",
      "Run full test suite and verify 100% coverage",
      "Update README/RUNBOOK for final state"
    ],
    "verify": ["npm run test -- --coverage with thresholds", "npm run e2e"],
    "acceptance": "All tests, a11y and e2e pass; coverage gate enforced; docs synced"
  }
]