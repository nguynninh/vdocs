import type { SlashCommandItem as SlashCommandItemData } from "./slashCommand.types";

export function createSlashCommandItem(data: SlashCommandItemData): SlashCommandItemData {
  return data;
}

export function matchesSlashCommandItem(item: SlashCommandItemData, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (normalized.length === 0) return true;

  return (
    item.label.toLowerCase().includes(normalized) ||
    item.keywords.some((keyword) => keyword.toLowerCase().includes(normalized))
  );
}
