# Nexus BMS — web modules

This repository holds the front-end modules of the Nexus Building Management
System. Each module is its own Vite entry point, so their design systems and
global styles stay isolated from one another.

| Module | Entry | What it is |
| ------ | ----- | ---------- |
| **PMS — Parking Management System** | `/` (`index.html`) | Enterprise parking operations console. The active product; documented below. |
| **EMS — Energy Monitoring System** | `/ems.html` | Earlier module, implemented from the *General BMS Design* Figma file. See [`docs/EMS.md`](docs/EMS.md). |

```bash
npm install
npm run dev        # http://localhost:5173        (PMS)
                   # http://localhost:5173/ems.html (EMS)
npm run build      # typecheck + production bundle
npm run typecheck
```

---

# Nexus PMS — Parking Management System

An operations console for a four-level parking plaza: ~960 monitored bays, 168
cameras, four barriers and two ANPR lanes, all updating live. It is built for
facility operators, security teams and command-centre staff — the design
priorities are situational awareness, speed of action, and never overwhelming
the person on shift.

## The plaza

| Level | Car bays | Motorcycle bays | Cameras |
| ----- | -------- | --------------- | ------- |
| Ground | 198 | 42 | 40 |
| First | 198 | 42 | 40 |
| Second | 198 | 42 | 40 |
| Rooftop | 198 | 42 | 40 |
| **Total** | **792** | **168** | **160** + 8 lane/perimeter |

Every bay reports exactly two states — **vacant** or **occupied**. Cameras cover
**six bays each: three on one side of the aisle, three opposite**, and derive
their own status from that coverage:

- **green** — at least one covered bay is free
- **red** — all six are occupied
- **unknown** (dashed outline) — the camera is offline, so coverage cannot be trusted

That grouping is why the 2D map is laid out as camera modules rather than a flat
grid: an operator can see at a glance which cameras have run out of capacity.

The bay counts are exact multiples of six because the whole plaza is
camera-covered — 33 car modules + 7 motorcycle modules per level.

## Screens

Thirteen screens, all reachable in one keystroke (`g` then a letter) or from the
command palette:

| Screen | Route | Highlights |
| ------ | ----- | ---------- |
| Dashboard | `/` | 16 global KPIs, occupancy gauge with fill-rate projection, floor cards, live feed, alerts, occupancy/revenue trends, per-lane summary |
| Parking Plaza | `/plaza` | 2D map, list and table views over the same live data; per-floor selection; class/status filters; bay detail panel; CSV export |
| Vehicle Search | `/search` | Instant plate/owner/company lookup; capture stills and lane video; presence, payment, timeline, previous visits, associated cameras |
| Entry / Exit | `/gates` | Live lane monitoring, ANPR confidence, vehicle queues, plate override, barrier controls, auto-launched visitor registration |
| Visitors | `/visitors` | Register, ticket and charge visitors; overstay tracking; visit timeline and receipt |
| Employees | `/employees` | HR-synced records, registered vehicles, live presence, subscriptions and expiry |
| CCTV | `/cctv` | 168-channel wall with density control and pagination, playback transport, PTZ, snapshots, NVR storage |
| Barriers | `/barriers` | Per-gate state, mode, link health, four commands, plaza-wide emergency release (confirmed) |
| Reports | `/reports` | 13 standard reports, date ranges, live preview, Excel (CSV) and PDF export, scheduled delivery |
| Analytics | `/analytics` | Occupancy, heatmap, peak hours, visitor, employee and revenue analysis |
| Alerts | `/alerts` | Severity-grouped triage with acknowledge/resolve, plus the documented rule thresholds |
| Administration | `/admin` | Accounts and roles, permission matrix, tariffs, device registry, integrations, audit log |
| Settings | `/settings` | Theme, density, live cadence, notifications, and API fault injection |

## Architecture

```
src/pms/
  app/           shell, navigation, command palette, shortcuts
  components/
    ui/          design-system primitives (button, card, table, overlay, form, tabs, toast)
    pms/         domain components (stat tiles, gauges, map, camera feed, cards, panels, feed)
    charts/      themed Recharts wrappers + heatmap + sparkline
  data/          types, world generation, simulation, API client
  store/         live plaza state (useSyncExternalStore) and session state
  hooks/         useAsync — the single source of loading/error/retry semantics
  routes/        the thirteen screens
  styles/        design tokens for both themes
```

