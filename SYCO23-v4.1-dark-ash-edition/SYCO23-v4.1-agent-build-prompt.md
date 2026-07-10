# SYCO23 V4.1 — Agent Build Prompt Pack

Build and maintain the SYCO23 ecosystem as four coordinated projects rather than one monolith.

## Projects

1. **syco23-webplayer** — public listening/player surface.
2. **syco23-transmission** — multistream operator webapp.
3. **AzuraCast on Linode VPS** — station backbone and canonical radio backend.
4. **syco23bot + syco23adminbot** — Telegram bot project.

## Global Brand Rules

- Formal brand: SYSTEM CORRUPT
- Public surface: SYCO23
- Short form: SYCO
- Visual voice: mechanical totem, ancient energy, sound-system scale
- Avoid terminal aesthetics, neon rave styling, cyberpunk, glossy startup UI, and generic SaaS dashboards
- Use dark mineral surfaces, stacked forms, vertical axes, worn metal logic, restrained signal-like motion

## Project Requirements

### syco23-webplayer
- Public live stream playback UI
- Metadata-driven now playing and status
- Mobile-first portrait layout plus desktop and TV-safe variants
- Persistent playback where technically possible
- Future embeddable mode
- Future-compatible with public video/live preview use

### syco23-transmission
- Operator-facing multistream control app
- Supports YouTube, Telegram, TikTok, Twitch, Instagram, Mixer, Mixcloud, Facebook, plus future custom RTMP targets
- Template gallery with generated previews
- Custom template builder with uploaded backgrounds
- Custom provider output profiles including 16:9 YouTube and Telegram variants
- Provider-specific transmission kits
- Frontend video preview player
- Colorized logs
- SQLite persistence
- FFmpeg pipeline
- Ultra-efficient watchdog service
- Diagnostics, schedule, archive, overlay, and mobile-first responsive control layout

### AzuraCast on Linode VPS
- Canonical radio backend
- Main stream ingest/distribution
- Public API and now-playing source
- Stable infrastructure role
- Custom enrichment moved into SYCO23 middleware rather than raw frontend dependency

### syco23bot + syco23adminbot
- Public listener bot for live status, stream links, now playing, schedule/archive hooks
- Admin bot for stream health, alerts, provider state, and safe operational shortcuts
- Consume normalized SYCO23 APIs instead of brittle raw services

## Shared Technical Rules

- Modular architecture, not single-file output
- External libs allowed when justified
- Shared token logic and naming conventions
- Metadata middleware strategy for enrichment/custom stats
- Canonical status vocabulary across projects
- Mobile-first and responsive where user-facing
- Operational stability prioritized over decorative complexity

## Documentation Output

Maintain and update these V4.1 documents:
- Master product spec
- Long reference pack
- Short production prompt
- Final prompt pack
- User stories document

All future planning and implementation must respect the project split above.
