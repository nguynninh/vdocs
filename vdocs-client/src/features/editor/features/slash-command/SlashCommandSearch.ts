import { matchesSlashCommandItem } from "./SlashCommandItem";
import type { SlashCommandGroupData } from "./slashCommand.types";

export function filterSlashCommandGroups(
  groups: SlashCommandGroupData[],
  query: string,
): SlashCommandGroupData[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesSlashCommandItem(item, query)),
    }))
    .filter((group) => group.items.length > 0);
}

export function flattenSlashCommandItems(groups: SlashCommandGroupData[]) {
  return groups.flatMap((group) => group.items);
}
