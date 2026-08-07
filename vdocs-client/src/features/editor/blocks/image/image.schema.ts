import type { ImageAlignment, ImageData } from "../../engine/block/block.types";

export const DEFAULT_IMAGE_ALIGNMENT: ImageAlignment = "center";

export function withImageDefaults(image: ImageData): ImageData {
  return {
    align: DEFAULT_IMAGE_ALIGNMENT,
    ...image,
  };
}
