"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

const VERSIONS = [
  { label: "1.0.1", href: "/sdkgame", current: true },
  { label: "1.0.0", href: "/sdkgame", current: false },
];

export function VersionSwitch() {
  const active = VERSIONS.find((version) => version.current) ?? VERSIONS[0];

  return (
    <Menu as="div" className="nextra-lang-switch">
      <MenuButton className="nextra-lang-switch-button">
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
        {VERSIONS.map((version) => (
          <MenuItem key={version.label} as="a" href={version.href}>
            {({ focus }) => (
              <span
                className="nextra-lang-switch-item nextra-lang-switch-item-link"
                data-focus={focus || undefined}
                data-active={version.current || undefined}
              >
                {version.label}
              </span>
            )}
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
