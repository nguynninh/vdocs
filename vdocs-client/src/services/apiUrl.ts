export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  const origin = getApiOrigin();
  return process.env.NODE_ENV === "production" ? origin : `${origin}/api`;
}
