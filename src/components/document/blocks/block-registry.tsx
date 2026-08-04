import {
  CheckSquare,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  List,
  ListOrdered,
  ListTree,
  Minus,
  Quote,
  Type,
} from "lucide-react";

import type { BlockType } from "./types";

export interface SlashMenuItem {
  type: BlockType;
  labelKey: string;
  keywords: string[];
  Icon: React.ComponentType<{ className?: string }>;
}

export interface SlashMenuGroup {
  labelKey: string;
  items: SlashMenuItem[];
}

export const SLASH_MENU_GROUPS: SlashMenuGroup[] = [
  {
    labelKey: "document.body.slashMenu.groups.basic",
    items: [
      {
        type: "paragraph",
        labelKey: "document.body.slashMenu.items.paragraph",
        keywords: ["text", "van ban", "paragraph"],
        Icon: Type,
      },
      {
        type: "heading1",
        labelKey: "document.body.slashMenu.items.heading1",
        keywords: ["h1", "tieu de 1", "heading"],
        Icon: Heading1,
      },
      {
        type: "heading2",
        labelKey: "document.body.slashMenu.items.heading2",
        keywords: ["h2", "tieu de 2", "heading"],
        Icon: Heading2,
      },
      {
        type: "heading3",
        labelKey: "document.body.slashMenu.items.heading3",
        keywords: ["h3", "tieu de 3", "heading"],
        Icon: Heading3,
      },
      {
        type: "numbered",
        labelKey: "document.body.slashMenu.items.numbered",
        keywords: ["danh sach danh so", "numbered list", "ordered"],
        Icon: ListOrdered,
      },
      {
        type: "bulleted",
        labelKey: "document.body.slashMenu.items.bulleted",
        keywords: ["danh sach gach dau dong", "bulleted list"],
        Icon: List,
      },
      {
        type: "code",
        labelKey: "document.body.slashMenu.items.code",
        keywords: ["khoi ma", "code block"],
        Icon: Code2,
      },
      {
        type: "quote",
        labelKey: "document.body.slashMenu.items.quote",
        keywords: ["trich dan", "quote"],
        Icon: Quote,
      },
      {
        type: "divider",
        labelKey: "document.body.slashMenu.items.divider",
        keywords: ["thanh chia", "divider"],
        Icon: Minus,
      },
    ],
  },
  {
    labelKey: "document.body.slashMenu.groups.common",
    items: [
      {
        type: "todo",
        labelKey: "document.body.slashMenu.items.todo",
        keywords: ["viec can lam", "todo", "checklist"],
        Icon: CheckSquare,
      },
      {
        type: "image",
        labelKey: "document.body.slashMenu.items.image",
        keywords: ["hinh anh", "image"],
        Icon: ImageIcon,
      },
      {
        type: "childPages",
        labelKey: "document.body.slashMenu.items.childPages",
        keywords: ["danh sach con", "sub pages", "child pages"],
        Icon: ListTree,
      },
    ],
  },
];

export const ALL_SLASH_MENU_ITEMS: SlashMenuItem[] = SLASH_MENU_GROUPS.flatMap(
  (group) => group.items
);

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function filterSlashMenuItems(query: string, t: (key: string) => string): SlashMenuItem[] {
  const normalizedQuery = normalize(query.trim());
  if (!normalizedQuery) return ALL_SLASH_MENU_ITEMS;
  return ALL_SLASH_MENU_ITEMS.filter((item) => {
    const label = normalize(t(item.labelKey));
    return (
      label.includes(normalizedQuery) ||
      item.keywords.some((keyword) => normalize(keyword).includes(normalizedQuery))
    );
  });
}
