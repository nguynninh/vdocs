import { cookies } from "next/headers";

import { defaultLocale, isValidLocale, localeCookieName } from "./config";

export async function getStoredLocale() {
  const cookieStore = await cookies();
  const locale = cookieStore.get(localeCookieName)?.value;

  return locale && isValidLocale(locale) ? locale : defaultLocale;
}
