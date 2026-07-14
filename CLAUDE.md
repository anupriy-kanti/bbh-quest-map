# BBH.Q-Map — Project Instructions (q-map-app)

## Context sources — read in this order, every session

1. **BBH wiki router:** `../../bbhq-wiki/AGENTS.md` — the canonical, tool-agnostic home of
   all BBH.Q context. Read it first and route yourself from there.
2. **Q-Map build state:** `../../bbhq-wiki/_ops/q-map-state.md` — current build state,
   next scopes, parked tasks, sync and deploy facts for this app.
3. **Ops registry/runbook:** `../../bbhq-wiki/_ops/README.md` and
   `../../bbhq-wiki/00-core/ops.md` — paths, repo, live URL, commands.
4. **The active session prompt / C-series handover** — governs the immediate scope.

**Precedence:** the BBH wiki is the primary context source for product context, BBH
terminology, workflow, and current direction. This local folder is secondary — it holds
the code and the stable engineering invariants below, nothing else. Do not rely on old
local notes, stale comments, or superseded handover copies found here; ground product and
workflow decisions in the wiki. If this file and the wiki disagree on anything beyond
code-level invariants, the wiki wins — and flag the conflict.

## What this project is

BBH.Q-Map (project code: BBH-J01) is an internal spatial planning and route design tool
for BBH Quests — a single-page React + Vite app used solely by Anupriy Kanti. It places
and manages spot markers on a Lalbagh Botanical Garden base map, attaches story and
metadata to each spot, and draws Quest routes as polylines across those spots. It is a
daily production tool — it must look and work like a thoughtfully made product, not a
developer utility.

## Non-negotiables

- Ask before making any decision not covered in the active session prompt
- If an error cannot be resolved in two attempts, stop and show the error message
- Do not install npm packages not already in the project without asking first
- Never rename `spotId` — it is immutable by design and referenced across the data model

## Tech stack (verified July 2026)

- React + Vite; no external pan/zoom libraries — pan and zoom are implemented natively
- Persistence: Supabase (plain REST fetch in `src/utils/storage.js`) with localStorage
  fallback — key `bbhqmap_data`, table `map_data`, single row `id = lalbagh`
- Deploy: GitHub Pages via `npm run deploy` (gh-pages) —
  live at https://anupriy-kanti.github.io/bbh-quest-map/
- Dev: `npm run dev` (localhost:5173) · Build: `npm run build`

## Git discipline

Always run from inside `q-map-app/`. After every session with commits:
`git add -A` → `git commit` → `git push` → `npm run deploy`.

## Code-level invariants (stable — safe to trust)

### Coordinate system
All spot and waypoint positions are stored as normalised values (0.0–1.0) relative to the
natural image dimensions of the base map (4500 × 3524). The rendering layer converts to
screen coordinates at runtime.

### Data model
- `spotId`: UUID v4, auto-generated on pin placement, immutable, displayed read-only
- `shortLabel`: human-editable alias, shown as pin label when no emoji is set
- `createdAt` / `updatedAt`: ISO timestamps, auto-managed
- `lat`: normalised Y coordinate · `lng`: normalised X coordinate

### BBH brand colours
- BBH Dark Purple: `#420424` — toolbar, right panel, all UI chrome
- BBH Light Cream: `#f5d2c1` — all text on dark surfaces, accents
- Map area background: `#1a0112`

### Quest colours (source of truth: `src/constants/questColours.js`)
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

### UI standards
- Font: Satoshi Variable (self-hosted, `--font-body`), sans-serif fallback
- Selected pin: cream ring (`#f5d2c1`) when selected and not in move mode
- Moving pin: amber fill (`#ff9301`) + dashed pulsing amber ring in move mode
- Cursor: `grab` on map hover, `crosshair` in move mode
- No box shadows on any chrome surfaces — flat surfaces only
- No raw data or JSON ever visible to the user

## Session naming

- B01, B02… = build sessions with defined scopes (B01.2 etc. = overflow sessions)
- C01, C02… = strategist sessions; their handovers carry current state into the wiki
- Version bump (v2.0) = reserved for major architectural changes only

## What NOT to look for here

Build history, feature status, next scopes, parked tasks, and product decisions do not
live in this file — they drift. They live in `../../bbhq-wiki/_ops/q-map-state.md` and
the wiki router's linked documents.
