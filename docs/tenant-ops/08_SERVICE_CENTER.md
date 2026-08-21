# Service Center

Named **Service Center**, not "Complaints", for a service-oriented experience.
Internally requests may be called service requests, issues or tickets.

## Categories (§25)

Electrical, HVAC, Lighting, Plumbing, Internet, Cleaning, Security, Access
Control, Elevator, Fire & Safety, Parking, Building Maintenance, Other. No
subcategories in this release. Each category carries an icon so status is never
colour alone.

## Create a request (§26)

Tenant provides: title, description, category, priority (Low / Medium / High /
Critical), relevant office/location, and attachments (images and documents; the
model is ready for more types). Only genuinely-needed fields are required
(title + description).

## Lifecycle (§27)

```
Submitted → Acknowledged → Assigned → In Progress → Waiting for Tenant
          → Resolved → Tenant Confirmation → Closed
Additional: Cancelled · Reopened
```

Each transition has clear behavioural meaning and is recorded on the request's
timeline with actor and timestamp. SLA due dates: Critical 4h, High 12h,
Medium 48h, Low 96h.

## Workflow (§28)

```
Tenant submits → Admin notified → Acknowledged → Assigned → In Progress
→ updates shared with tenant → Resolved → tenant reviews → Confirmed → Closed
```

## Admin workspace (§30)

- **Requests** — table with category/priority/status/tenant/overdue filters and
  metrics (open, critical, overdue, avg resolution time, resolved today).
- **Board** — a Kanban across Submitted → Acknowledged → Assigned → In Progress
  → Waiting → Resolved.
- **Detail drawer** — description, meta, attachments, timeline, comment thread,
  and lifecycle actions. Admin advances the ticket and assigns.
- **Performance** — request volume (created vs resolved), category and priority
  distribution, per-tenant activity, average resolution time.

## Tenant experience (§29)

`Service Center → My Requests · New Request · History`. Each request shows its
id, title, category, priority, status, timeline, comments and attachments. The
tenant can add a comment, confirm resolution, reopen, and rate the service.

## Ratings (§31)

After resolution the tenant can rate (1–5) with optional feedback. The rating
attaches to the completed request and feeds Performance analytics — no
gamification.
