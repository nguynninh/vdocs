import { defaultSlashCommandGroups } from "./defaultSlashCommands";
import type { SlashCommandGroupData } from "./slashCommand.types";

let groups: SlashCommandGroupData[] = defaultSlashCommandGroups;

export function getSlashCommandGroups(): SlashCommandGroupData[] {
  return groups;
}

export function registerSlashCommandGroup(group: SlashCommandGroupData): void {
  groups = [...groups.filter((existing) => existing.id !== group.id), group];
}

export function resetSlashCommandGroups(): void {
  groups = defaultSlashCommandGroups;
}
