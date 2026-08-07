import type { ImageData } from "../../engine/block/block.types";

/** Extracts an `<img>` tag's src/alt from pasted HTML, if the fragment is just an image. */
export function parseImageFromHtml(html: string): ImageData | null {
  const match = html.match(/<img[^>]*\ssrc=["']([^"']+)["'][^>]*>/i);
  if (!match) return null;

  const altMatch = html.match(/<img[^>]*\salt=["']([^"']*)["'][^>]*>/i);

  return {
    url: match[1],
    alt: altMatch?.[1] ?? "",
    filename: match[1].split("/").pop()?.split("?")[0] ?? match[1],
  };
}
