import { areaPath, scaleX, scaleY, smoothPath, type Plot } from './geometry';

interface AreaTrendChartProps {
  series: number[];
  labels: string[];
  yTicks: number[];
  /** Line colour; the fill is the same hue faded to transparent. */
  color: string;
  /** Formats the y-axis tick labels (e.g. 5 -> "5M"). */
  formatTick?: (v: number) => string;
  gradientId: string;
  ariaLabel: string;
  height?: number;
}

/** cards in row 4 are 442 wide and the chart is full-bleed within them */
const W = 442;

/**
 * Shared single-series area chart, used by "Energy Intensity" (3159:8820)
 * and "Energy Saving Trend" (3159:8888).
 */
export function AreaTrendChart({
  series,
  labels,
  yTicks,
  color,
  formatTick = (v) => String(v),
  gradientId,
  ariaLabel,
  height = 140,
}: AreaTrendChartProps) {
  // right inset leaves room for the last x label to centre without clipping
  const plot: Plot = { x0: 32, x1: W - 26, y0: 10, y1: height - 26 };
  const yMax = Math.max(...yTicks);
  const points: [number, number][] = series.map((v, i) => [
    scaleX(i, series.length, plot),
    scaleY(v, 0, yMax, plot),
  ]);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((t) => {
        const y = scaleY(t, 0, yMax, plot);
        return (
          <g key={t}>
            <line className="chart__grid-line" x1={plot.x0} y1={y} x2={plot.x1} y2={y} />
            <text className="chart__tick" x={plot.x0 - 8} y={y + 3} textAnchor="end">
              {formatTick(t)}
            </text>
          </g>
        );
      })}

      <path d={areaPath(points, plot.y1)} fill={`url(#${gradientId})`} />
      <path d={smoothPath(points)} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />

      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill={color} />
      ))}

      <line className="chart__axis-line" x1={plot.x0} y1={plot.y1} x2={plot.x1} y2={plot.y1} />

      {labels.map((label, i) => (
        <text
          key={label}
          className="chart__tick"
          x={scaleX(i, labels.length, plot)}
          y={plot.y1 + 16}
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
