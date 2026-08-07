export const MIN_IMAGE_WIDTH = 120;
export const MAX_IMAGE_WIDTH = 1200;

export function clampImageWidth(width: number): number {
  return Math.max(MIN_IMAGE_WIDTH, Math.min(MAX_IMAGE_WIDTH, Math.round(width)));
}

export function computeResizedWidth(startWidth: number, deltaX: number): number {
  return clampImageWidth(startWidth + deltaX);
}
