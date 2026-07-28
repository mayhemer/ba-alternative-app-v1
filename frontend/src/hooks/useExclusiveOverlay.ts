import { useCallback, useEffect, useRef } from 'react';
import { onOpening, register } from '../utils/overlayHub';

/**
 * React binding for the screen-exclusivity hub (utils/overlayHub).
 *
 * Joins the hub for the component's lifetime and returns the "I am opening"
 * signal to call when the overlay becomes visible:
 *
 *   const notifyOpening = useExclusiveOverlay(close);
 *   useEffect(() => { if (isOpen) { notifyOpening(); } }, [isOpen, notifyOpening]);
 *
 * The hub identity is minted here rather than passed in, so a component cannot
 * accidentally announce itself as another one and close itself.
 */
export function useExclusiveOverlay(close: () => void): () => void {
  // An empty object is a stable, collision-free identity for this component.
  const idRef = useRef({});

  // Held in a ref so a changing `close` never re-registers, and the hub always
  // invokes the current one rather than a stale closure.
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(
    () => register(idRef.current, { close: () => { closeRef.current(); } }),
    [],
  );

  return useCallback((): void => { onOpening(idRef.current); }, []);
}
