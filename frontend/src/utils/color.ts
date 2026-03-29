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
