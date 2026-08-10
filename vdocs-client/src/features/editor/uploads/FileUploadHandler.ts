import { api } from "@/src/services/axios";
import { MAX_FILE_UPLOAD_SIZE_BYTES } from "./upload.config";
import type { UploadOutcome } from "./UploadResult";
import { toUploadProgress } from "./UploadProgress";
import type { UploadProgressCallback, UploadResultData } from "./upload.types";

export const FileUploadHandler = {
  accepts(): boolean {
    return true;
  },
  async upload(
    documentId: string,
    file: File,
    onProgress?: UploadProgressCallback,
  ): Promise<UploadOutcome> {
    if (file.size > MAX_FILE_UPLOAD_SIZE_BYTES) {
      return { status: "error", message: "File too large." };
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post<UploadResultData>(
        `/documents/${documentId}/files`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (!onProgress) return;
            onProgress(toUploadProgress(event.loaded, event.total ?? file.size));
          },
        },
      );
      return { status: "success", data: response.data };
    } catch {
      return { status: "error", message: "Upload failed. Please try again." };
    }
  },
};
