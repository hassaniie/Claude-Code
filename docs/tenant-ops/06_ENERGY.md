# Energy

The most important domain. It answers, for admin and tenant alike: how much are
we drawing, when does peak fall, what are we charged, and is anything unusual or
offline.

## Metrics received per meter

`ElectricalSnapshot`: active power (kW), voltage (V), current (A), power factor,
frequency (Hz), apparent power (kVA), reactive power (kVAr), max demand and peak
demand (kW). `MeterReading` buckets carry kWh with a peak/off-peak split, demand
and average PF, at hourly / daily / monthly granularity.

## Meter architecture (§12)

- **Main meter** — one per floor, `kind:'main'`, `tenantId:null`. Infrastructure,
  not the tenant's. The Meters registry and the meter drawer clearly label it as
  a *Floor main incomer*.
- **Sub-meter** — `kind:'sub'`, bound to a tenant and office. A tenant's
  consumption and charges come only from these.

Delta Block has two floors (Ground, First), each with a main meter; the taller
towers add more floors. Every floor's main is distinct from the tenant
sub-meters beneath it.

## Admin experience (§13)

`Energy → Overview · Tenant Consumption · Meters · Tariffs & Rates · Charges &
Billing · Alerts`. Every chart answers a specific operational question:
park-wide consumption + peak overlay, peak vs off-peak split, highest-consuming
tenants, offline meters, per-tenant comparison, tariff impact preview.

## Tariffs & rates (§14–15)

Globally configured, with effective periods. Components: energy, genset, peak,
off-peak (PKR/kWh). The Tariffs screen shows the current schedule, an
adjust-and-preview impact panel (models a park-wide change before applying),
full rate history with effective windows, and the data-driven peak windows.

**Critical rule:** historical billing must not be recomputed when rates change.
Each `Invoice` binds to its `tariffId`; a rate change opens a new effective
period going forward only.

## Billing & charges (§16)

Tenants see complete billing: period, total/peak/off-peak consumption, energy
and genset charges with applicable rates, historical bills, payment status,
outstanding amount, due date and a downloadable invoice (CSV + print/PDF). No
estimated billing and no online payment in this release; the invoice data model
and export path are ready for both.

## Tenant portal (§17)

`Energy → Overview · Consumption · Demand & Load · Energy Details · Billing &
Charges · Alerts`, with a date-range control (Today / 7 / 30 days / This Month /
Prev Month / Year). **Energy Details** uses progressive disclosure —
Summary → Consumption → Demand & Load → Electrical Parameters → Historical — so
voltage/current/PF/frequency/reactive/apparent never crowd the overview. The
homepage deliberately shows no raw electrical metrics.

## Alerts (§18)

States: Normal / Attention / Warning / Critical / Offline. Admin controls
whether alerts are enabled and how they behave (per-tenant `AlertRule`);
tenants receive the relevant ones and can acknowledge. Each alert carries title,
description, severity, source, timestamp, status and the related tenant/meter.
