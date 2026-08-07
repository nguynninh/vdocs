export type UploadStatus = "idle" | "uploading" | "success" | "error";

export interface ValidationResult {
  ok: boolean;
  message?: string;
}

export interface UploadResultData {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface UploadProgressInfo {
  loaded: number;
  total: number;
  percent: number;
}

export type UploadProgressCallback = (progress: UploadProgressInfo) => void;
