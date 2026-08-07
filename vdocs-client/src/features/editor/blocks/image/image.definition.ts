import type { BlockType } from "../../engine/block/block.types";

export const IMAGE_BLOCK_TYPE: BlockType = "image";

export const imageBlockDefinition = {
  type: IMAGE_BLOCK_TYPE,
  label: "Image",
  keywords: ["image", "picture", "photo", "upload"],
};
