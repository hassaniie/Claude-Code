import { savingSummary } from '../../data/dashboard';
import { arcPath } from './geometry';

const W = 160;
const H = 92;
const CX = 80;
const CY = 82;
const R = 66;
const STROKE = 13;

/**
 * Figma: Frame 2117130888 (3159:8498) inside "Saving Summary".
 *
 * The design's coloured sweep covers roughly four fifths of the dial and is
 * a rating band (amber -> green), independent of the 16.5% figure printed in
 * the middle — so the sweep is its own constant rather than derived from
 * `percent`.
 */
const SWEEP = 0.78;

export function SavingGauge() {
  const start = 180;
  const end = 360;
  const valueEnd = start + (end - start) * SWEEP;

  return (
    <div className="gauge">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label={`Total savings ${savingSummary.percent}%`}
      >
        <defs>
          <linearGradient id="gaugeFill" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f0c33c" />
            <stop offset="35%" stopColor="#8dc63f" />
            <stop offset="100%" stopColor="var(--status-success-default)" />
          </linearGradient>
        </defs>

        <path
          d={arcPath(CX, CY, R, start, end)}
          fill="none"
          stroke="var(--background-secondary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={arcPath(CX, CY, R, start, valueEnd)}
          fill="none"
          stroke="url(#gaugeFill)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />

        <text className="gauge__value" x={CX} y={CY - 12} textAnchor="middle">
          {savingSummary.percent}%
        </text>
        <text className="gauge__caption" x={CX} y={CY + 3} textAnchor="middle">
          {savingSummary.caption}
        </text>
      </svg>

      <div className="gauge__scale">
        <span>0%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
