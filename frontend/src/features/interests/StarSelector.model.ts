import { INTEREST_CYCLE, type InterestStatus } from './InterestContext';
import { getFeedbackLabel, STAR_HIT_SLOP, STAR_ICON_SIZE } from './StarButton.model';

// ── The star selector: what it shows and where ────────────────────────────────
//
// Opened by a star press, beside the star and apart from it: a fully rounded
// capsule left of the star, leaving the star and its reach uncovered, holding
// the four states in tap order, each drawn as the star draws it and at the
// star's size, the current one ringed and the rest dimmed. The current state's
// name, with a tick, sits in a light box above the states, or below them where
// there is no room above (the top row). It dims nothing around it. All
// positions come from the star's measured frame, in window coordinates.

export type StarFrame = { x: number; y: number; width: number; height: number };
export type StarSize = keyof typeof STAR_ICON_SIZE;

/** Closes this long after the last tap on the star or in the selector. */
export const STAR_SELECTOR_TIMEOUT_MS = 2500;
/** The ring's move from one state to the next, starting at once. */
export const STAR_SELECTOR_RING_MS = 100;
/** Opacity of the states other than the current one. */
export const STAR_SELECTOR_DIMMED_STATE = 0.5;

/** Each state's tap target: the list's 44 pt minimum, a little more for the sheet's larger star. */
const SLOT_SIZE: Record<StarSize, number> = { small: 44, large: 48 };
const SLOT_GAP = 2;
/**
 * From the star's left edge to the nearest state's tap target. Wide on purpose:
 * the nearest state is "Don't go", which a slip off the star must not hit.
 */
const STAR_TO_STATES_GAP = 40;
/** Capsule beyond the states, on either side. */
const CAPSULE_PAD = 6;
/** Capsule height over a state's tap target. */
const CAPSULE_EXTRA_HEIGHT = 4;
/** Between the capsule and the info box. */
const INFO_GAP = 8;
/** The info box at its tallest: the state's name and a failure row. */
const INFO_MAX_HEIGHT = 44;

export type Rect = { left: number; top: number; width: number; height: number };

export type StarSelectorModel = {
  capsule: Rect & { radius: number };
  /** Left edges in the capsule; each slot is slotSize square, vertically centred. */
  slots: { status: InterestStatus; label: string; left: number; current: boolean }[];
  slotSize: number;
  glyphSize: number;
  /**
   * The info box, centred over the states' span. `y` is its bottom edge when
   * above the capsule, its top edge when below.
   */
  info: { side: 'above' | 'below'; y: number; left: number; width: number; label: string; failed: boolean };
};

type Inputs = {
  frame: StarFrame;
  size: StarSize;
  status: InterestStatus;
  failed: boolean;
  /** The highest the info box may reach: under the status bar and the top bar. */
  topLimit: number;
};

function slotsSpan(size: StarSize): number {
  return INTEREST_CYCLE.length * SLOT_SIZE[size] + (INTEREST_CYCLE.length - 1) * SLOT_GAP;
}

/** The capsule, in window coordinates: what a touch is tested against. */
export function starSelectorCapsule(frame: StarFrame, size: StarSize): Rect {
  const height = SLOT_SIZE[size] + CAPSULE_EXTRA_HEIGHT;
  const right = frame.x - STAR_TO_STATES_GAP + CAPSULE_PAD;
  const left = right - CAPSULE_PAD - slotsSpan(size) - CAPSULE_PAD;
  return { left, top: frame.y + frame.height / 2 - height / 2, width: right - left, height };
}

export function starSelectorModel({ frame, size, status, failed, topLimit }: Inputs): StarSelectorModel {
  const capsule = starSelectorCapsule(frame, size);
  const slotSize = SLOT_SIZE[size];
  const slots = INTEREST_CYCLE.map((step, i) => ({
    status: step,
    label: getFeedbackLabel(step),
    left: CAPSULE_PAD + i * (slotSize + SLOT_GAP),
    current: step === status,
  }));

  const roomAbove = capsule.top - INFO_GAP - INFO_MAX_HEIGHT >= topLimit;
  const info = {
    side: roomAbove ? 'above' as const : 'below' as const,
    y: roomAbove ? capsule.top - INFO_GAP : capsule.top + capsule.height + INFO_GAP,
    left: capsule.left + CAPSULE_PAD,
    width: slotsSpan(size),
    label: getFeedbackLabel(status),
    failed,
  };

  return {
    capsule: { ...capsule, radius: capsule.height / 2 },
    slots,
    slotSize,
    glyphSize: STAR_ICON_SIZE[size],
    info,
  };
}

/** Whether a touch at (x, y), in window coordinates, lands on the star or within its reach (hit slop). */
export function touchesStar(frame: StarFrame, size: StarSize, x: number, y: number): boolean {
  const slop = STAR_HIT_SLOP[size];
  return x >= frame.x - slop && x <= frame.x + frame.width + slop && y >= frame.y - slop && y <= frame.y + frame.height + slop;
}

/** Whether a touch at (x, y), in window coordinates, lands on the capsule. */
export function touchesCapsule(capsule: Rect, x: number, y: number): boolean {
  return x >= capsule.left && x <= capsule.left + capsule.width && y >= capsule.top && y <= capsule.top + capsule.height;
}
