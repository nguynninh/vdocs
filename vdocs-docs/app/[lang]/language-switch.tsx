"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useParams, usePathname } from "next/navigation";

const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

export function LanguageSwitch() {
  const params = useParams<{ lang: string }>();
  const pathname = usePathname();
  const currentLang = params.lang;
  const active = LANGUAGES.find((lang) => lang.code === currentLang) ?? LANGUAGES[0];

  const restOfPath = pathname.split("/").slice(2).join("/");

  return (
    <Menu as="div" className="nextra-lang-switch">
      <MenuButton className="nextra-lang-switch-button">
        <span aria-hidden>{active.flag}</span>
        {active.label}
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </MenuButton>
      <MenuItems anchor={{ to: "bottom end", gap: 10, padding: 16 }} className="nextra-lang-switch-items">
        {LANGUAGES.map((lang) => {
          const isActive = lang.code === currentLang;
          const href = `/${lang.code}${restOfPath ? `/${restOfPath}` : ""}`;
          return (
            <MenuItem key={lang.code} as="a" href={href}>
              {({ focus }) => (
                <span
                  className="nextra-lang-switch-item nextra-lang-switch-item-link"
                  data-focus={focus || undefined}
                  data-active={isActive || undefined}
                >
                  <span aria-hidden>{lang.flag}</span> {lang.label}
                </span>
              )}
            </MenuItem>
          );
        })}
      </MenuItems>
    </Menu>
  );
}
