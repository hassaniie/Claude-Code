# API Architecture

The application is built as if real APIs already exist. Screens talk to the
service layer in [`src/tenant/data/api.ts`](../../src/tenant/data/api.ts) and
nothing else.

## Two clients

```ts
adminApi                       // sees the whole park
const api = makeTenantApi(id)  // scoped to one tenant on every call
```

`makeTenantApi(tenantId)` is the isolation seam the portal is built on. Every
method embeds the `tenantId` in its resolver, so a tenant cannot read another
tenant's data even if the UI asked.

## Envelope, errors, transport

- Every read returns through `useAsync`, which yields the `AsyncResult`
  envelope: `{ status: 'idle'|'loading'|'success'|'error', data?, error?,
  fetchedAt? }`. Screens branch on `status`.
- `ApiError` carries `status`, `endpoint`, `retryable`.
- `transport` holds `minLatency` / `maxLatency` / `failureRate` / `enabled`.
  The Settings diagnostics panel writes to it; `useAsync` retries with
  exponential backoff.

## Commands

Mutations are thin wrappers over the live simulation, e.g.
`adminApi.transitionRequest(id, status, by)`,
`api.scheduleVisitor(input)`, `api.submitRequest(input)`,
`adminApi.setTenantStatus(id, status)`. Each updates the world, records an
activity event and notifies subscribers.

## Swapping in a real backend

1. Reimplement the method bodies in `data/api.ts` with `fetch`. The signatures,
   the `AsyncResult` envelope and the `ApiError` shape stay put — no component
   changes.
2. Point the live layer's `getState` / `subscribe` and the command methods in
   `data/live.ts` at your socket for push-style state.
3. `data/world.ts` and the in-process simulation simply stop being built.

No component imports the simulation directly, and every type a screen renders is
declared in `data/types.ts`, so the swap is contained to the data layer.

## Real-time (§37)

Simulated real-time updates cover current energy values, meter status, visitor
status, overstay, service updates, notifications and alerts. Changes are always
ones a real deployment would emit — never random noise for its own sake. Cadence
is controllable in Settings (2 / 4 / 8s) and can be paused.
