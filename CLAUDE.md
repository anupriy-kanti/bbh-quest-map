# BBH.Q-Map — Claude Code Project Instructions

## What this project is
An internal React + Vite web app for Before & Beyond History (BBH). It maps Quest item spots onto a Lalbagh Botanical Garden base map, supports route planning, and will eventually produce cartographic exports for Quest Guide Books. It is a daily production tool — it must look and work like a thoughtfully made product, not a developer utility.

## Non-negotiables
- Ask before making any decision not covered in the active session prompt
- If an error cannot be resolved in two attempts, stop and show the error message
- Do not install npm packages not already in the project without asking first
- Never rename `spotId` — it is immutable by design and referenced across the data model

## Tech stack
- React + Vite
- No external pan/zoom libraries — pan and zoom are implemented natively
- Browser localStorage for Phase 1 data persistence
- Hosting: Cloudflare Pages in Phase 2 (Vercel Hobby is fallback — never Netlify)

## File structure
```
q-map-app/
  src/
    assets/
      lalbagh_base.png        ← 4500×3524px base map, extracted from SVG
      bbh_logo.png
    components/
      MapCanvas.jsx           ← map display, pan, zoom, SVG overlay
      Toolbar.jsx             ← 60px header: logo/title/subtitle left, venue pill/labels toggle right
      RightPanel.jsx          ← permanent 360px right panel: StatsView or MetadataPanel
      MetadataPanel.jsx       ← spot metadata form, fills RightPanel when a spot is selected
    constants/
      questColours.js         ← source of truth for all Quest colours
      mapConfig.js            ← map dimensions and zoom limits
    utils/
      storage.js              ← loadData() / saveSpots() — localStorage key: bbhqmap_data
    App.jsx
    main.jsx
    index.css
```

## BBH brand colours
- BBH Dark Purple: `#420424` — toolbar, right panel, all UI chrome
- BBH Light Cream: `#f5d2c1` — all text on dark surfaces, accents
- Map area background: `#1a0112`

## Quest colours
| Quest | Display | Asset |
|---|---|---|
| VePQ | `#ae7742` | `#ae7742` |
| RmyQ | `#ff66c4` | `#bb0675` |
| MbhQ | `#ff9301` | `#d85a09` |
| WatQ | `#0078cf` | `#0078cf` |
| EarQ | `#00991d` | `#00991d` |
| FirQ | `#d60001` | `#d60001` |
| GrMQ | `#9b59b6` | `#7d3c98` |
| BibQ | `#e6b800` | `#b8860b` |
| DiWQ | `#2ecc71` | `#1a8a4a` |
| PlPQ | `#e67e22` | `#b35a00` |
| WinQ | `#3498db` | `#1a6699` |

## UI standards
- Font: system-ui with sans-serif fallback
- Right panel is always visible (360px, fixed width) — not an overlay or slide-in
- Pins: emoji or shortLabel shown as text label below pin body when labels are enabled
- Selected pin: cream ring (`#f5d2c1`) when selected and not in move mode
- Moving pin: amber fill (`#ff9301`) + dashed pulsing amber ring in move mode
- Cursor: `grab` on map hover, `crosshair` in move mode
- No box shadows on any chrome surfaces — flat surfaces only
- No raw data or JSON ever visible to the user

## Layout
```
┌─────────────────────────────────┬──────────────┐
│  Toolbar (60px, full width)                     │
├─────────────────────────────────┼──────────────┤
│                                 │              │
│  MapCanvas (flex: 1)            │  RightPanel  │
│                                 │  (360px)     │
│                                 │              │
└─────────────────────────────────┴──────────────┘
```
RightPanel shows StatsView when no spot is selected, MetadataPanel when a spot is selected.

## Coordinate system
All spot and waypoint positions stored as normalised values (0.0–1.0) relative to natural image dimensions (4500 × 3524). Rendering layer converts to screen coordinates at runtime.

## Data model key facts
- `spotId`: UUID v4, auto-generated on pin placement, immutable, displayed read-only
- `shortLabel`: human-editable alias, shown as pin label when no emoji is set
- `createdAt` / `updatedAt`: ISO timestamps, auto-managed
- `lat`: normalised Y coordinate · `lng`: normalised X coordinate

## Session naming
- B01, B02… = planned sessions with defined scopes
- B01.2, B01.3… = overflow sessions if context limit hit mid-scope
- Version bump (v2.0) = reserved for major architectural changes only

## Current build state
- B01 complete: map loads, pan/zoom works, fit-to-viewport on load, BBH chrome in place
- B02 complete: spot marking, metadata panel, draft auto-save, move spot (persists to localStorage), pan clamping, permanent right panel with stats view, header redesign
- B03 scope: route drawing with waypoint path model
.pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 6px 16px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 500;
  color: var(--bbh-cream);
  line-height: 1.2;
  background-color: var(--bbh-maroon);
  border: 1px solid var(--bbh-cream);
  border-radius: var(--radius-full);
  cursor: pointer;
  outline: none;
}

.pill-btn:hover {
  background-color: #5a0631; /* a slightly lighter maroon for hover */
}
