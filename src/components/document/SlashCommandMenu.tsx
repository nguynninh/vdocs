"use client";

import * as React from "react";

import { useLocale } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";

import { SLASH_MENU_GROUPS, filterSlashMenuItems, type SlashMenuItem } from "./blocks/block-registry";
import type { BlockType } from "./blocks/types";

const MENU_GAP = 4;
const VIEWPORT_MARGIN = 8;
const STICKY_HEADER_HEIGHT = 44;
const MIN_SPACE_FOR_BELOW = 180;
const MAX_MENU_HEIGHT = 320;

interface SlashCommandMenuProps {
  query: string;
  position: { top: number; left: number; anchorTop?: number };
  onSelect: (type: BlockType) => void;
  onActiveIndexChange: (index: number) => void;
  activeIndex: number;
}

export default function SlashCommandMenu({
  query,
  position,
  onSelect,
  onActiveIndexChange,
  activeIndex,
}: SlashCommandMenuProps) {
  const { t } = useLocale();
  const menuRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef(new Map<number, HTMLButtonElement>());
  const [menuHeight, setMenuHeight] = React.useState(MAX_MENU_HEIGHT);

  const groups = React.useMemo(() => {
    if (!query.trim()) return SLASH_MENU_GROUPS;
    const allowed = new Set(filterSlashMenuItems(query, t).map((item) => item.type));
    return SLASH_MENU_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => allowed.has(item.type)),
    })).filter((group) => group.items.length > 0);
  }, [query, t]);

  const flatItems = React.useMemo(() => groups.flatMap((group) => group.items), [groups]);

  React.useLayoutEffect(() => {
    const height = menuRef.current?.offsetHeight;
    if (height) setMenuHeight(Math.min(height, MAX_MENU_HEIGHT));
  }, [flatItems.length]);

  React.useEffect(() => {
    itemRefs.current.get(activeIndex)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  React.useEffect(() => {
    if (activeIndex >= flatItems.length) {
      onActiveIndexChange(Math.max(flatItems.length - 1, 0));
    }
  }, [activeIndex, flatItems.length, onActiveIndexChange]);

  const viewportHeight =
    typeof window === "undefined" ? MAX_MENU_HEIGHT + position.top : window.innerHeight;
  const anchorTop = position.anchorTop ?? position.top - MENU_GAP;
  const availableBelow = viewportHeight - position.top - VIEWPORT_MARGIN;
  const availableAbove = anchorTop - STICKY_HEADER_HEIGHT - VIEWPORT_MARGIN;
  const neededHeight = Math.min(menuHeight, MAX_MENU_HEIGHT);
  const placeAbove =
    availableBelow < Math.min(neededHeight, MIN_SPACE_FOR_BELOW) &&
    availableAbove > availableBelow;
  const maxHeight = Math.max(
    80,
    Math.min(MAX_MENU_HEIGHT, placeAbove ? availableAbove : availableBelow)
  );
  const top = placeAbove
    ? Math.max(
        STICKY_HEADER_HEIGHT + VIEWPORT_MARGIN,
        anchorTop - Math.min(menuHeight, maxHeight) - MENU_GAP
      )
    : Math.max(position.top, STICKY_HEADER_HEIGHT + VIEWPORT_MARGIN);
  const left =
    typeof window === "undefined"
      ? position.left
      : Math.min(position.left, window.innerWidth - 256 - VIEWPORT_MARGIN);
  const menuStyle: React.CSSProperties = {
    top,
    left: Math.max(left, VIEWPORT_MARGIN),
    maxHeight,
  };

  if (flatItems.length === 0) {
    return (
      <div
        ref={menuRef}
        className="fixed z-[100] w-64 rounded-none bg-popover p-2 text-xs text-muted-foreground shadow-md ring-1 ring-foreground/10"
        style={menuStyle}
      >
        {t("document.body.slashMenu.empty")}
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-64 overflow-y-auto rounded-none bg-popover py-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
      style={menuStyle}
    >
      {groups.map((group) => (
        <div key={group.labelKey}>
          <div className="px-2 py-1.5 text-xs text-muted-foreground">{t(group.labelKey)}</div>
          {group.items.map((item: SlashMenuItem) => {
            const index = flatItems.indexOf(item);
            const Icon = item.Icon;
            return (
              <button
                key={item.type}
                ref={(el) => {
                  if (el) itemRefs.current.set(index, el);
                  else itemRefs.current.delete(index);
                }}
                type="button"
                onMouseEnter={() => onActiveIndexChange(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  onSelect(item.type);
                }}
                className={cn(
                  "flex w-full cursor-default items-center gap-2 px-2 py-2 text-left text-xs outline-hidden select-none",
                  index === activeIndex
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />
                {t(item.labelKey)}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