**Two data paths, deliberately.** Live plaza state (bays, cameras, lanes,
barriers, alerts) is *pushed* through `store/live.ts` — screens read it
synchronously and show a connection indicator rather than a spinner. Queried
data (search, employee and visitor lists, reports) goes through `data/api.ts`
over the async path, and therefore carries real loading skeletons, error cards
and retry. That mirrors how a real deployment splits a socket from its REST API.

**Swapping in a real backend** means reimplementing the method bodies in
`data/api.ts` with `fetch`, and `PlazaSimulation`'s public surface
(`getState`, `subscribe`, and the operator commands) against your socket. No
component imports the simulation directly, and every type a screen renders is
declared in `data/types.ts`.

**The dataset is deterministic.** `createWorld()` builds the plaza from a fixed
seed, so plates, employee records and camera IDs are identical on every reload;
only the live tick uses `Math.random`.

## Design system

`src/pms/styles/theme.css` is the single source of truth. Every semantic token
is defined twice — dark is the operational default, light is a full peer, not an
inverted afterthought.

The **data-viz palette is validated, not eyeballed.** The categorical ramp was
run through the six colour checks against the actual dark chart surface
(`#0e1219`): worst adjacent CVD ΔE 8.4, worst adjacent normal-vision ΔE 19.3,
all slots ≥ 3:1 contrast. Slot order *is* the colour-blind-safety mechanism, so
assign slots in order and never cycle. Status hues (success / warning / danger)
are reserved for state and are deliberately not part of that ramp. Three
light-mode slots sit under 3:1 on white, so light-mode charts always ship a
legend with visible labels plus the table view.

Charts follow one measure per axis. Occupancy (a stock — bays held at a moment)
and entries/exits (flows — movements per period) are drawn as separate charts
rather than sharing a y-scale, on both the Dashboard and Analytics.

## Keyboard

| Keys | Action |
| ---- | ------ |
| `⌘K` / `Ctrl+K` | Command palette — screens, plates, and operator commands |
| `/` | Focus global search |
| `?` | Keyboard shortcut reference |
| `g` then `d p v e g m c b r y a n s` | Jump to any screen |
| `1` `2` `3` | Plaza map / list / table view |
| `F` | Cycle floor on plaza screens |

## Verifying the states

Settings → API diagnostics injects latency (up to 2.2 s) and failures (up to
100%) into this console's own API client, and can force the live link into
degraded or lost states. Use it to confirm that every screen still shows a
skeleton, a readable error and a retry that works — that panel exists precisely
so those paths are exercised before a flaky network finds them.

## Stack

| Concern | Choice |
| ------- | ------ |
| Framework | React 18 + TypeScript + Vite 6 |
| Styling | Tailwind CSS v4 (`@theme inline` over CSS custom properties) |
| Primitives | Radix UI, composed into a local shadcn-style component layer in `components/ui` |
| Charts | Recharts, wrapped in `components/charts` so the palette and axis rules live in one place |
| Icons | `lucide-react` |
| Palette | Command palette via `cmdk` |
| Routing | `react-router-dom` (`HashRouter`, so deep links survive static hosting) |

## Known limitations

1. **Camera feeds are synthetic.** `CameraFeed` renders a deterministic SVG
   scene from a seed rather than decoding video. Its props (`seed`, `state`,
   `plate`, `timestamp`) are already the ones an HLS/WebRTC tile needs, so
   swapping in a real `<video>` element is contained to that one component.
2. **Fonts are loaded from Google Fonts.** In a network-restricted environment
   the app falls back to the system sans-serif stack; self-host Inter and
   JetBrains Mono for an air-gapped deployment.
3. **PDF export prints the current view** via the browser's print dialog rather
   than generating a document server-side. That keeps the export identical to
   what the operator sees; a server-rendered PDF would be a second layout to
   keep in sync.
