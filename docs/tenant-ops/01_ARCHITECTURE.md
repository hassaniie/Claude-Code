# System Architecture

## Layers

The module keeps a strict separation so the UI never depends on how data is
produced:

```
        UI (routes/, components/)
              │  reads via hooks
        Feature layer (route components own their own state + filters)
              │  calls
        Service / API layer  (data/api.ts)  ── adminApi · makeTenantApi(tenantId)
              │  resolves against
        Data model + world   (data/types.ts · world.ts · selectors.ts · live.ts)
```

- **UI** components render typed models and branch on `AsyncResult.status`.
  They never import the simulation directly.
- **Service layer** (`data/api.ts`) is the *only* seam the rest of the app talks
  to. `adminApi` sees the whole park; `makeTenantApi(tenantId)` is scoped to a
  single tenant on every call.
- **Data layer** is the deterministic `world` plus the derived `selectors` and
  the mutable `live` layer.

## Two data paths, deliberately

Mirroring how a real deployment splits a socket from its REST API:

1. **Live, push-style state** — meter snapshots, visitor status, notifications.
   Held in the single mutable `World` inside `data/live.ts` and read
   *synchronously* through the `useLive(selector)` hook (built on
   `useSyncExternalStore`). Screens that need it show live values, not spinners.
2. **Queried state** — lists, detail, reports. Goes through `data/api.ts` over
   an async, fault-injectable transport, and therefore carries real loading
   skeletons, error cards and retry via `useAsync`.

The `Settings → API Diagnostics` panel writes latency and a failure rate into
the transport so every screen's loading / error / retry path can be exercised
on demand.

## Determinism

`data/world.ts` builds the entire ecosystem from a **fixed seed**
(`createWorld(20260821)`), so tenants, meters, people, readings, invoices,
visitors and requests are identical on every reload. Only the live tick in
`data/live.ts` uses `Math.random`, and only for the small values a real socket
would push (meter drift, overstay transitions).

Timestamps are anchored to the moment the module loads (`NOW`), so "today",
overstays and due-dates stay honest against wall-clock time — exactly as a real
backend would compute them.

## The live layer

`data/live.ts` holds the one mutable `World` and a version counter. Two kinds of
change flow through it:

- **The tick** — meter snapshots drift within a sensible band (never random
  noise for its own sake) and in-building visitors past their expected
  departure transition to *overstaying*, emitting a notification.
- **Commands** — every mutation a screen performs: schedule/cancel a visitor,
  submit/advance/comment/rate a request, change a tenant's lifecycle, commit an
  onboarding, acknowledge/resolve an alert, toggle a recurring schedule. Each
  updates the world in place, records an activity event, and notifies
  subscribers.

## Session and experience

`store/session.tsx` owns which experience is on screen (`admin` | `portal`),
the active `tenantId` for the portal, the admin identity, theme/preferences and
toasts. The experience is kept in step with the URL (`/admin/*` vs `/portal/*`)
by the route layouts, so the switcher, rail and notification scope always match
what's rendered.

## Why a self-contained module

Each product in this repo (PMS, EMS, Tenant Operations) is its own Vite entry so
their design systems and global styles stay isolated. Tenant Operations shares
the *design language* — Inter + JetBrains Mono, shadcn token semantics, the
validated data-viz ramp — but is deliberately calmer and less dense than the
PMS command centre, with its own indigo brand and module identities.
