# SYCO23 V4.1 — Long Reference Pack

## 1. Ecosystem Split

SYCO23 V4.1 separates the platform into four build/use projects:

1. syco23-webplayer
2. syco23-transmission
3. AzuraCast on Linode VPS
4. syco23bot + syco23adminbot

This split is mandatory for planning, architecture, and documentation.

## 2. Shared Brand Rules

- SYSTEM CORRUPT formal, SYCO23 public, SYCO compact.
- Mechanical totem, ancient energy, large sound-system scale.
- Dark mineral, worn industrial surfaces.
- One dominant key color per screen or mode.
- Motion must feel like signal or machinery.
- Avoid terminal, neon rave, cyberpunk, glossy startup, SaaS dashboard clichés.

## 3. Shared System Rules

- Modular architecture.
- Shared status vocabulary.
- Shared metadata normalization layer.
- Shared naming and token logic.
- Mobile-first where user-facing.
- Accessibility and reduced-motion support.
- Stability under live conditions.

## 4. Project Reference

### 4.1 syco23-webplayer
Purpose: public listening/player surface.

Main feature groups:
- Live playback
- Metadata display
- Background/artwork rendering
- Responsive public player UI
- Future embed mode
- Future video/live preview compatibility

### 4.2 syco23-transmission
Purpose: multistream operator webapp.

Main feature groups:
- Provider routing
- Template previews
- Custom templates
- Output profiles
- Transmission kits
- Preview player
- Logs
- Persistence
- FFmpeg pipeline
- Watchdog
- Diagnostics/schedule/archive

### 4.3 AzuraCast on Linode VPS
Purpose: radio backbone.

Main feature groups:
- Station hosting
- Canonical now-playing/API
- Ingest/distribution
- Stable infrastructure role
- Upstream source for SYCO23 middleware

### 4.4 syco23bot + syco23adminbot
Purpose: Telegram community and operations extension.

Main feature groups:
- Public status and links
- Now playing queries
- Schedule/archive hooks
- Admin alerts and health
- Safe operator shortcuts

## 5. Integration Direction

- Webplayer, transmission, and bots must consume normalized SYCO23 APIs where possible.
- AzuraCast remains upstream, not the main app layer.
- Custom statistics and richer metadata should be provided through middleware/persistence.

## 6. Main User Story Themes

- Listener quick access
- Operator low-friction control
- Stable radio infrastructure
- Remote admin awareness via Telegram
- Shared ecosystem language and branding

## 7. Documentation Set V4.1

Maintain these docs:
- `SYCO23-v4.1-master-product-spec.md`
- `SYCO23-v4.1-long-reference-pack.md`
- `SYCO23-v4.1-short-production-prompt.md`
- `SYCO23-v4.1-final-prompt-pack.md`
- `SYCO23-v4.1-user-stories.md`
