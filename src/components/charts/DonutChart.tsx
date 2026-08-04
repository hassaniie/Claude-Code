import { energyBreakdown } from '../../data/dashboard';

const SIZE = 140;
const R = 52;
const STROKE = 26;
/** degrees of blank space between slices, matching the design's separation */
const GAP = 2;

/** Figma: Frame 2117130895 (3159:8535) inside "Energy Breakdown". */
export function DonutChart() {
  const circumference = 2 * Math.PI * R;
  const total = energyBreakdown.slices.reduce((sum, s) => sum + s.value, 0);

  let offsetDeg = -90; // start at 12 o'clock

  return (
    <svg
      className="breakdown__donut"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width={SIZE}
      height={SIZE}
      role="img"
      aria-label="Energy breakdown by category"
    >
      <g transform={`translate(${SIZE / 2}, ${SIZE / 2})`}>
        {energyBreakdown.slices.map((slice) => {
          const sweep = (slice.value / total) * 360;
          const visible = Math.max(sweep - GAP, 0.5);
          const dash = (visible / 360) * circumference;
          const rotation = offsetDeg + GAP / 2;
          offsetDeg += sweep;

          return (
            <circle
              key={slice.label}
              r={R}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dash} ${circumference - dash}`}
              transform={`rotate(${rotation})`}
            />
          );
        })}
      </g>

      <text className="donut__total" x={SIZE / 2} y={SIZE / 2 + 2} textAnchor="middle">
        {energyBreakdown.total}
      </text>
      <text className="donut__unit" x={SIZE / 2} y={SIZE / 2 + 18} textAnchor="middle">
        {energyBreakdown.unit}
      </text>
    </svg>
  );
}
