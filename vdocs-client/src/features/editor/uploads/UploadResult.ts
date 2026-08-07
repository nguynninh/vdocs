import type { UploadResultData } from "./upload.types";

export interface UploadSuccess {
  status: "success";
  data: UploadResultData;
}

export interface UploadFailure {
  status: "error";
  message: string;
}

export type UploadOutcome = UploadSuccess | UploadFailure;
