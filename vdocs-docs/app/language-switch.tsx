"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

const LANGUAGES = [
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳", current: true },
  { code: "en", label: "English", flag: "🇬🇧", current: false },
  { code: "zh", label: "中文", flag: "🇨🇳", current: false },
];

export function LanguageSwitch() {
  const active = LANGUAGES.find((lang) => lang.current) ?? LANGUAGES[0];

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
        {LANGUAGES.map((lang) => (
          <MenuItem key={lang.code} disabled={lang.code !== "vi"}>
            {({ focus, disabled }) => (
              <span
                className="nextra-lang-switch-item"
                data-focus={focus || undefined}
                data-active={lang.current || undefined}
                data-disabled={disabled || undefined}
              >
                <span>
                  <span aria-hidden>{lang.flag}</span> {lang.label}
                </span>
                {lang.code !== "vi" && <em>sắp có</em>}
              </span>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
