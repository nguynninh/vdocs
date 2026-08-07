import { ACCEPTED_VIDEO_MIME_TYPES } from "./upload.config";
import { FileUploadHandler } from "./FileUploadHandler";
import type { UploadOutcome } from "./UploadResult";
import type { UploadProgressCallback } from "./upload.types";

export const VideoUploadHandler = {
  accepts(file: File): boolean {
    return ACCEPTED_VIDEO_MIME_TYPES.includes(file.type) || file.type.startsWith("video/");
  },
  upload(documentId: string, file: File, onProgress?: UploadProgressCallback): Promise<UploadOutcome> {
    return FileUploadHandler.upload(documentId, file, onProgress);
  },
};
