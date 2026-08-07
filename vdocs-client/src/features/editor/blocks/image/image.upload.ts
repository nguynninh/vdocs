import { uploadImage } from "../../uploads/UploadManager";
import type { UploadOutcome } from "../../uploads/UploadResult";
import type { UploadProgressCallback } from "../../uploads/upload.types";
import type { ImageData } from "../../engine/block/block.types";

export async function uploadAndBuildImageData(
  documentId: string,
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<{ data?: ImageData; error?: string }> {
  const outcome: UploadOutcome = await uploadImage(documentId, file, onProgress);

  if (outcome.status === "error") {
    return { error: outcome.message };
  }

  return {
    data: {
      id: outcome.data.id,
      filename: outcome.data.filename,
      mimeType: outcome.data.mimeType,
      size: outcome.data.size,
      url: outcome.data.url,
      alt: outcome.data.filename,
    },
  };
}
