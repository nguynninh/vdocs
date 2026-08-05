"use client";

import { ChevronDown, Globe, LogOut, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/src/features/auth/types";
import { useLocale } from "@/src/i18n/hooks/useLocale";
import LightDarkSwitch from "../ui/LightDarkSwitch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import SwitchLanguage from "../ui/SwitchLanguage";
import ExpandableSearchBar from "../ui/ExpandableSearchBar";

export interface Props {
  user: AuthUser,
  onLogout?: (id: string) => void,
}

const Header = (props: Props) => {
  const { user, onLogout } = props
  const { locale, locales, setLocale } = useLocale();
  const t = useTranslations("header");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-border bg-background">
      <div className="flex h-12 items-center justify-between gap-4 px-4 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? t("closeMenu") : t("openMenu")}>
            <Menu className="h-5 w-5" />
          </Button>

          <SidebarTrigger />
        </div>

        <div className="flex min-w-0 shrink items-center gap-2">
          <ExpandableSearchBar />

          <LightDarkSwitch />

          <SwitchLanguage />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="flex shrink-0 items-center gap-2 rounded-full outline-none">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.name}
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden max-w-32 truncate text-foreground md:inline">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={() => onLogout?.(user.userId || "")}>
                  <LogOut className="h-4 w-4" />
                  {t("signOut")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login" className="shrink-0 text-blue-600 hover:underline dark:text-blue-400">
              {t("signIn")}
            </Link>
          )}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="border-t border-border px-4 py-2 md:hidden">
          <div className="px-2 py-1 text-xs text-muted-foreground">{t("language")}</div>
          <div className="flex flex-wrap gap-1 px-1">
            {locales.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLocale(code)}
                className={`rounded-full border px-3 py-1 text-sm ${code === locale
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t(`languageNames.${code}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;