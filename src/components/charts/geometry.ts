/** Shared helpers for the hand-rolled SVG charts. */

export interface Plot {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Maps a value in [min,max] onto the plot's vertical axis (inverted). */
export function scaleY(value: number, min: number, max: number, plot: Plot) {
  const t = (value - min) / (max - min);
  return plot.y1 - t * (plot.y1 - plot.y0);
}

/** Maps index i of n points onto the plot's horizontal axis. */
export function scaleX(i: number, n: number, plot: Plot) {
  if (n <= 1) return plot.x0;
  return plot.x0 + (i / (n - 1)) * (plot.x1 - plot.x0);
}

/**
 * Catmull-Rom -> cubic Bezier, giving the smooth curves the design uses
 * without the overshoot a naive quadratic smoothing produces.
 */
export function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  if (points.length < 3) {
    return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  }

  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;

    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Closes a line path down to the baseline so it can be filled. */
export function areaPath(points: [number, number][], baseline: number): string {
  if (points.length === 0) return '';
  const line = smoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  return `${line} L${last[0]},${baseline} L${first[0]},${baseline} Z`;
}

/** SVG arc path along a circle, angles in degrees, 0° = 3 o'clock, clockwise. */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const toXY = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [sx, sy] = toXY(startDeg);
  const [ex, ey] = toXY(endDeg);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg > startDeg ? 1 : 0;
  return `M${sx},${sy} A${r},${r} 0 ${large} ${sweep} ${ex},${ey}`;
}
