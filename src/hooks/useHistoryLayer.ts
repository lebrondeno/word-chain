import { useEffect, useId, useRef } from 'react';
import { openLayer, closeLayer } from '../lib/historyNav';

/**
 * While `active` is true a browser-history entry is held for this layer, so the
 * mobile Back button closes it (via `onClose`) instead of leaving the app.
 * `onClose` may return `false` to veto the back navigation.
 */
export function useHistoryLayer(active: boolean, onClose: () => void | boolean): void {
  const id = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;
    openLayer(id, () => onCloseRef.current());
    return () => closeLayer(id);
  }, [active, id]);
}
