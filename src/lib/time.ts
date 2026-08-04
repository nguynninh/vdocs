export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) {
    return "Vừa xong";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  if (diffDays === 1) {
    return `Hôm qua lúc ${time}`;
  }
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  return date.toLocaleDateString("vi-VN");
}

import type { Locale, TranslateFn } from "@/lib/i18n";

const LOCALE_TAGS: Record<Locale, string> = { vi: "vi-VN", en: "en-US", zh: "zh-CN" };

export function formatDateTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return date.toLocaleString(LOCALE_TAGS[locale], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatRelativeTimeShort(iso: string, t: TranslateFn, locale: Locale): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));

  if (diffMinutes < 1) {
    return t("document.time.justNow");
  }
  if (diffMinutes < 60) {
    return t("document.time.minutesAgo").replace("{count}", String(diffMinutes));
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return t("document.time.hoursAgo").replace("{count}", String(diffHours));
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return t("document.time.daysAgo").replace("{count}", String(diffDays));
  }

  return date.toLocaleDateString(LOCALE_TAGS[locale]);
}
