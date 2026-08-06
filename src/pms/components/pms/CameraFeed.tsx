/**
 * Synthetic camera feed.
 *
 * A real deployment swaps this for an HLS/WebRTC `<video>` element — the props
 * (`seed`, `state`, `plate`, `timestamp`) are already the ones a stream tile
 * needs. Until then it renders a deterministic scene from the seed so a wall of
 * twenty tiles reads as twenty different bays rather than twenty grey boxes,
 * and so offline / loading / snapshot states are visible in development.
 */

import { AlertTriangle, Loader2, Maximize2, VideoOff } from 'lucide-react';
import { memo, useMemo } from 'react';
import { cn, fmtTimeSec } from '../../lib/utils';
import { PlateTag } from './atoms';

export type FeedState = 'live' | 'offline' | 'loading' | 'snapshot' | 'degraded';

const CAR_COLOURS = ['#8b93a1', '#c9ccd2', '#2c3440', '#5b6577', '#7d3a3a', '#2f4d6b', '#a8874f'];

function hash(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** A parked car, seen from the ceiling-mounted camera's angle. */
function Car({ x, y, w, h, colour, dark }: { x: number; y: number; w: number; h: number; colour: string; dark: boolean }) {
  return (
    <g opacity={dark ? 0.85 : 1}>
      <ellipse cx={x + w / 2} cy={y + h + 1} rx={w / 2} ry={2.5} fill="#000" opacity={0.35} />
      <rect x={x} y={y} width={w} height={h} rx={3} fill={colour} />
      <rect x={x + w * 0.13} y={y + h * 0.12} width={w * 0.74} height={h * 0.3} rx={2} fill="#0b0f16" opacity={0.55} />
      <rect x={x + w * 0.16} y={y + h * 0.62} width={w * 0.68} height={h * 0.22} rx={2} fill="#0b0f16" opacity={0.4} />
      <rect x={x + w * 0.3} y={y + h - 2.5} width={w * 0.4} height={2} rx={1} fill="#e8e2c8" opacity={0.7} />
    </g>
  );
}

export const CameraFeed = memo(function CameraFeed({
  seed,
  state = 'live',
  label,
  timestamp,
  plate,
  className,
  aspect = '16 / 9',
  showOverlay = true,
  lane,
  onExpand,
}: {
  seed: number;
  state?: FeedState;
  label?: string;
  timestamp?: number;
  plate?: string;
  className?: string;
  aspect?: string;
  showOverlay?: boolean;
  /** Lane cameras frame a single approaching vehicle instead of a bay row. */
  lane?: boolean;
  onExpand?: () => void;
}) {
  const scene = useMemo(() => {
    const cars = lane ? 1 : 2 + Math.floor(hash(seed, 1) * 2);
    return Array.from({ length: cars }).map((_, i) => ({
      colour: CAR_COLOURS[Math.floor(hash(seed, i + 2) * CAR_COLOURS.length)],
      offset: hash(seed, i + 9),
    }));
  }, [seed, lane]);

  const offline = state === 'offline';

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg bg-[#070a0e] ring-1 ring-inset ring-white/[0.06]',
        className,
      )}
      style={{ aspectRatio: aspect }}
    >
      {offline ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {/* static noise */}
          <svg className="absolute inset-0 h-full w-full opacity-[0.055]" aria-hidden>
            <filter id={`noise-${seed}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#noise-${seed})`} />
          </svg>
          <VideoOff className="h-5 w-5 text-danger/70" />
          <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-danger/80">No signal</p>
        </div>
      ) : state === 'loading' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-subtle" />
        </div>
      ) : (
        <svg viewBox="0 0 160 90" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
          <defs>
            <linearGradient id={`floor-${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1a1f28" />
              <stop offset="55%" stopColor="#12161d" />
              <stop offset="100%" stopColor="#0a0d12" />
            </linearGradient>
            <radialGradient id={`vig-${seed}`} cx="50%" cy="45%" r="72%">
              <stop offset="55%" stopColor="transparent" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
            </radialGradient>
            <linearGradient id={`lamp-${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fdf3d0" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#fdf3d0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* ceiling + wall */}
          <rect width="160" height="26" fill="#0d1118" />
          <rect y="26" width="160" height="64" fill={`url(#floor-${seed})`} />
          <rect x="18" y="4" width="34" height="2.5" rx="1.2" fill="#e9edd6" opacity="0.55" />
          <rect x="108" y="4" width="34" height="2.5" rx="1.2" fill="#e9edd6" opacity="0.4" />
          <polygon points="18,7 52,7 62,40 8,40" fill={`url(#lamp-${seed})`} />
          <polygon points="108,7 142,7 152,40 98,40" fill={`url(#lamp-${seed})`} />

          {/* structural pillar */}
          <rect x={lane ? 2 : 74} y="14" width="10" height="62" fill="#161b23" />
          <rect x={lane ? 2 : 74} y="52" width="10" height="5" fill="#c9a227" opacity="0.5" />

          {lane ? (
            <>
              {/* approach lane: floor markings + a single vehicle at the loop */}
              <polygon points="40,90 120,90 96,40 64,40" fill="#0e131a" />
              {[0, 1, 2, 3].map((i) => (
                <rect
                  key={i}
                  x={78 - i * 1.4}
                  y={44 + i * 11}
                  width={4 + i * 1.6}
                  height={5}
                  rx={1}
                  fill="#e8e2c8"
                  opacity={0.18 + i * 0.05}
                />
              ))}
              <Car x={58} y={50} w={44} h={30} colour={scene[0].colour} dark />
              {/* barrier arm */}
              <rect x="20" y="46" width="120" height="2.6" rx="1.3" fill="#e04b4b" opacity="0.9" />
              <rect x="20" y="46" width="120" height="2.6" rx="1.3" fill="url(#stripe)" opacity="0.3" />
            </>
          ) : (
            <>
              {/* bay markings */}
              {[0, 1, 2, 3].map((i) => (
                <rect key={i} x={8 + i * 38} y="34" width="1.4" height="52" fill="#e8e2c8" opacity="0.22" />
              ))}
              <rect x="8" y="86" width="144" height="1.4" fill="#e8e2c8" opacity="0.18" />
              {scene.map((car, i) => (
                <Car
                  key={i}
                  x={12 + i * 38 + car.offset * 5}
                  y={40 + car.offset * 4}
                  w={30}
                  h={42}
                  colour={car.colour}
                  dark={false}
                />
              ))}
            </>
          )}

          <rect width="160" height="90" fill={`url(#vig-${seed})`} />

          {/* scan sweep — the only motion, and only while live */}
          {state === 'live' && (
            <rect width="160" height="90" fill="url(#scan)" opacity="0.5">
              <animate attributeName="y" values="-90;90" dur="7s" repeatCount="indefinite" />
            </rect>
          )}
        </svg>
      )}

      {/* Shared gradient defs used by the animated sweep */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <linearGradient id="scan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.035" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <pattern id="stripe" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
            <rect width="3" height="6" fill="#fff" />
          </pattern>
        </defs>
      </svg>

      {showOverlay && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/65 to-transparent px-2 py-1.5">
            {label && <span className="truncate text-[9.5px] font-medium tracking-wide text-white/85">{label}</span>}
            {state === 'live' && (
              <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-red-400">
                <span className="h-1.5 w-1.5 animate-[pulse-ring_2s_ease-in-out_infinite] rounded-full bg-red-500" />
                Rec
              </span>
            )}
            {state === 'degraded' && (
              <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-amber-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                Low FPS
              </span>
            )}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
            <span className="tnum text-[9.5px] font-medium text-white/75">
              {fmtTimeSec(timestamp ?? Date.now())}
            </span>
            {plate && <PlateTag plate={plate} size="xs" className="border-white/25 bg-black/55 text-white" />}
          </div>
        </>
      )}

      {onExpand && !offline && (
        <button
          onClick={onExpand}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-black/55 p-1.5 text-white/80 opacity-0 backdrop-blur transition-opacity hover:text-white group-hover:opacity-100"
          aria-label="Expand feed"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
});
