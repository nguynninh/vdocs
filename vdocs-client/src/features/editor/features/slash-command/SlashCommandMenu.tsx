"use client";

import { useTranslations } from "next-intl";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import { useSlashCommandManager } from "./SlashCommandManager";
import type { SlashCommandItem } from "./slashCommand.types";

export interface SlashCommandMenuProps {
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
  style?: React.CSSProperties;
}

export interface SlashCommandMenuHandle {
  element: HTMLDivElement | null;
  setQuery: (query: string) => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

export const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(
  function SlashCommandMenu({ onSelect, onClose, style }, forwardedRef) {
  const t = useTranslations("slashCommand");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const { query, setQuery, groups, items, activeIndex, setActiveIndex, handleKeyDown } =
    useSlashCommandManager({ onSelect, onClose });

  useImperativeHandle(
    forwardedRef,
    () => ({
      element: containerRef.current,
      setQuery,
      handleKeyDown,
    }),
    [setQuery, handleKeyDown],
  );

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  let flatIndex = 0;

  return (
    <div
      ref={containerRef}
      role="listbox"
      style={style}
      className="flex w-64 flex-col overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg"
      onKeyDown={handleKeyDown}
    >
      <div className="p-2">
        <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1.5">
          <span className="text-sm text-muted-foreground">/</span>
          <input
            ref={inputRef}
            value={query}
            readOnly
            tabIndex={-1}
            placeholder={t("searchPlaceholder")}
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto py-1.5">
        {items.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </div>
        )}

        {groups.map((group) => (
          <div key={group.id} className="px-1">
            <div className="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">
              {t(`groups.${group.id}`)}
            </div>

            {group.items.map((item) => {
              const index = flatIndex++;
              const isActive = index === activeIndex;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  ref={isActive ? activeItemRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={item.disabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => onSelect(item)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm ${
                    isActive ? "bg-accent text-accent-foreground" : ""
                  } ${item.disabled ? "cursor-not-allowed text-muted-foreground" : ""}`}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{t(`items.${item.id}`)}</span>
                  {item.isNew && (
                    <span className="shrink-0 rounded bg-accent px-1.5 py-0.5 text-[10px] font-medium text-accent-foreground">
                      {t("new")}
                    </span>
                  )}
                  {item.shortcut && (
                    <span className="shrink-0 text-xs text-muted-foreground">{item.shortcut}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
        <span>{t("closeMenu")}</span>
        <span className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">esc</span>
      </div>
    </div>
  );
  },
);
