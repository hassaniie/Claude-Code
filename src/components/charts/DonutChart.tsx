import { energyBreakdown } from '../../data/dashboard';

/**
 * Figma 3159:8537 — a 166px square. Outer radius 83, inner hole radius ~45,
 * giving a 38px ring at a 64px mid-stroke radius.
 */
const SIZE = 166;
const R = 64;
const STROKE = 38;
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

      {/* centre stack: 20/20 Bold + 5px gap + 12/14 Regular, centred at (83,83) */}
      <text className="donut__total" x="83" y="80" textAnchor="middle">
        {energyBreakdown.total}
      </text>
      <text className="donut__unit" x="83" y="99" textAnchor="middle">
        {energyBreakdown.unit}
      </text>
    </svg>
  );
}
