import { blockSpan } from './ArtistBlock.model';
import type { CategoryLaneModel } from './CategoryLane.model';
import { VIEW_OFFSET_X, VIEW_WIDTH } from './timelineLayout';

// ── The progressive mount's window ────────────────────────────────────────────
//
// A day is mounted in slices (see TimelineView): only the blocks inside a
// canvas window are rendered, and the window grows once per frame. This module
// is the one source of which blocks that window holds — TimelineView asks it
// which lanes are in, CategoryLane which of a lane's blocks are — and of when
// the mount is done: when every block is in, not when the window covers the
// whole canvas. A step that would bring no block in is never taken on its own,
// so every frame of a mount brings at least one set in.

/** The canvas span currently mounted, plus the day it was anchored for. */
export type MountWindow = { day: number; fromX: number; toX: number; fromY: number; toY: number };

/** A block's span on the canvas, and its lane's top and bottom in the lane stack. */
export type MountBlock = { left: number; right: number; top: number; bottom: number };

const VIEW_END_X = VIEW_OFFSET_X + VIEW_WIDTH;

/**
 * Anything outside the scrollable view is permanently clipped, so the X span
 * is held within it — those blocks are then never mounted at all.
 */
export function clampToViewWindow(x: number): number {
  return Math.min(VIEW_END_X, Math.max(VIEW_OFFSET_X, x));
}

/** Whether a block's span is inside [fromX, toX]; touching an edge counts. */
export function spanInMountWindow({ left, width }: { left: number; width: number }, fromX: number, toX: number): boolean {
  return left + width >= fromX && left <= toX;
}

/** Whether a lane is inside the window's vertical span; touching an edge counts. */
export function laneInMountWindow(top: number, bottom: number, window: MountWindow): boolean {
  return bottom >= window.fromY && top <= window.toY;
}

function blockInMountWindow(block: MountBlock, window: MountWindow): boolean {
  return laneInMountWindow(block.top, block.bottom, window)
    && spanInMountWindow({ left: block.left, width: block.right - block.left }, window.fromX, window.toX);
}

/**
 * Every block of the day's lanes that a window can hold. A set the view clips
 * entirely is left out: no window ever reaches it.
 */
export function mountBlocks(lanes: CategoryLaneModel[], tops: Record<string, number>, dayStart: number): MountBlock[] {
  const blocks: MountBlock[] = [];
  for (const lane of lanes) {
    const top = tops[lane.key];
    const bottom = top + lane.stripHeight + lane.height;
    for (const { event } of lane.sets) {
      const span = blockSpan(event, dayStart);
      if (spanInMountWindow(span, VIEW_OFFSET_X, VIEW_END_X)) {
        blocks.push({ left: span.left, right: span.left + span.width, top, bottom });
      }
    }
  }
  return blocks;
}

/** Whether every block is mounted. True on a day with none. */
export function isMountComplete(window: MountWindow, blocks: MountBlock[]): boolean {
  return blocks.every((block) => blockInMountWindow(block, window));
}

function mountedCount(window: MountWindow, blocks: MountBlock[]): number {
  return blocks.filter((block) => blockInMountWindow(block, window)).length;
}

/**
 * The window one frame later: grown by a step in every direction, as many
 * times as it takes to bring at least one more block in. A complete window is
 * returned as it is.
 *
 * Ends because every block counted is one the view can show: X stops at the
 * view's edges, Y grows without bound, so enough steps take in every block.
 */
export function growMountWindow(window: MountWindow, blocks: MountBlock[], stepX: number, stepY: number): MountWindow {
  if (isMountComplete(window, blocks)) {
    return window;
  }
  const before = mountedCount(window, blocks);
  let next = window;
  do {
    next = {
      day: next.day,
      fromX: clampToViewWindow(next.fromX - stepX),
      toX: clampToViewWindow(next.toX + stepX),
      fromY: next.fromY - stepY,
      toY: next.toY + stepY,
    };
  } while (mountedCount(next, blocks) === before);
  return next;
}
