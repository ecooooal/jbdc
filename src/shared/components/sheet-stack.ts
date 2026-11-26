import { useLayoutEffect, useSyncExternalStore } from "react";

/**
 * The sheets that are open right now, in the order they opened. The native
 * host keeps its own stacking order; this registry exists only so the wrapper
 * can give each open sheet a depth and tone it one step per sheet above the
 * first. It is presentation state, not a decision: closing a sheet removes it
 * and lets the sheets above move down.
 */
const openSheets: string[] = [];
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

function notify(): void {
  for (const listener of listeners) listener();
}

function register(id: string): void {
  if (openSheets.includes(id)) return;
  openSheets.push(id);
  notify();
}

function unregister(id: string): void {
  const index = openSheets.indexOf(id);
  if (index === -1) return;
  openSheets.splice(index, 1);
  notify();
}

/** How many sheets sit below this one; 0 is the base of the stack. */
function depthOf(id: string): number {
  return Math.max(0, openSheets.indexOf(id));
}

/**
 * Registers a sheet while it is open and reports its depth. A layout effect
 * registers before paint, so an opening sheet never flashes the base tone
 * before moving to its own; the store subscription re-renders the sheets below
 * when the stack changes under them.
 */
export function useSheetDepth(id: string, open: boolean): number {
  useLayoutEffect(() => {
    if (!open) return;
    register(id);

    return () => unregister(id);
  }, [id, open]);

  return useSyncExternalStore(
    subscribe,
    () => (open ? depthOf(id) : 0),
    () => 0,
  );
}
