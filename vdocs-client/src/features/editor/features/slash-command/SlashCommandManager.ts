import { useCallback, useMemo, useState } from "react";

import { getSlashCommandGroups } from "./SlashCommandRegistry";
import { filterSlashCommandGroups, flattenSlashCommandItems } from "./SlashCommandSearch";
import type { SlashCommandItem } from "./slashCommand.types";

export interface UseSlashCommandManagerOptions {
  onSelect: (item: SlashCommandItem) => void;
  onClose: () => void;
}

export function useSlashCommandManager({ onSelect, onClose }: UseSlashCommandManagerOptions) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const groups = useMemo(() => filterSlashCommandGroups(getSlashCommandGroups(), query), [query]);
  const items = useMemo(() => flattenSlashCommandItems(groups), [groups]);

  const updateQuery = useCallback((next: string) => {
    setQuery(next);
    setActiveIndex(0);
  }, []);

  const moveActiveIndex = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        if (items.length === 0) return 0;
        return (current + delta + items.length) % items.length;
      });
    },
    [items.length],
  );

  const selectActiveItem = useCallback(() => {
    const item = items[activeIndex];
    if (item && !item.disabled) onSelect(item);
  }, [items, activeIndex, onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          moveActiveIndex(1);
          break;
        case "ArrowUp":
          event.preventDefault();
          moveActiveIndex(-1);
          break;
        case "Enter":
          event.preventDefault();
          selectActiveItem();
          break;
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        default:
          break;
      }
    },
    [moveActiveIndex, selectActiveItem, onClose],
  );

  return {
    query,
    setQuery: updateQuery,
    groups,
    items,
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    selectItem: onSelect,
  };
}
