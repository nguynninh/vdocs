export function formatImageSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isLikelyImageUrl(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(url) || /^https?:\/\//.test(url);
}

export function filenameFromUrl(url: string): string {
  return url.split("/").pop()?.split("?")[0] || url;
}
