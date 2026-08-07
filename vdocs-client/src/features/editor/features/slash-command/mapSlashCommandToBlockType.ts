import type { BlockType } from "../../engine/block/block.types";
import type { SlashCommandBlockType } from "./slashCommand.types";

const BLOCK_TYPE_BY_SLASH_COMMAND: Partial<Record<SlashCommandBlockType, BlockType>> = {
  text: "paragraph",
  heading1: "heading1",
  heading2: "heading2",
  heading3: "heading3",
  bulletedList: "bulletedListItem",
  numberedList: "numberedListItem",
  todoList: "todoListItem",
  quote: "quote",
  divider: "divider",
  code: "codeBlock",
  table: "table",
  file: "file",
};

export function mapSlashCommandToBlockType(id: SlashCommandBlockType): BlockType | null {
  return BLOCK_TYPE_BY_SLASH_COMMAND[id] ?? null;
}
