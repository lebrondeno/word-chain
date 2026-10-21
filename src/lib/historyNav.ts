/**
 * Browser-history layer manager.
 *
 * Every "deeper" screen (room, game, modal, sub-screen) registers a layer.
 * Opening a layer pushes one history entry, so the hardware / gesture Back
 * button pops that entry and closes the layer instead of exiting the PWA.
 *
 * history.state is tagged with `{ phLayer: <depth> }`. On popstate every layer
 * deeper than the restored depth is closed (topmost first).
 */

export interface HistoryLayer {
  id: string;
  /** Called when Back closes this layer. Return `false` to veto (layer is re-opened). */
  onClose: () => void | boolean;
}

export const HISTORY_STATE_KEY = 'phLayer';

const stack: HistoryLayer[] = [];
let suppressedPops = 0;
let listening = false;

const hasHistory = () =>
  typeof window !== 'undefined' && !!window.history && typeof window.history.pushState === 'function';

const stateDepth = (): number => {
  const state = (hasHistory() ? window.history.state : null) as Record<string, unknown> | null;
  const depth = state && typeof state[HISTORY_STATE_KEY] === 'number' ? (state[HISTORY_STATE_KEY] as number) : 0;
  return depth;
};

const pushMarker = () => {
  window.history.pushState({ [HISTORY_STATE_KEY]: stack.length }, '', window.location.href);
};

/** Handles a `popstate`: closes every layer above the restored history depth. */
export const handlePopState = (): void => {
  if (suppressedPops > 0) {
    suppressedPops -= 1;
    return;
  }
  const depth = stateDepth();
  while (stack.length > depth) {
    const layer = stack.pop() as HistoryLayer;
    const result = layer.onClose();
    if (result === false) {
      stack.push(layer);
      pushMarker();
      return;
    }
  }
};

const ensureListener = () => {
  if (listening || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  window.addEventListener('popstate', handlePopState);
  listening = true;
};

/** Registers a layer and pushes a history entry for it (no-op if already open). */
export const openLayer = (id: string, onClose: HistoryLayer['onClose']): void => {
  if (!hasHistory()) return;
  ensureListener();
  const existing = stack.find((l) => l.id === id);
  if (existing) {
    existing.onClose = onClose;
    return;
  }
  stack.push({ id, onClose });
  pushMarker();
};

/**
 * Closes a layer from code (e.g. an in-app Close button). Rewinds history by
 * the number of entries that layer (and any layers above it) occupy, without
 * triggering their onClose callbacks.
 */
export const closeLayer = (id: string): void => {
  if (!hasHistory()) return;
  const idx = stack.findIndex((l) => l.id === id);
  if (idx < 0) return;
  const count = stack.length - idx;
  stack.splice(idx);
  suppressedPops += 1;
  window.history.go(-count);
};

export const getOpenLayerIds = (): string[] => stack.map((l) => l.id);

/** Test helper: forget every layer and listener flag. */
export const resetHistoryLayers = (): void => {
  stack.length = 0;
  suppressedPops = 0;
  listening = false;
};
