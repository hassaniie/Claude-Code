import { loadCurve } from '../../data/dashboard';
import { areaPath, scaleX, scaleY, smoothPath, type Plot } from './geometry';

const W = 546;
const H = 196;
const PLOT: Plot = { x0: 34, x1: 540, y0: 12, y1: 168 };
const Y_MAX = 2500;

/**
 * Figma: BarLineChart (3159:8307) inside "Real-Time Load Curve".
 * Colours are the file's own variables — border/brand #266df0 (today),
 * status/danger/border #f76161 (yesterday + peak line),
 * status/neutral/subtle #e5e5e5 (grid), border/strong #d3d5d9 (axis).
 */
export function LoadCurveChart() {
  const n = loadCurve.today.length;

  const pts = (series: number[]): [number, number][] =>
    series.map((v, i) => [scaleX(i, n, PLOT), scaleY(v, 0, Y_MAX, PLOT)]);

  const todayPts = pts(loadCurve.today);
  const yestPts = pts(loadCurve.yesterday);

  const peakY = scaleY(loadCurve.peak, 0, Y_MAX, PLOT);
  const markerX = scaleX(loadCurve.marker.hour, n, PLOT);
  const markerY = scaleY(loadCurve.today[loadCurve.marker.hour], 0, Y_MAX, PLOT);

  // dot every other hour, matching the design's cadence
  const dotted = (points: [number, number][]) => points.filter((_, i) => i % 2 === 0);

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Real-time load curve">
      <defs>
        <linearGradient id="loadToday" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7fd3e8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7fd3e8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="loadYesterday" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f76161" stopOpacity="0.3" />
          <stop offset="70%" stopColor="#f76161" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal grid + y ticks */}
      {loadCurve.yTicks.map((t) => {
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

      {/* areas: today first so yesterday's fill sits above it */}
      <path d={areaPath(todayPts, PLOT.y1)} fill="url(#loadToday)" />
      <path d={areaPath(yestPts, PLOT.y1)} fill="url(#loadYesterday)" />

      {/* peak curve threshold */}
      <line
        x1={PLOT.x0}
        y1={peakY}
        x2={PLOT.x1}
        y2={peakY}
        stroke="var(--status-danger-border)"
        strokeWidth="1"
        strokeDasharray="4 3"
      />
      <text className="chart__peak-label" x={PLOT.x0 + 4} y={peakY - 5}>
        {loadCurve.peakLabel}
      </text>

      {/* series lines */}
      <path
        d={smoothPath(yestPts)}
        fill="none"
        stroke="var(--status-danger-border)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d={smoothPath(todayPts)}
        fill="none"
        stroke="#2bb3d6"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {dotted(yestPts).map(([x, y], i) => (
        <circle key={`y${i}`} cx={x} cy={y} r="2.4" fill="var(--status-danger-border)" />
      ))}
      {dotted(todayPts).map(([x, y], i) => (
        <circle key={`t${i}`} cx={x} cy={y} r="2.4" fill="#2bb3d6" />
      ))}

      {/* hover marker */}
      <line
        x1={markerX}
        y1={PLOT.y0}
        x2={markerX}
        y2={PLOT.y1}
        stroke="var(--border-brand)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <circle cx={markerX} cy={markerY} r="3.5" fill="#2bb3d6" stroke="#fff" strokeWidth="1.5" />

      <g transform={`translate(${markerX - 36}, ${PLOT.y0 + 12})`}>
        <rect className="chart__tooltip-box" width="72" height="38" rx="8" />
        <text className="chart__tooltip-time" x="36" y="15">
          {loadCurve.marker.label}
        </text>
        <text className="chart__tooltip-value" x="36" y="30">
          {loadCurve.marker.value}
        </text>
      </g>

      {/* x axis */}
      <line
        className="chart__axis-line"
        x1={PLOT.x0}
        y1={PLOT.y1}
        x2={PLOT.x1}
        y2={PLOT.y1}
      />
      {loadCurve.xLabels.map((label, i) => (
        <text
          key={`${label}-${i}`}
          className="chart__tick"
          x={scaleX(i, loadCurve.xLabels.length, PLOT)}
          y={PLOT.y1 + 16}
          textAnchor="middle"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}
