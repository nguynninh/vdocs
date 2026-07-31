import enAuth from "./locates/en/auth.json";
import enHeader from "./locates/en/header.json";
import viAuth from "./locates/vi/auth.json";
import viHeader from "./locates/vi/header.json";
import zhAuth from "./locates/zh/auth.json";
import zhHeader from "./locates/zh/header.json";

export type Locale = "vi" | "en" | "zh";
export const locales: Locale[] = ["vi", "en", "zh"];
export const defaultLocale: Locale = "vi";

// To add a namespace: create locates/<locale>/<file>.json for every locale, import it above,
// and add it to `modules` below. The file name becomes the namespace used in t("file.key").
const modules: Record<Locale, Record<string, Record<string, unknown>>> = {
  vi: { auth: viAuth, header: viHeader },
  en: { auth: enAuth, header: enHeader },
  zh: { auth: zhAuth, header: zhHeader },
};

function flatten(prefix: string, source: Record<string, unknown>, out: Record<string, string>) {
  for (const [key, value] of Object.entries(source)) {
    const flatKey = `${prefix}.${key}`;
    if (typeof value === "string") {
      out[flatKey] = value;
    } else if (typeof value === "object" && value !== null) {
      flatten(flatKey, value as Record<string, unknown>, out);
    }
  }
}

export const dictionaries: Record<Locale, Record<string, string>> = { vi: {}, en: {}, zh: {} };

for (const locale of locales) {
  for (const [namespace, data] of Object.entries(modules[locale])) {
    flatten(namespace, data, dictionaries[locale]);
  }
}

export type TranslateFn = (key: string) => string;

// key uses the "file.key" pattern, e.g. t("auth.txt_login_button") or t("header.languageNames.vi").
export function createTranslator(locale: Locale): TranslateFn {
  const dict = dictionaries[locale] ?? dictionaries[defaultLocale];
  return function t(key: string): string {
    return dict[key] ?? key;
  };
}
