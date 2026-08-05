"use client";

import { useTransition } from "react";
import { useLocale as useNextIntlLocale } from "next-intl";
import { useRouter } from "next/navigation";

import {
  defaultLocale,
  isValidLocale,
  localeCookieName,
  locales,
  type AppLocale,
} from "@/src/i18n/config";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export function useLocale() {
  const router = useRouter();
  const locale = useNextIntlLocale() as AppLocale;
  const [isPending, startTransition] = useTransition();

  function setLocale(nextLocale: AppLocale) {
    if (!isValidLocale(nextLocale) || nextLocale === locale) {
      return;
    }

    document.cookie = [
      `${localeCookieName}=${nextLocale}`,
      "path=/",
      `max-age=${ONE_YEAR_IN_SECONDS}`,
      "samesite=lax",
    ].join("; ");

    startTransition(() => {
      router.refresh();
    });
  }

  return {
    locale: locale ?? defaultLocale,
    locales,
    isPending,
    setLocale,
  };
}
