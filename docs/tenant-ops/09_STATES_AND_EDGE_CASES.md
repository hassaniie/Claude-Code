# States & Edge Cases

## Every data surface supports (§47)

- **Loading** — meaningful skeletons (`DataTable` rows, `LoadingState`).
- **Empty** — explains what's missing and the action to take (`EmptyState`).
- **Error** — states what failed with a working retry (`ErrorState`,
  `useAsync` backoff).
- **Offline / stale** — meter status, connection scope; live values marked.
- **Partial data** — a section can render while another is unavailable (e.g.
  energy series present, a meter offline).

`AsyncBoundary` is the one place that decides which of loading / error / empty /
content renders, so a screen physically cannot forget one. The
`Settings → API Diagnostics` panel injects latency and failures to exercise all
of them (Healthy / Degraded / Outage presets).

## Edge cases designed for (§48)

| Edge case | Handling |
| --- | --- |
| Tenant with multiple offices / meters | Arrays throughout; spaces + meters tables |
| Meter offline | Status badge, alert, dashboard attention item, excluded from live sums where appropriate |
| Missing historical energy data | Charts render available buckets; table fallback |
| No visitors / no requests | Purposeful empty states |
| Visitor no-show / overstay | Distinct statuses; overstay detected on the tick |
| Recurring visitor cancellation | Removes future instances; past visits untouched |
| Duplicate visitor/tenant | Search-first flows; generated refs unique |
| Tenant with no configured meter | Energy tab shows an explanatory empty state |
| Tenant suspended with active requests | Requests persist; portal access disabled |
| Tenant archived with historical bills | Bills retained; tenant read-only |
| Rate change during a billing period | Invoices bound to their tariff; new period opens forward |
| Missing energy readings | Gaps tolerated; aggregates skip absent buckets |
| Service request reopened | `Reopened` state re-enters the workflow |
| Tenant doesn't confirm resolution | Stays `Resolved` awaiting confirmation |
| Attachment upload failure | Local remove; submission not blocked |
| API failure / partial response | Error card + retry; partial sections still render |
| Long tenant names / large numbers | Truncation + tabular/compact number formatting |
| Zero consumption / negative trends | `Delta` renders correct direction and tone |

## Permission / scope

The portal is scoped by `tenantId` at the service layer. A portal screen can
only ever request its own tenant's data; there is no client-side path to another
tenant's records.
