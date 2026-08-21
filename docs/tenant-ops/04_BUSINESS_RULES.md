# Business Rules

## Tenant lifecycle

```
Draft → Pending Configuration → Pending Activation → Active
                                                       ├→ Suspended → (Reactivate) → Active
                                                       ├→ Expired   → (Renew) → Active
                                                       └→ Archived
```

| State | Meaning | Portal |
| --- | --- | --- |
| Draft | Information incomplete | no access |
| Pending Configuration | Exists, infra/config incomplete | no access |
| Pending Activation | Config complete, awaiting activation | no access |
| Active | Operational | enabled |
| Suspended | Exists, access disabled | disabled |
| Expired | Contract lapsed | disabled |
| Archived | Historical record | disabled |

Prefer lifecycle actions (Activate / Suspend / Reactivate / Archive) over
destructive deletion. Dangerous actions confirm first; lifecycle actions toast
the outcome.

## Onboarding

Seven validated steps: Organization → Location & Spaces → Energy Infrastructure
→ Energy Configuration (rates shown, not edited) → Energy Alerts → Portal Access
→ Review & Activate. Save-as-draft at any point; a live preview updates as you
progress. On **Activate**, the tenant, its offices, sub-meters and primary user
are committed and portal access is created (`simulation.commitOnboarding`).

## Tariffs and historical billing

- Rates are **globally configured**, never per-tenant.
- Charge = **Consumption × Applicable Rate**.
- Rates have **effective periods**. Historical consumption stays bound to the
  rate that applied during its period — changing a rate opens a new period and
  never recomputes a past bill.
- Peak/off-peak windows are **data-driven** (`PeakWindow`), not hardcoded.

## Peak / off-peak

Default evening peak is 18:00–22:00, Mon–Fri; all other hours are off-peak. The
window is configurable data, so a deployment can change it without code.

## Visitor rules

- **Individual visitors only** (no group scheduling).
- The visitor receives **no QR code / digital pass** — they arrive at reception,
  which verifies their details.
- Lifecycle: `Scheduled → In Building → Checked Out`, plus `Cancelled`,
  `No Show`, `Overstaying`.
- **Overstay**: when `now > expectedDeparture` and status is `In Building`, the
  system flags *Overstaying*, notifies the tenant and surfaces it prominently —
  but does not treat every overstay as a security incident.
- Recurring schedules generate individual visit instances; pausing stops future
  instances and never modifies past visits.

## Service request lifecycle

```
Submitted → Acknowledged → Assigned → In Progress → Waiting for Tenant
          → Resolved → Tenant Confirmation → Closed
Additional: Cancelled, Reopened
```

- **Admin** advances the ticket and assigns; **tenant** confirms resolution,
  reopens, and rates.
- SLA due dates by priority: Critical 4h, High 12h, Medium 48h, Low 96h. A
  request past its due date while still open is **overdue**.
- Ratings attach to the completed request and feed Performance analytics; no
  gamification.

## Energy alerts

Per-tenant `AlertRule`s (enabled, threshold, severity, notify) cover high
consumption, high demand, charge/budget threshold, meter offline, unusual
consumption and low power factor. Fired `EnergyAlert`s carry severity (info /
attention / warning / critical), source, tenant/meter, value vs threshold, and
a status (active / acknowledged / resolved).

## Tenant data isolation

The portal is scoped by `tenantId` on **every** service-layer call
(`makeTenantApi(tenantId)`). A tenant can only ever read its own offices,
meters, charges, visitors, requests and notifications. This is the product's
core security boundary and is enforced in the data layer, not the UI.
