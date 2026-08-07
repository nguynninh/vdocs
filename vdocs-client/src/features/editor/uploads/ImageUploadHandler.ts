import { uploadImage } from "./UploadManager";
import type { UploadOutcome } from "./UploadResult";
import type { UploadProgressCallback } from "./upload.types";

export const ImageUploadHandler = {
  accepts(file: File): boolean {
    return file.type.startsWith("image/");
  },
  upload(documentId: string, file: File, onProgress?: UploadProgressCallback): Promise<UploadOutcome> {
    return uploadImage(documentId, file, onProgress);
  },
};
