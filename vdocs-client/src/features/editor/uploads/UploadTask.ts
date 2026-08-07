import type { UploadProgressInfo, UploadResultData, UploadStatus } from "./upload.types";

export interface UploadTaskInit {
  id: string;
  file: File;
}

export class UploadTask {
  readonly id: string;
  readonly file: File;
  status: UploadStatus = "idle";
  progress: UploadProgressInfo = { loaded: 0, total: 0, percent: 0 };
  result?: UploadResultData;
  error?: string;

  constructor(init: UploadTaskInit) {
    this.id = init.id;
    this.file = init.file;
  }

  markUploading(): void {
    this.status = "uploading";
  }

  updateProgress(progress: UploadProgressInfo): void {
    this.progress = progress;
  }

  markSuccess(result: UploadResultData): void {
    this.status = "success";
    this.result = result;
  }

  markError(message: string): void {
    this.status = "error";
    this.error = message;
  }
}
