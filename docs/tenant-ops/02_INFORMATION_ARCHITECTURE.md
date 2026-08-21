# Information Architecture

Two navigation trees for the two experiences. Admin is grouped and deep; the
portal is deliberately shallow, with secondary navigation living inside each
domain page rather than in the rail.

## Admin (`/admin`)

```
Dashboard                     /admin

Tenants
├── All Tenants               /admin/tenants
├── Onboarding                /admin/tenants/new
└── (detail)                  /admin/tenants/:id

Energy
├── Overview                  /admin/energy
├── Tenant Consumption        /admin/energy/consumption
├── Meters                    /admin/energy/meters
├── Tariffs & Rates           /admin/energy/tariffs
├── Charges & Billing         /admin/energy/billing
└── Alerts                    /admin/energy/alerts

Visitors
├── Overview                  /admin/visitors
├── Scheduled                 /admin/visitors/scheduled
├── In Building               /admin/visitors/inside
├── Overstaying               /admin/visitors/overstaying
└── History                   /admin/visitors/history

Service Center
├── Requests                  /admin/service
├── Board                     /admin/service/board
└── Performance               /admin/service/performance

System
├── Reports                   /admin/reports
├── Notifications             /admin/notifications
├── Buildings & Spaces        /admin/settings/buildings
├── Users                     /admin/settings/users
└── Settings                  /admin/settings
```

## Tenant Portal (`/portal`)

Six destinations. Each domain owns a secondary tab bar.

```
Home                          /portal

Energy                        /portal/energy
├── Overview                  /portal/energy
├── Consumption               /portal/energy/consumption
├── Demand & Load             /portal/energy/demand
├── Energy Details            /portal/energy/details
├── Billing & Charges         /portal/energy/billing
└── Alerts                    /portal/energy/alerts

Visitors                      /portal/visitors
├── Upcoming                  /portal/visitors
├── Schedule Visitor          /portal/visitors/schedule
├── Recurring                 /portal/visitors/recurring
├── Inside                    /portal/visitors/inside
└── History                   /portal/visitors/history

Service Center                /portal/service
├── My Requests               /portal/service
├── New Request               /portal/service/new
└── History                   /portal/service/history

Notifications                 /portal/notifications
Organization                  /portal/organization
```

## Global search (§33)

`⌘K` / `Ctrl+K` opens the command palette. It searches **entities**, not page
text — tenants, service requests, visitors and meters — plus navigation
targets, and offers a quick action to open a tenant's portal.

## Key user journeys

- **Onboard a tenant** → Admin → Tenants → Onboarding → 7 steps → Activate →
  portal access created → lands on the new tenant's detail workspace.
- **Resolve a request** → Admin → Service → open request → advance
  (Acknowledge → Assign → In Progress → Resolve) → tenant confirms & rates.
- **A tenant reports an issue** → Portal → Service Center → New Request → track
  in My Requests → confirm resolution.
- **A tenant schedules a visitor** → Portal → Visitors → Schedule → visitor
  appears in Scheduled → reception verifies on arrival → In Building → checks
  out.
- **Investigate energy** → Admin → Energy → Overview → drill into a tenant, a
  meter's live parameters, or the tariff impact preview.
