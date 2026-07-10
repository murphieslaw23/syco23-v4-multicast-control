# Layout System — SYCO23 v4 Reference

Source: `SYCO23-v4-MultiCast-Control-design-layout-prompt.md` + HTML reference.

## Primary Control Surface (Desktop)
Left/central vertical control spine with stacked operational modules.
Right side: destination matrix, provider nodes, output health, log rail.
Secondary detail in right-edge drawers.

## Destination Matrix
Each provider is a transmission node showing:
- Provider label
- State badge
- Protocol indicator
- Bitrate/output profile reference
- Last error/handshake time
- Arm/start/stop/retry controls

## Layout Variants
- Desktop: scroll-free primary surface
- Portrait mobile: stacked panels, floating bottom nav, 44x44 touch min
- Tablet: desktop-like with more vertical flexibility
- TV/4K: large type, safe zones, reduced motion

## Component Design Guidance
- Surface elevation via background shift + shadow
- Bolt-line or alpha-blended dividers
- Heavy rectangular buttons with switch-like active states
- Status communicated by label + icon + color together
