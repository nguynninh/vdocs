import { NextRequest, NextResponse } from "next/server";

const locales = ["vi", "en", "zh"] as const;
const defaultLocale = "vi";

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return defaultLocale;

  const preferred = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase());

  for (const lang of preferred) {
    const short = lang.split("-")[0];
    const match = locales.find((locale) => locale === short);
    if (match) return match;
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const localeMatch = locales.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );

  if (localeMatch) {
    // The bare locale root (e.g. "/vi") has no content/index.mdx and crashes
    // Nextra's page resolver, so send it to a real page instead.
    if (pathname === `/${localeMatch}`) {
      const url = request.nextUrl.clone();
      url.pathname = `/${localeMatch}/sdkgame`;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const locale = getLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Skip Next.js internals and any request for a static file (has a "." in
    // the last path segment, e.g. .svg, .png, .ico, .txt, .xml).
    "/((?!_next|api|.*\\..*).*)",
  ],
};
