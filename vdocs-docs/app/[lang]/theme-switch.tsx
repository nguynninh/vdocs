"use client";

import { useTheme } from "next-themes";
import { useMounted } from "nextra/hooks";

const ORDER = ["system", "light", "dark"] as const;

export function ThemeSwitch() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? theme ?? "system" : "system";

  const handleClick = () => {
    const next = ORDER[(ORDER.indexOf(current as (typeof ORDER)[number]) + 1) % ORDER.length];
    setTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={`Theme: ${current}`}
      className="nextra-theme-switch-button"
      data-theme-icon={current}
      onClick={handleClick}
    />
  );
}
