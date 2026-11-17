import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { LaneOrderRow } from './LaneOrderRow';
import { dropIndex, listHeight, moveLane, slotTop, type LaneDrag } from './LaneOrderList.model';
import type { LaneOrderRowModel } from './LaneOrderRow.model';

// ── The order list: its rows, and a drag across them ──────────────────────────
//
// Holds the drag in progress: the row picked up and the place it would drop
// at (LaneOrderList.model). The rows between step aside as that place changes,
// which is the only time a move renders anything; the dragged row follows the
// finger by itself (LaneOrderRow). A drop, or a screen reader's move, hands
// the new order up at once.

type Props = {
  rows: LaneOrderRowModel[];
  /** The new order, top first: categoryIds. */
  onReorder: (order: string[]) => void;
  /** A drag started (true) or ended (false): the panel stops scrolling meanwhile. */
  onDragging: (dragging: boolean) => void;
};

export function LaneOrderList({ rows, onReorder, onDragging }: Props) {
  const [drag, setDrag] = useState<LaneDrag | null>(null);

  // Read by the row handlers, which must stay the same functions across renders
  // or every row would render again on each step of a drag.
  const latest = useRef({ rows, drag, onReorder, onDragging });
  latest.current = { rows, drag, onReorder, onDragging };

  const handleDragStart = useCallback((index: number): void => {
    const next = { from: index, target: index };
    latest.current.drag = next;
    setDrag(next);
    latest.current.onDragging(true);
  }, []);

  const handleDragMove = useCallback((dy: number): void => {
    const current = latest.current.drag;
    if (current === null) {
      return;
    }
    const target = dropIndex(current.from, dy, latest.current.rows.length);
    if (target !== current.target) {
      const next = { from: current.from, target };
      latest.current.drag = next;
      setDrag(next);
    }
  }, []);

  const handleDrop = useCallback((dy: number): void => {
    const current = latest.current.drag;
    if (current === null) {
      return;
    }
    const target = dropIndex(current.from, dy, latest.current.rows.length);
    latest.current.drag = null;
    setDrag(null);
    latest.current.onDragging(false);
    if (target !== current.from) {
      latest.current.onReorder(moveLane(latest.current.rows.map((r) => r.key), current.from, target));
    }
  }, []);

  const handleStep = useCallback((index: number, by: -1 | 1): void => {
    const target = index + by;
    if (target < 0 || target >= latest.current.rows.length) {
      return;
    }
    latest.current.onReorder(moveLane(latest.current.rows.map((r) => r.key), index, target));
  }, []);

  return (
    <View style={{ height: listHeight(rows.length) }}>
      {rows.map((row, index) => (
        <LaneOrderRow
          key={row.key}
          item={row}
          index={index}
          top={slotTop(index, drag)}
          lifted={drag?.from === index}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDrop={handleDrop}
          onStep={handleStep}
        />
      ))}
    </View>
  );
}
