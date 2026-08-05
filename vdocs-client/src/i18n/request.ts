import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { getRequestConfig } from "next-intl/server";

import { defaultLocale, isValidLocale, type AppLocale } from "@/src/i18n/config";
import { getStoredLocale } from "@/src/i18n/config.server";

type NestedMessages = {
  [key: string]: string | NestedMessages;
};

function mergeMessages(target: NestedMessages, source: NestedMessages) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof target[key] === "object" &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      mergeMessages(target[key] as NestedMessages, value);
      continue;
    }

    target[key] = value;
  }
}

async function loadMessages(locale: AppLocale) {
  const localeDir = path.join(process.cwd(), "src", "i18n", "locales", locale);
  const entries = await readdir(localeDir, { withFileTypes: true });
  const messages: NestedMessages = {};

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) {
      continue;
    }

    const filePath = path.join(localeDir, entry.name);
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent) as NestedMessages;
    mergeMessages(messages, parsed);
  }

  return messages;
}

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requestedLocale = locale ?? (await requestLocale) ?? (await getStoredLocale());
  const resolvedLocale = isValidLocale(requestedLocale)
    ? requestedLocale
    : defaultLocale;

  return {
    locale: resolvedLocale,
    messages: await loadMessages(resolvedLocale),
  };
});
