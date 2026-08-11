export function formatRelativeTime(iso: string, locale: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];

  for (const [unit, secondsInUnit] of units) {
    if (diffSec >= secondsInUnit) {
      const value = Math.floor(diffSec / secondsInUnit);
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(-value, unit);
    }
  }

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "minute");
}
