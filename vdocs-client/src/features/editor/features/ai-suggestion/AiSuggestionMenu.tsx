"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

import { defaultAiSuggestions } from "./defaultAiSuggestions";
import type { AiSuggestionItem } from "./aiSuggestion.types";

export interface AiSuggestionMenuProps {
  onSelect: (item: AiSuggestionItem) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export function AiSuggestionMenu({ onSelect, onClose, style }: AiSuggestionMenuProps) {
  const t = useTranslations("aiSuggestion");
  const [activeIndex, setActiveIndex] = useState(0);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const items = defaultAiSuggestions;

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      onSelect(items[activeIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      role="listbox"
      style={style}
      className="flex w-64 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground">
        {t("title")}
      </div>

      <div className="max-h-80 overflow-y-auto py-1.5">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              ref={isActive ? activeItemRef : undefined}
              type="button"
              role="option"
              aria-selected={isActive}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onSelect(item)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                isActive ? "bg-accent text-accent-foreground" : ""
              }`}
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{t(`items.${item.id}`)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{t("closeMenu")}</span>
        <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">esc</span>
      </div>
    </div>
  );
}
