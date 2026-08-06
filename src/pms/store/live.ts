/**
 * Live plaza state.
 *
 * `useSyncExternalStore` binds React to the simulation's push stream. Selectors
 * are memo-compared so a screen only re-renders when the slice it reads
 * actually moves — with ~960 bays on the map that difference is the whole
 * performance budget.
 */

import { useCallback, useDebugValue, useRef, useSyncExternalStore } from 'react';
import { computeKpis, floorStats, simulation, type World } from '../data/world';
import type { FloorId, FloorStats, PlazaKpis } from '../data/types';

export function useWorld(): World {
  return useSyncExternalStore(simulation.subscribe, simulation.getState, simulation.getState);
}

/**
 * Subscribe to a derived slice. `isEqual` defaults to `Object.is`; pass a
 * shallow comparator for object slices so ticks that don't touch the slice
 * don't re-render the consumer.
 */
export function useWorldSelector<T>(
  selector: (world: World) => T,
  isEqual: (a: T, b: T) => boolean = Object.is,
): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;
  const cache = useRef<{ value: T; version: number } | null>(null);

  const getSnapshot = useCallback(() => {
    const world = simulation.getState();
    const cached = cache.current;
    if (cached && cached.version === world.version) return cached.value;
    const next = selectorRef.current(world);
    if (cached && isEqual(cached.value, next)) {
      cache.current = { value: cached.value, version: world.version };
      return cached.value;
    }
    cache.current = { value: next, version: world.version };
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useSyncExternalStore(simulation.subscribe, getSnapshot, getSnapshot);
  useDebugValue(value);
  return value;
}

export function shallowEqual<T extends object>(a: T, b: T) {
  if (Object.is(a, b)) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a) as Array<keyof T>;
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => Object.is(a[k], b[k]));
}

export function arrayEqual<T>(a: readonly T[], b: readonly T[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!Object.is(a[i], b[i])) return false;
  return true;
}

/* ------------------------------------------------------------ common slices */

export const useKpis = (): PlazaKpis => useWorldSelector(computeKpis, shallowEqual);

export const useFloorStats = (): FloorStats[] =>
  useWorldSelector(floorStats, (a, b) =>
    a.length === b.length &&
    a.every((f, i) => f.carOccupied === b[i].carOccupied && f.motorcycleOccupied === b[i].motorcycleOccupied && f.trend === b[i].trend),
  );

export const useAlerts = () => useWorldSelector((w) => w.alerts, arrayEqual);

export const useActiveAlerts = () =>
  useWorldSelector((w) => w.alerts.filter((a) => !a.resolved), arrayEqual);

export const useEvents = (limit = 40) =>
  useWorldSelector((w) => w.events.slice(0, limit), arrayEqual);

export const useBarriers = () => useWorldSelector((w) => w.barriers, arrayEqual);

export const useLanes = () => useWorldSelector((w) => w.lanes, arrayEqual);

export const useHealth = () => useWorldSelector((w) => w.health, shallowEqual);

export const useRevenue = () => useWorldSelector((w) => w.revenue, shallowEqual);

export const useCameras = (floorId?: FloorId | 'all') =>
  useWorldSelector(
    (w) =>
      w.cameraIds
        .map((id) => w.cameras[id])
        .filter((c) => !floorId || floorId === 'all' || c.floorId === floorId),
    arrayEqual,
  );

export const useCamera = (id: string | undefined) =>
  useWorldSelector((w) => (id ? w.cameras[id] : undefined));

export const useSpace = (id: string | undefined) =>
  useWorldSelector((w) => (id ? w.spaces[id] : undefined));

export const useFloorSpaces = (floorId: FloorId) =>
  useWorldSelector((w) => w.spaceIdsByFloor[floorId].map((id) => w.spaces[id]), arrayEqual);

export const useVehicle = (plate: string | undefined) =>
  useWorldSelector((w) => (plate ? w.vehicles[plate] : undefined));

export { simulation };
