# Roadmap

Built in the sequence the brief defines (§54), committed phase by phase.

## Shipped

| Phase | Delivered |
| --- | --- |
| 1 · Foundation | Module + entry, design tokens (light/dark), UI kit, charts, common layer, deterministic NASTP world, live simulation, API-ready service layer, role-aware shell (Admin ↔ Portal), experience switcher, command palette, routing. Flagship: Admin dashboard + Portal home. |
| 2 · Tenant Management | Directory (table + cards, filters, quick actions), 7-step onboarding wizard with live preview, tenant detail workspace (8 tabs, lifecycle actions). |
| 3 · Energy | Admin: overview, tenant consumption, meters (+ live drawer), tariffs (effective periods + impact preview), billing (+ invoice export), alerts. Tenant: 6-tab energy section with ranges, progressive-disclosure details, bills. |
| 4 · Visitors | Reception verify → in-building → check-out; overstay detection; admin operations (overview/scheduled/inside/overstaying/history); portal upcoming/schedule/recurring/inside/history. |
| 5 · Service Center | Request lifecycle + drawer (timeline, comments, actions); admin requests/board/performance; portal my-requests/new/history with attachments; confirm/reopen/rate. |
| 6 · Cross-system | Notifications center (admin + portal), Reports (catalogue + CSV/PDF), global search, Settings + diagnostics, Buildings & Spaces, Users, Organization. |

## Architected, ready to enable

- **Additional roles** — the model supports Building Admin, Energy Manager,
  Finance Manager, Receptionist, Maintenance Manager, Technician, Tenant
  Manager, Read-only Executive without a redesign. Admin is the only active role
  today.
- **Multiple portal users** per tenant (primary configured now).
- **Notification channels** — email / SMS / push. In-app is live; the category
  model and delivery seam are ready.
- **Downloadable invoices / server-rendered PDF** — the invoice model and export
  path exist; print/CSV ship today.
- **Multi-building tenants** — arrays throughout; not structurally prevented.
- **Additional charge components** and per-tenant tariff overrides — the data
  model can carry them if a business requirement appears.

## Swap to a real backend

Reimplement `data/api.ts` with `fetch` and point `data/live.ts` at a socket. See
[10_API](10_API.md). No component changes required.
