# Design System

The single source of truth is
[`src/tenant/styles/theme.css`](../../src/tenant/styles/theme.css). Every
semantic token is defined twice — dark is the platform default so the suite
feels like one product; **light is a full peer, engineered not inverted** for
the office daylight context most tenants live in.

## Tokens (§39)

Semantic, never hardcoded in components. Names follow shadcn semantics so the
primitive layer stays portable.

- **Surfaces** — `canvas`, `background`, `surface`, `surface-raised`,
  `surface-overlay`, `surface-inset`, `surface-subtle`.
- **Type** — `foreground`, `muted`, `subtle`, `disabled`.
- **Lines** — `border`, `border-strong`, `border-subtle`.
- **Brand** — `primary` (indigo — the tenant identity), `primary-hover`,
  `primary-active`, `primary-muted`.
- **Status** — `success`, `warning`, `critical`, `info`, `neutral` (each with a
  `-dim` companion). Reserved for state; never used as a chart series.
- **Connectivity** — `online`, `offline`.
- **Module identities** — `energy` (amber), `visitor` (teal), `service`
  (violet), so the three tenant domains are legible at a glance.
- **Data-viz** — `--viz-1..6` (validated categorical ramp) and `--seq-1..7`
  (sequential). Assign slots in order; never cycle past slot 6; never borrow a
  status or module hue for a series.

## Status colour system (§40)

Status is **never colour alone**. Every badge pairs a tone with a text label
and, for categories, an icon. The `Tone → label + tone` mapping lives in
[`src/tenant/lib/meta.ts`](../../src/tenant/lib/meta.ts) so a lifecycle state
reads identically on the dashboard and in the detail workspace.

## Typography

Inter for text, JetBrains Mono for data. Tabular numerals (`.tnum`) wherever a
figure can change under the reader's eye. Large values are easy to scan; units
stay visually secondary but clearly attached (`MetricValue`).

## Spacing & layout

A consistent scale (4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64). The tenant
module uses softer radii and more generous spacing than the PMS command centre —
information-rich but calm.

## Component library (§43)

- **Primitives** (`components/ui/`) — Button, Badge, StatusBadge, IconBox, Kbd,
  Skeleton, ProgressBar, Avatar/TenantMark, Separator; Card family; Input /
  Textarea / Search / Select / Switch / Checkbox / Field / SettingRow; Tabs /
  TabBar / Segmented / FilterChips; Dialog / Drawer / Tooltip / Popover / Menu;
  DataTable + EmptyState / ErrorState / LoadingState / AsyncBoundary / DefList;
  Toaster; Page / StatGrid / Toolbar.
- **Common** (`components/common.tsx`) — StatCard, MetricValue, Delta,
  AnimatedNumber, Timeline, Stepper, RatingStars, PageHeader, Breadcrumb,
  KeyValue.
- **Charts** (`components/charts.tsx`) — TrendChart, MultiLineChart,
  BarSeriesChart, DonutChart, Sparkline, all theme-aware with a table fallback.

## Charts

One measure per axis; a recessive grid; a legend whenever two or more series
are on screen; a table view for the cases where colour alone would carry
meaning. Stocks (a load held at a moment) and flows (consumption per period) are
drawn as separate charts rather than sharing a y-scale.

## Motion

Subtle and purposeful — page/drawer transitions, toast slide-ins, status
pulses, chart fades. `prefers-reduced-motion` collapses all of it.

## Accessibility (§50)

Keyboard navigation and visible focus rings; status paired with label/icon;
charts ship readable supporting values (table toggle); forms have clear
validation and error messages; the light palette flags the three low-contrast
viz slots so light-mode charts always ship a legend.
