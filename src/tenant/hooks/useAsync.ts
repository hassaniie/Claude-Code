/**
 * `useAsync` — the single place loading / error / retry semantics are defined.
 *
 * Screens never hand-roll a `useEffect` + `setState` fetch; they call this and
 * branch on `status`, so every surface shows the same skeleton, the same error
 * card and the same retry affordance.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AsyncResult } from '../data/types';

export interface UseAsyncOptions {
  deps?: unknown[];
  refreshMs?: number;
  retries?: number;
  enabled?: boolean;
}

export interface UseAsyncState<T> extends AsyncResult<T> {
  refetch: () => void;
  isRefreshing: boolean;
  attempt: number;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  { deps = [], refreshMs, retries = 1, enabled = true }: UseAsyncOptions = {},
): UseAsyncState<T> {
  const [state, setState] = useState<AsyncResult<T>>({ status: enabled ? 'loading' : 'idle' });
  const [isRefreshing, setRefreshing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mounted = useRef(true);
  const hasData = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(
    async (isBackground: boolean) => {
      if (isBackground) setRefreshing(true);
      else if (!hasData.current) setState({ status: 'loading' });

      let tries = 0;
      while (tries <= retries) {
        try {
          const data = await fnRef.current();
          if (!mounted.current) return;
          hasData.current = true;
          setState({ status: 'success', data, fetchedAt: Date.now() });
          setAttempt(0);
          setRefreshing(false);
          return;
        } catch (err) {
          tries++;
          if (!mounted.current) return;
          setAttempt(tries);
          if (tries > retries) {
            setState((prev) => ({
              status: 'error',
              data: prev.data,
              error: err instanceof Error ? err.message : 'Unknown transport error',
              fetchedAt: prev.fetchedAt,
            }));
            setRefreshing(false);
            return;
          }
          await new Promise((r) => setTimeout(r, 400 * 2 ** (tries - 1)));
        }
      }
    },
    [retries],
  );

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle' });
      return;
    }
    void run(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, nonce, ...deps]);

  useEffect(() => {
    if (!enabled || !refreshMs) return;
    const t = setInterval(() => void run(true), refreshMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, refreshMs, ...deps]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, refetch, isRefreshing, attempt };
}

/** Debounce a fast-changing value — search inputs, slider filters. */
export function useDebounced<T>(value: T, delay = 260) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Ticking clock for relative timestamps that must stay honest. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
