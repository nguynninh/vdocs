import type { UploadProgressInfo } from "./upload.types";

export function toUploadProgress(loaded: number, total: number): UploadProgressInfo {
  const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  return { loaded, total, percent };
}
