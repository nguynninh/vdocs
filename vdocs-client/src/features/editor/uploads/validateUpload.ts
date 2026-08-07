import { ACCEPTED_IMAGE_MIME_TYPES, MAX_IMAGE_UPLOAD_SIZE_BYTES } from "./upload.config";
import type { ValidationResult } from "./upload.types";

function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))}MB`;
}

export function validateImageFile(
  file: File,
  maxSizeBytes: number = MAX_IMAGE_UPLOAD_SIZE_BYTES,
): ValidationResult {
  const isImageType =
    ACCEPTED_IMAGE_MIME_TYPES.includes(file.type) || file.type.startsWith("image/");

  if (!isImageType) {
    return { ok: false, message: "Unsupported file type. Please choose an image." };
  }

  if (file.size > maxSizeBytes) {
    return { ok: false, message: `File too large. Max size is ${formatMb(maxSizeBytes)}.` };
  }

  return { ok: true };
}
