import { uploadImageFile } from "../data/api/uploadApi";
import { validateImageFile } from "./validateUpload";
import type { UploadOutcome } from "./UploadResult";
import type { UploadProgressCallback } from "./upload.types";

export async function uploadImage(
  documentId: string,
  file: File,
  onProgress?: UploadProgressCallback,
): Promise<UploadOutcome> {
  const validation = validateImageFile(file);
  if (!validation.ok) {
    return { status: "error", message: validation.message ?? "Invalid file." };
  }

  try {
    const data = await uploadImageFile(documentId, file, onProgress);
    return { status: "success", data };
  } catch {
    return { status: "error", message: "Upload failed. Please try again." };
  }
}
