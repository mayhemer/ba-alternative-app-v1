import { PIXELS_PER_HOUR } from './timelineLayout';
import { DAY_BOUNDARY_HOUR } from '../../utils/festivalTime';

// ── The ruler's hour ticks: what they show ────────────────────────────────────
//
// One tick per hour across the whole day canvas, 06:00 to the next 06:00, each
// at its hour's x and labelled with it.

export type HourTickModel = { key: number; x: number; label: string };

export function hourTickModels(): HourTickModel[] {
  return Array.from({ length: 25 }, (_, h) => ({
    key: h,
    x: h * PIXELS_PER_HOUR,
    label: `${String((DAY_BOUNDARY_HOUR + h) % 24).padStart(2, '0')}:00`,
  }));
}
