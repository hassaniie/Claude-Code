# Data Model

All types live in [`src/tenant/data/types.ts`](../../src/tenant/data/types.ts).
Everything a screen renders is declared there so the simulation can be swapped
for HTTP without touching a component.

## The tenant is the hub

```
Tenant
├── has many OfficeSpace          (offices/units the tenant occupies)
├── has many TenantUser           (portal users; one primary today)
├── has many Meter (kind: 'sub')  (tenant sub-meters)
├── has many MeterReading         (hourly / daily / monthly series)
├── has many Invoice              (closed billing periods)
├── has many Visitor              (+ VisitorSchedule for recurring)
├── has many ServiceRequest       (+ comments, attachments, timeline, rating)
├── has many EnergyAlert          (+ per-tenant AlertRule config)
└── has many ActivityEvent / AppNotification
```

## Physical hierarchy

```
NASTP
└── Building            (Delta, Aviation Tower, Ignite Block)
    └── Floor           (each carries exactly one main Meter)
        └── Tenant
            └── OfficeSpace   (each with an area; usually wired to a sub-meter)
```

Rules encoded in the model:

- A floor can host multiple tenants; a tenant commonly occupies multiple
  offices; owning a whole floor is uncommon.
- Multi-building tenants are extremely unlikely but not structurally
  prevented (`Tenant.floorIds` / `officeIds` are arrays).
- Area is stored in square feet; the UI renders ft² or m² per preference.

## Meter architecture

```
Building
└── Floor
    ├── Main Meter  (kind:'main', tenantId:null)  — infrastructure, not the tenant's
    ├── Tenant A → Sub-meter(s)  (kind:'sub', tenantId, officeId)
    └── Tenant B → Sub-meter(s)
```

The **main meter belongs to the floor**, never to a tenant. A tenant's
consumption and charges come only from its **sub-meters**. `Meter.live` is the
instantaneous electrical snapshot (power, voltage, current, PF, frequency,
apparent, reactive, max/peak demand) the socket updates in place.

## Tariffs & billing

- `Tariff` carries an **effective period** (`effectiveFrom` / `effectiveTo`);
  `effectiveTo: null` is the current schedule.
- `Invoice.tariffId` binds each closed period to the rate that applied then, so
  a rate change never recomputes a past bill.
- `PeakWindow` is data-driven (start/end hour, days) — peak/off-peak is never
  hardcoded.

## Core entities (abridged)

| Entity | Purpose |
| --- | --- |
| `Tenant` | The central identity; carries lifecycle status, contacts, config score |
| `TenantUser` | Portal user with a role (`primary` today; more architected) |
| `Building` / `Floor` / `OfficeSpace` | The physical catalogue |
| `Meter` / `ElectricalSnapshot` / `MeterReading` | Metering + live + historical |
| `Tariff` / `TariffRate` / `PeakWindow` | Globally-configured rates |
| `Invoice` / `BillingLine` | Closed billing periods |
| `AlertRule` / `EnergyAlert` | Per-tenant thresholds + fired alerts |
| `Visitor` / `VisitorSchedule` | One-off and recurring visits |
| `ServiceRequest` (+ `ServiceComment` / `ServiceAttachment` / `ServiceStatusEvent` / `ServiceRating`) | The service center |
| `AppNotification` / `ActivityEvent` | Cross-system feed + timeline |

## Derived views

`data/selectors.ts` computes the shapes screens actually consume, so they stay
consistent everywhere:

- `computeAdminKpis(world)` — the dashboard/overview numbers.
- `tenantSummary(world, id)` — the per-tenant rollup used by the directory and
  detail header.
- `tenantPortalSnapshot(world, id)` — the portal home/energy snapshot.
- `aggregateReadings(world, range)` — park-wide consumption series.
- `alertLevelForTenant(world, id)` — normal / attention / warning / critical /
  offline.
