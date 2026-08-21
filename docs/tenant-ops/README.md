# NASTP Tenant Operations

An enterprise **Tenant Operations** ecosystem for NASTP — a peer module to the
Nexus PMS and EMS in this repository. It is conceptually separate from Building
Operations while sharing a common design language, and it is organised around
one central operational identity: **the tenant**.

Everything — users, offices, meters, readings, bills, visitors, service
requests, alerts and activity — hangs off a tenant, and the tenant id is also
the **isolation boundary** the Tenant Portal is built on.

```
NASTP PLATFORM
├── BUILDING OPERATIONS   (HVAC, Energy, Parking, Fire, Lighting, CCTV, …)  ← Nexus PMS / EMS
└── TENANT OPERATIONS                                                        ← this module
    ├── NASTP ADMIN   (/admin)   — the control plane
    └── TENANT PORTAL (/portal)  — a simple, transparent workspace per tenant
```

## Run it

```bash
npm install
npm run dev        # http://localhost:5173/tenant.html
npm run build      # typecheck + production bundle (all three module entries)
npm run typecheck
```

The module is a single Vite entry (`tenant.html` → `src/tenant/main.tsx`) with
two experiences behind one shell. Use the **experience switcher** in the top bar
to drop into any tenant's portal and step back to the admin control plane — the
same product, two lenses.

## Two experiences

| | NASTP Admin (`/admin`) | Tenant Portal (`/portal`) |
| --- | --- | --- |
| **Who** | NASTP operations (one Admin role today, architected for more) | A tenant organisation's own users |
| **Feel** | A dense control plane | Calm, premium, focused |
| **Scope** | The whole park | Strictly one tenant's data |
| **Domains** | Tenants, Energy, Visitors, Service, Reports, Notifications, Admin | Home, Energy, Visitors, Service, Notifications, Organization |

## Source map

```
src/tenant/
  app/            shell (both experiences), nav, command palette, notifications, switcher
  components/
    ui/           design-system primitives (button, card, table, overlay, form, tabs, toast, page)
    charts.tsx    theme-aware Recharts wrappers with a table fallback
    common.tsx    KPI tile, metric value, timeline, stepper, rating, breadcrumb, page header
    status.tsx    domain status badges + module/category icon maps
  data/
    types.ts      the full domain model (§35)
    catalog.ts    NASTP content pools + physical catalogue
    world.ts      deterministic world generator (fixed seed)
    selectors.ts  derived views — KPIs, tenant summary, portal snapshot, aggregates
    live.ts       the live layer — meter drift, overstay detection, and every mutation command
    api.ts        API-ready service layer: adminApi + a tenant-isolated makeTenantApi()
  hooks/useAsync.ts   the single source of loading / error / retry semantics
  lib/            utils (units, currency, dates), meta (enum → label + tone), rng
  store/          session (experience, active tenant, theme, prefs, toasts)
  routes/         every screen, grouped admin/ and portal/
  styles/theme.css   design tokens — both themes, engineered not inverted
```

## Documentation

| Doc | What it covers |
| --- | --- |
| [01_ARCHITECTURE](01_ARCHITECTURE.md) | System layers, data flow, the UI → feature → service → model separation |
| [02_INFORMATION_ARCHITECTURE](02_INFORMATION_ARCHITECTURE.md) | Navigation trees, routes, user journeys |
| [03_DATA_MODEL](03_DATA_MODEL.md) | Entities and relationships, the tenant as the hub |
| [04_BUSINESS_RULES](04_BUSINESS_RULES.md) | Lifecycles, tariff effective periods, overstay, SLAs, isolation |
| [05_DESIGN_SYSTEM](05_DESIGN_SYSTEM.md) | Tokens, typography, spacing, status colour system, motion |
| [06_ENERGY](06_ENERGY.md) | Meter architecture, tariffs, peak/off-peak, billing, alerts |
| [07_VISITORS](07_VISITORS.md) | Visitor lifecycle, reception workflow, recurring, overstay |
| [08_SERVICE_CENTER](08_SERVICE_CENTER.md) | Categories, request lifecycle, workflow, ratings |
| [09_STATES_AND_EDGE_CASES](09_STATES_AND_EDGE_CASES.md) | Every state each feature supports, and the edge cases handled |
| [10_API](10_API.md) | The service layer contract and how to swap in a real backend |
| [11_ROADMAP](11_ROADMAP.md) | What ships now, what the architecture is ready for next |

## Principles this product holds to

- **The tenant is the hub.** Every entity connects through it; the portal never
  sees another tenant's data.
- **API-ready, not mock-coupled.** Screens talk to `adminApi` / `tenantApi`;
  the simulation behind them is replaceable without touching a component.
- **Calm but operational.** Information-rich where it must be, never a BMS
  control room in the tenant's face.
- **Status is never colour alone.** Every state pairs a tone with a label and,
  where useful, an icon.
- **Both themes are designed.** Light is engineered for the office daylight
  context, not inverted from dark.
