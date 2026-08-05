import type { SlashCommandGroupData, SlashCommandItem } from "./slashCommand.types";

export function createSlashCommandGroup(
  id: string,
  label: string,
  items: SlashCommandItem[],
): SlashCommandGroupData {
  return { id, label, items };
}
