import { savingSummary } from '../../data/dashboard';
import { arcPath } from './geometry';

/**
 * Figma: Frame 2117130888 (3159:8498) — a fixed 160x106 block.
 *
 * Geometry is derived from the node's own numbers: the white notch
 * (3159:8506) sits at left 137.28 / top 42.57 within the 160x160 circle,
 * which puts its centre 74px from the circle centre at -26.4deg. That fixes
 * the mid-stroke radius at 74 and the end of the coloured sweep at 333.6deg
 * — i.e. the notch marks where the colour stops and the grey track resumes.
 */
const W = 160;
const H = 112;
const CX = 80;
const CY = 80;
const R = 74;
const STROKE = 13;

const START = 180;
const END = 360;
/** notch angle, measured from the node position above */
const NOTCH = 333.6;

export function SavingGauge() {
  const notchRad = (NOTCH * Math.PI) / 180;
  const nx = CX + R * Math.cos(notchRad);
  const ny = CY + R * Math.sin(notchRad);

  return (
    <svg
      className="gauge"
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      role="img"
      aria-label={`Total savings ${savingSummary.percent}`}
    >
      <defs>
        <linearGradient id="gaugeFill" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#f0c33c" />
          <stop offset="30%" stopColor="#a8cc3c" />
          <stop offset="100%" stopColor="var(--status-success-default)" />
        </linearGradient>
      </defs>

      <path
        d={arcPath(CX, CY, R, START, END)}
        fill="none"
        stroke="var(--background-secondary)"
        strokeWidth={STROKE}
      />
      <path
        d={arcPath(CX, CY, R, START, NOTCH)}
        fill="none"
        stroke="url(#gaugeFill)"
        strokeWidth={STROKE}
      />

      {/* white notch — Figma 3159:8506, 17.377x4.6 at radius 4.344, rotated -15deg */}
      <g transform={`translate(${nx}, ${ny}) rotate(-15)`}>
        <rect x="-8.69" y="-2.3" width="17.377" height="4.6" rx="2.3" fill="var(--background-primary)" />
      </g>

      {/* centre stack: 20px Bold + 3px gap + 11px Regular, centred at (80.5, 86.5) */}
      <text className="gauge__value" x="80.5" y="86" textAnchor="middle">
        {savingSummary.percent}
      </text>
      <text className="gauge__caption" x="80.5" y="103" textAnchor="middle">
        {savingSummary.caption}
      </text>

      {/* scale ends — 8.689px #999, bottom-aligned at y 108.92 */}
      <text className="gauge__scale-end" x="5.63" y="108.92" textAnchor="middle">
        0%
      </text>
      <text className="gauge__scale-end" x="153.49" y="108.92" textAnchor="middle">
        100%
      </text>
    </svg>
  );
}
