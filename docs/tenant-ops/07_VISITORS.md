# Visitor Management

Visitor management integrates conceptually with the wider NASTP reception
workflow. The tenant schedules; reception verifies on arrival; the host sees
live status.

## Workflow (§19)

```
Tenant schedules visitor
        ↓
Visitor appears in Scheduled
        ↓
Visitor arrives at reception   (no QR / digital pass — details verified in person)
        ↓
Reception marks In Building
        ↓
Host / tenant sees live status
        ↓
Visitor checks out → Visit completed
```

## States (§20)

```
Scheduled → In Building → Checked Out
Also: Cancelled · No Show · Overstaying
```

**Overstay** is detected on the live tick: when `now > expectedDeparture` and
status is `In Building`, the visitor becomes *Overstaying*, a notification is
sent to the tenant, and it surfaces prominently in admin visitor operations —
without being treated as a security incident.

## Schedule a visitor (§21)

Individual visitors only. Collected: full name, phone, email, CNIC/ID, passport
(where applicable), company, vehicle number, purpose, host, visit date, expected
arrival/departure, notes. Required vs optional is made obvious; the host is
picked from the tenant's own users.

## Recurring visitors (§22)

Vendors, contractors and regular contacts on a configurable recurrence (daily /
weekly / monthly / custom). Each recurrence generates individual visit
instances. Actions: pause, resume, cancel. Historical visits are never modified.

## Admin visitor operations (§24)

```
Visitor Operations → Overview · Scheduled · In Building · Overstaying · History
```

Search, tenant/date/status/building filtering, full visitor details, a visit
timeline, and reception state updates (verify & check in, check out). One
reusable filtered list backs Scheduled / In Building / Overstaying / History;
Overview adds the day's rollup and quick lists.

## The reception drawer

A shared component drives the workflow from either experience: details, notes,
a visit timeline (scheduled → arrived → departed / overstay / cancelled / no
show), and the appropriate actions — reception can verify-and-check-in and
check-out; a tenant can cancel a scheduled visit.
