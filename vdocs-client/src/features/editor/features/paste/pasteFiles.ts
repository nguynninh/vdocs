export function extractImageFileFromClipboard(clipboardData: DataTransfer): File | null {
  const file = Array.from(clipboardData.files).find((item) => item.type.startsWith("image/"));
  return file ?? null;
}
