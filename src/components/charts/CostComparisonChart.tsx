import { costComparison } from '../../data/dashboard';
import { scaleY, type Plot } from './geometry';

const W = 546;
const H = 196;
const PLOT: Plot = { x0: 34, x1: 540, y0: 12, y1: 168 };
const Y_MAX = 100;

const BAR_W = 16;
const BAR_GAP = 6;

/**
 * Figma: BarLineChart (3159:8416) inside "Energy Cost Comparison".
 * Baseline bars use brand/muted #d9e5fc, actual bars brand/primary #266df0.
 */
export function CostComparisonChart() {
  const groups = costComparison.months.length;
  const bandWidth = (PLOT.x1 - PLOT.x0) / groups;

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Energy cost comparison">
      {costComparison.yTicks.map((t) => {
        const y = scaleY(t, 0, Y_MAX, PLOT);
        return (
          <g key={t}>
            <line className="chart__grid-line" x1={PLOT.x0} y1={y} x2={PLOT.x1} y2={y} />
            <text className="chart__tick" x={PLOT.x0 - 8} y={y + 3} textAnchor="end">
              {t}
            </text>
          </g>
        );
      })}

      {costComparison.months.map((month, i) => {
        const centre = PLOT.x0 + bandWidth * (i + 0.5);
        const baselineY = scaleY(costComparison.baseline[i], 0, Y_MAX, PLOT);
        const actualY = scaleY(costComparison.actual[i], 0, Y_MAX, PLOT);
        const leftX = centre - BAR_W - BAR_GAP / 2;
        const rightX = centre + BAR_GAP / 2;

        return (
          <g key={month}>
            <rect
              x={leftX}
              y={baselineY}
              width={BAR_W}
              height={PLOT.y1 - baselineY}
              rx="3"
              fill="var(--brand-muted)"
            />
            <rect
              x={rightX}
              y={actualY}
              width={BAR_W}
              height={PLOT.y1 - actualY}
              rx="3"
              fill="var(--brand-primary)"
            />
            <text className="chart__tick" x={centre} y={PLOT.y1 + 16} textAnchor="middle">
              {month}
            </text>
          </g>
        );
      })}

      <line className="chart__axis-line" x1={PLOT.x0} y1={PLOT.y1} x2={PLOT.x1} y2={PLOT.y1} />
    </svg>
  );
}
