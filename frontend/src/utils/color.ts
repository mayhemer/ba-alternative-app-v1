/**
 * Decode a packed ARGB integer (as used by DbCategory.color) to an rgb() string.
 * -1 (0xFFFFFFFF) decodes to white, which is the "no color" convention in the source data.
 */
export function decodeCategoryColor(color: number): string {
  const u = color >>> 0; // reinterpret as unsigned 32-bit
  const r = (u >>> 16) & 0xFF;
  const g = (u >>> 8)  & 0xFF;
  const b =  u         & 0xFF;
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Linearly scale an rgb() color string down so the brightest possible result
 */
export function dimColor(rgbString: string, accent: number): string {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (match === null) { return rgbString; }
  const FLOOR = 30;
  const r = Math.round(parseInt(match[1], 10) / 255 * accent) + FLOOR;
  const g = Math.round(parseInt(match[2], 10) / 255 * accent) + FLOOR;
  const b = Math.round(parseInt(match[3], 10) / 255 * accent) + FLOOR;
  return `rgb(${r}, ${g}, ${b})`;
}
