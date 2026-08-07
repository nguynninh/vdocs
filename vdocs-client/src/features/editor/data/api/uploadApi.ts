import { api } from "@/src/services/axios";
import type { UploadProgressCallback, UploadResultData } from "../../uploads/upload.types";
import { toUploadProgress } from "../../uploads/UploadProgress";

export function uploadImageFile(
  documentId: string,
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<UploadResultData> {
  const formData = new FormData();
  formData.append("file", file);

  return api
    .post<UploadResultData>(`/api/documents/${documentId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (!onProgress) return;
        onProgress(toUploadProgress(event.loaded, event.total ?? file.size));
      },
    })
    .then((response) => response.data);
}
