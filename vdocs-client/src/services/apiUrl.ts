export function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function getApiBaseUrl(): string {
  return `${getApiOrigin()}/api`;
}
