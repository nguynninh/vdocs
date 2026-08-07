import type { ImageAlignment, ImageData } from "../../engine/block/block.types";

export interface ImageCommandsApi {
  setBlockImageData: (blockId: string, image: ImageData) => void;
}

export function setImageSource(api: ImageCommandsApi, blockId: string, image: ImageData): void {
  api.setBlockImageData(blockId, image);
}

export function setImageAlignment(
  api: ImageCommandsApi,
  blockId: string,
  current: ImageData,
  align: ImageAlignment,
): void {
  api.setBlockImageData(blockId, { ...current, align });
}

export function setImageCaption(
  api: ImageCommandsApi,
  blockId: string,
  current: ImageData,
  caption: string,
): void {
  api.setBlockImageData(blockId, { ...current, caption });
}

export function setImageWidth(
  api: ImageCommandsApi,
  blockId: string,
  current: ImageData,
  width: number,
): void {
  api.setBlockImageData(blockId, { ...current, width });
}
