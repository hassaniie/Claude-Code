# EnerSenX — Energy Monitoring System Dashboard

A React implementation of the EMS dashboard from the **General BMS Design** Figma
file (node [`3159:8131`](https://www.figma.com/design/m6YnaS2xdCXW28jjXSstMk/General-BMS-Design?node-id=3159-8131)).

## Running

```bash
npm install
npm run dev      # http://localhost:5173/ems.html
npm run build    # typecheck + production bundle
```

The EMS has its own HTML entry (`ems.html` → `src/ems-main.tsx`) because its
Figma-transcribed token set and global `body` styles are deliberately unscoped.
Mounting it in the same document as the PMS would have the two design systems
fight over `--border-strong` and the page background.

## Stack

| Concern  | Choice                                                          |
| -------- | --------------------------------------------------------------- |
| Framework| React 18 + TypeScript + Vite                                      |
| Styling  | Plain CSS with custom properties — no CSS framework               |
| Charts   | Hand-rolled SVG (`src/components/charts/`) — no charting library  |
| Icons    | `lucide-react` (see *Known deviations* below)                     |

Charts are hand-rolled because the design has very specific treatments — the
peak-curve threshold line, the pinned tooltip, the amber-to-green gauge sweep —
that are quicker to render exactly in SVG than to coerce out of a chart
library's defaults.

## Layout

The design canvas is 1728x1117: a 52px top bar, then a 236px sidebar beside a
1492px main column. Content rows use proportional `flex-grow` values equal to
their Figma frame widths, so the layout is pixel-exact at 1728px and scales
sensibly below it.

| Row | Figma node | Cards |
| --- | ---------- | ----- |
| Stats | `3159:8233` | Total Power, Daily Energy, Daily Cost, Current Demand, Power factor, Savings |
| Charts | `3159:8300` | Real-Time Load Curve, Energy Cost Comparison, Saving Summary |
| Data | `3159:8529` | Energy Breakdown, Top Energy Consuming Equipment, Utility Overview |
| Wide | `3159:8695` | Power Quality, Energy Intensity, Energy Saving Trend |

## Design tokens

`src/styles/tokens.css` is a 1:1 transcription of the Figma variables
(`text/primary` → `--text-primary`, `status/success/default` →
`--status-success-default`, and so on). Values came straight from the Figma MCP
server's `get_variable_defs`; re-pull from the file rather than hand-editing.

## Content

All copy and figures live in `src/data/dashboard.ts`, transcribed from the
design. Components are presentational, so wiring this to a real API means
replacing that one module.

## Fidelity

Every card has been reconciled against its own Figma node rather than against
the full-page screenshot. Per-card values that differ from the generic card
pattern — 14px / 19px / 22px stack gaps, the full-bleed row-4 cards, the
Power Quality zebra striping, the hand-set equipment bar widths — are
transcribed from the node data and annotated in code with the node ID.

Row heights are applied as `min-height` rather than `height`. Browser text
metrics land a few pixels off Figma's, and a hard height silently truncates
the last row of the denser cards; `min-height` holds the design at rest and
lets a card grow instead of clipping.

## Known deviations from the design

Two things could not be reproduced exactly, both documented in code:

1. **Icons are substitutes.** The design draws from the **Solar** icon set. The
   Figma MCP server returns those glyphs as `figma.com/api/mcp/asset/…` URLs,
   and the build environment's egress policy blocks `www.figma.com`, so the real
   assets could not be downloaded. Every icon is the nearest `lucide-react`
   match, picked by eye against the design. `src/components/Icon.tsx` records the
   original Solar name beside each one, so swapping in the true assets is a
   single-file change.

2. **The Energy Intensity area colour is approximate** (`#8286e0`). That fill is
   a raw hex in the design rather than a bound variable, so it was not part of
   the token payload and was matched visually from the rendered frame. Every
   other colour on the page is a real token.

One further note: the Saving Summary gauge's coloured sweep is a fixed ~78% in
the design and does not correspond to the 16.5% figure printed inside it, so
it is a separate constant (`SWEEP` in `SavingGauge.tsx`) rather than being
derived from the percentage.
