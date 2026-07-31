"use client";

import { ChevronDown, Globe, Menu, Moon, Search, Sun, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { locales, type Locale } from "@/lib/i18n";
import type { ProjectNavItem } from "@/lib/project-nav";
import { useLocale } from "./locale-provider";

const NAV_HREFS = ["#", "#", "#", "#", "#"];
const NAV_GAP_PX = 4;

type MenuApiItem = {
  id?: string;
  name?: string;
  label?: string;
  href?: string;
  type?: string;
  item?: MenuApiItem[];
  items?: MenuApiItem[];
  children?: MenuApiItem[];
};

function getChildren(item: MenuApiItem) {
  return item.item ?? item.items ?? item.children;
}

function toNavItem(item: MenuApiItem): ProjectNavItem | null {
  const label = item.name ?? item.label;
  if (!label) return null;

  const children = getChildren(item)?.map(toNavItem).filter((child) => child !== null);
  return {
    label,
    href: item.href,
    type: item.type,
    children: children?.length ? children : undefined,
  };
}

function getApiNavItems(data: unknown) {
  if (!Array.isArray(data)) return [];
  return data.map(toNavItem).filter((item) => item !== null);
}

function NavItemMeasure({ item }: { item: ProjectNavItem }) {
  return item.children ? (
    <span className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5">
      {item.label}
      <ChevronDown className="h-4 w-4" />
    </span>
  ) : (
    <span className="whitespace-nowrap rounded-md px-2 py-1.5">{item.label}</span>
  );
}

export default function Header() {
  const { locale, setLocale, t } = useLocale();
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;

    const stored = localStorage.getItem("theme");
    return stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [apiMenu, setApiMenu] = useState<{ locale: Locale; items: ProjectNavItem[] } | null>(null);
  const navItems = apiMenu?.locale === locale ? apiMenu.items : [];
  const [visibleNavCount, setVisibleNavCount] = useState(navItems.length);
  const searchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const navMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ignore = false;

    async function loadMenu() {
      try {
        const response = await fetch("http://localhost:3000/api/menu", {
          headers: { "Accept-Language": locale },
        });
        if (!response.ok) return;

        const items = getApiNavItems(await response.json());
        if (!ignore && items.length) {
          setApiMenu({ locale, items });
        }
      } catch {
        // No fallback — nav stays empty when the menu API is unavailable.
      }
    }

    loadMenu();
    return () => {
      ignore = true;
    };
  }, [locale]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    const container = navRef.current;
    const measure = navMeasureRef.current;
    if (!container || !measure) return;

    function recalcVisibleNavCount() {
      if (!container || !measure) return;
      const available = container.offsetWidth;
      const children = Array.from(measure.children) as HTMLElement[];
      const itemEls = children.slice(0, navItems.length);
      const moreWidth = children[children.length - 1].offsetWidth;

      let used = 0;
      let count = 0;
      for (let i = 0; i < itemEls.length; i++) {
        const width = itemEls[i].offsetWidth;
        const isLast = i === itemEls.length - 1;
        const prospectiveUsed = used + (count > 0 ? NAV_GAP_PX : 0) + width;
        const moreReserve = isLast ? 0 : moreWidth + NAV_GAP_PX;
        if (prospectiveUsed + moreReserve <= available) {
          used = prospectiveUsed;
          count++;
        } else {
          break;
        }
      }
      setVisibleNavCount(count);
    }

    recalcVisibleNavCount();
    const observer = new ResizeObserver(recalcVisibleNavCount);
    observer.observe(container);
    return () => observer.disconnect();
  }, [navItems]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isTyping = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleTheme() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  }

  function toggleMobileSearch() {
    setIsMobileSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setIsMobileMenuOpen(false);
        requestAnimationFrame(() => mobileSearchRef.current?.focus());
      }
      return next;
    });
  }

  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-12 items-center gap-4 px-4 text-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          aria-label={isMobileMenuOpen ? t("header.closeMenu") : t("header.openMenu")}
          aria-expanded={isMobileMenuOpen}
          className="shrink-0 rounded-full text-muted-foreground md:hidden"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <Link href="/" className="flex shrink-0 items-center gap-2 font-medium whitespace-nowrap text-foreground">
          <Image src="/images/ic_logo_vlive.png" alt="Vlive" width={99} height={22} priority />
        </Link>

        <div ref={navRef} className="hidden min-w-0 flex-1 overflow-hidden md:flex">
          <nav className="flex items-center gap-1">
            {visibleNavCount < navItems.length && (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-muted-foreground outline-none hover:text-foreground data-popup-open:text-foreground [&[data-popup-open]_svg]:rotate-180">
                  {t("header.more")}
                  <ChevronDown className="h-4 w-4 transition-transform" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {navItems.slice(visibleNavCount).map((item, offset) => {
                    const index = visibleNavCount + offset;
                    return item.children ? (
                      <DropdownMenuSub key={item.label}>
                        <DropdownMenuSubTrigger>{item.label}</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {item.children.map((child) => (
                            <DropdownMenuItem key={child.label} render={<a href={child.href ?? NAV_HREFS[index] ?? "#"} />}>
                              {child.label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    ) : (
                      <DropdownMenuItem key={item.label} render={<a href={item.href ?? NAV_HREFS[index] ?? "#"} />}>
                        {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>

        <div
          ref={navMeasureRef}
          aria-hidden
          className="pointer-events-none invisible fixed top-0 left-[-9999px] flex items-center gap-1"
        >
          {navItems.map((item) => (
            <NavItemMeasure key={item.label} item={item} />
          ))}
          <NavItemMeasure item={{ label: t("header.more") }} />
        </div>

        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none md:gap-4">
          {isMobileSearchOpen && (
            <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full border border-border bg-muted px-3 focus-within:border-ring md:hidden">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                ref={mobileSearchRef}
                type="text"
                placeholder={t("header.search")}
                onBlur={() => setIsMobileSearchOpen(false)}
                className="h-auto min-w-0 flex-1 rounded-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
            </label>
          )}

          <label className="hidden h-8 w-56 shrink-0 items-center gap-2 rounded-full border border-border bg-muted px-3 focus-within:border-ring md:flex">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={searchRef}
              type="text"
              placeholder={t("header.search")}
              className="h-auto min-w-0 flex-1 rounded-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <kbd className="rounded border border-border px-1 text-xs text-muted-foreground">/</kbd>
          </label>

          {!isMobileSearchOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleMobileSearch}
              aria-label={t("header.search")}
              className="shrink-0 rounded-full text-muted-foreground md:hidden"
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={isDark ? t("header.themeToLight") : t("header.themeToDark")}
            className="shrink-0 rounded-full text-muted-foreground"
          >
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger className="hidden shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-muted-foreground outline-none hover:text-foreground data-popup-open:text-foreground [&[data-popup-open]_svg]:rotate-180 md:flex">
              <Globe className="h-4 w-4" />
              {t(`header.languageNames.${locale}`)}
              <ChevronDown className="h-4 w-4 transition-transform" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {locales.map((code) => (
                <DropdownMenuItem key={code} onClick={() => setLocale(code)}>
                  {t(`header.languageNames.${code}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isMobileSearchOpen && (
            <Link href="/login" className="shrink-0 text-blue-600 hover:underline dark:text-blue-400">
              {t("header.signIn")}
            </Link>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-border px-4 py-2 md:hidden">
          <nav className="flex flex-col">
            {navItems.map((item, index) =>
              item.children ? (
                <div key={item.label} className="py-1">
                  <div className="px-2 py-1.5 font-medium text-foreground">{item.label}</div>
                  <div className="flex flex-col">
                    {item.children.map((child) => (
                      <a
                        key={child.label}
                        href={child.href ?? NAV_HREFS[index] ?? "#"}
                        className="rounded-md px-4 py-1.5 text-muted-foreground hover:text-foreground"
                      >
                        {child.label}
                      </a>
                    ))}
                  </div>
                </div>
              ) : (
                <a
                  key={item.label}
                  href={item.href ?? NAV_HREFS[index] ?? "#"}
                  className="rounded-md px-2 py-1.5 text-muted-foreground hover:text-foreground"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          <div className="mt-1 border-t border-border pt-2">
            <div className="px-2 py-1 text-xs text-muted-foreground">{t("header.language")}</div>
            <div className="flex flex-wrap gap-1 px-1">
              {locales.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLocale(code)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    code === locale
                      ? "border-foreground text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`header.languageNames.${code}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
