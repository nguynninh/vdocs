import {
  Bookmark,
  Calendar,
  ChevronRight,
  Code,
  File,
  FileSymlink,
  GalleryHorizontal,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image,
  Kanban,
  LayoutDashboard,
  List,
  ListOrdered,
  ListTodo,
  MessageSquareQuote,
  Music,
  Paperclip,
  Quote,
  Rows3,
  Rss,
  SeparatorHorizontal,
  Table,
  Type,
  Video,
} from "lucide-react";

import { createSlashCommandGroup } from "./SlashCommandGroup";
import { createSlashCommandItem } from "./SlashCommandItem";
import type { SlashCommandGroupData } from "./slashCommand.types";

const TEXT_COLORS = [
  { id: "textColorDefault", label: "Default text", hex: "currentColor" },
  { id: "textColorGray", label: "Gray text", hex: "#9B9A97" },
  { id: "textColorBrown", label: "Brown text", hex: "#64473A" },
  { id: "textColorOrange", label: "Orange text", hex: "#D9730D" },
  { id: "textColorYellow", label: "Yellow text", hex: "#DFAB01" },
  { id: "textColorGreen", label: "Green text", hex: "#0F7B6C" },
  { id: "textColorBlue", label: "Blue text", hex: "#0B6E99" },
  { id: "textColorPurple", label: "Purple text", hex: "#6940A5" },
  { id: "textColorPink", label: "Pink text", hex: "#AD1A72" },
  { id: "textColorRed", label: "Red text", hex: "#E03E3E" },
] as const;

const BACKGROUND_COLORS = [
  { id: "backgroundColorDefault", label: "Default background", hex: "transparent" },
  { id: "backgroundColorGray", label: "Gray background", hex: "#EBECED" },
  { id: "backgroundColorBrown", label: "Brown background", hex: "#E9E5E3" },
  { id: "backgroundColorOrange", label: "Orange background", hex: "#FAEBDD" },
  { id: "backgroundColorYellow", label: "Yellow background", hex: "#FBF3DB" },
  { id: "backgroundColorGreen", label: "Green background", hex: "#DDEDEA" },
  { id: "backgroundColorBlue", label: "Blue background", hex: "#DDEBF1" },
  { id: "backgroundColorPurple", label: "Purple background", hex: "#EAE4F2" },
  { id: "backgroundColorPink", label: "Pink background", hex: "#F4DFEB" },
  { id: "backgroundColorRed", label: "Red background", hex: "#FBE4E4" },
] as const;

function createTextColorIcon(hex: string) {
  return function TextColorIcon({ className }: { className?: string }) {
    return (
      <span className={className} style={{ color: hex }}>
        A
      </span>
    );
  };
}

function createBackgroundColorIcon(hex: string) {
  return function BackgroundColorIcon({ className }: { className?: string }) {
    return (
      <span
        className={`${className} inline-block rounded-sm border border-border`}
        style={{ backgroundColor: hex }}
      />
    );
  };
}

const basicBlocks = createSlashCommandGroup("basic-blocks", "Basic blocks", [
  createSlashCommandItem({
    id: "text",
    label: "Text",
    keywords: ["text", "paragraph"],
    icon: Type,
  }),
  createSlashCommandItem({
    id: "heading1",
    label: "Heading 1",
    keywords: ["heading", "h1", "title"],
    icon: Heading1,
    shortcut: "#",
  }),
  createSlashCommandItem({
    id: "heading2",
    label: "Heading 2",
    keywords: ["heading", "h2", "subtitle"],
    icon: Heading2,
    shortcut: "##",
  }),
  createSlashCommandItem({
    id: "heading3",
    label: "Heading 3",
    keywords: ["heading", "h3"],
    icon: Heading3,
    shortcut: "###",
  }),
  createSlashCommandItem({
    id: "heading4",
    label: "Heading 4",
    keywords: ["heading", "h4"],
    icon: Heading4,
    shortcut: "####",
  }),
  createSlashCommandItem({
    id: "bulletedList",
    label: "Bulleted list",
    keywords: ["bulleted", "list", "unordered", "bullet"],
    icon: List,
    shortcut: "-",
  }),
  createSlashCommandItem({
    id: "numberedList",
    label: "Numbered list",
    keywords: ["numbered", "list", "ordered"],
    icon: ListOrdered,
    shortcut: "1.",
  }),
  createSlashCommandItem({
    id: "todoList",
    label: "To-do list",
    keywords: ["todo", "to-do", "checkbox", "task"],
    icon: ListTodo,
  }),
  createSlashCommandItem({
    id: "toggleList",
    label: "Toggle list",
    keywords: ["toggle", "collapsible", "list"],
    icon: ChevronRight,
    shortcut: ">",
  }),
  createSlashCommandItem({
    id: "page",
    label: "Page",
    keywords: ["page", "subpage", "document"],
    icon: File,
  }),
  createSlashCommandItem({
    id: "callout",
    label: "Callout",
    keywords: ["callout", "note", "highlight"],
    icon: MessageSquareQuote,
  }),
  createSlashCommandItem({
    id: "quote",
    label: "Quote",
    keywords: ["quote", "blockquote", "citation"],
    icon: Quote,
    shortcut: '"',
  }),
  createSlashCommandItem({
    id: "table",
    label: "Table",
    keywords: ["table", "grid", "spreadsheet"],
    icon: Table,
  }),
  createSlashCommandItem({
    id: "childDocuments",
    label: "Child documents",
    keywords: ["child", "children", "sub-list", "subpage", "danh sach con"],
    icon: Rows3,
  }),
  createSlashCommandItem({
    id: "divider",
    label: "Divider",
    keywords: ["divider", "separator", "line", "hr"],
    icon: SeparatorHorizontal,
    shortcut: "---",
  }),
  createSlashCommandItem({
    id: "linkToPage",
    label: "Link to page",
    keywords: ["link", "page", "reference", "mention"],
    icon: FileSymlink,
  }),
]);

const media = createSlashCommandGroup("media", "Media", [
  createSlashCommandItem({
    id: "image",
    label: "Image",
    keywords: ["image", "picture", "photo", "upload"],
    icon: Image,
  }),
  createSlashCommandItem({
    id: "video",
    label: "Video",
    keywords: ["video", "embed", "youtube"],
    icon: Video,
    disabled: true,
  }),
  createSlashCommandItem({
    id: "audio",
    label: "Audio",
    keywords: ["audio", "sound", "music"],
    icon: Music,
  }),
  createSlashCommandItem({
    id: "code",
    label: "Code",
    keywords: ["code", "snippet", "codeblock"],
    icon: Code,
    shortcut: "```",
  }),
  createSlashCommandItem({
    id: "file",
    label: "File",
    keywords: ["file", "attachment", "upload"],
    icon: Paperclip,
  }),
  createSlashCommandItem({
    id: "webBookmark",
    label: "Web bookmark",
    keywords: ["bookmark", "web", "link", "url"],
    icon: Bookmark,
  }),
]);

const database = createSlashCommandGroup("database", "Database", [
  createSlashCommandItem({
    id: "tableView",
    label: "Table view",
    keywords: ["table", "view", "database"],
    icon: Table,
  }),
  createSlashCommandItem({
    id: "boardView",
    label: "Board view",
    keywords: ["board", "view", "kanban", "database"],
    icon: Kanban,
  }),
  createSlashCommandItem({
    id: "galleryView",
    label: "Gallery view",
    keywords: ["gallery", "view", "database"],
    icon: GalleryHorizontal,
  }),
  createSlashCommandItem({
    id: "listView",
    label: "List view",
    keywords: ["list", "view", "database"],
    icon: Rows3,
  }),
  createSlashCommandItem({
    id: "feedView",
    label: "Feed view",
    keywords: ["feed", "view", "database"],
    icon: Rss,
  }),
  createSlashCommandItem({
    id: "dashboardView",
    label: "Dashboard view",
    keywords: ["dashboard", "view", "database"],
    icon: LayoutDashboard,
    isNew: true,
  }),
  createSlashCommandItem({
    id: "calendarView",
    label: "Calendar view",
    keywords: ["calendar", "view", "database"],
    icon: Calendar,
    disabled: true,
  }),
]);

const textColor = createSlashCommandGroup(
  "text-color",
  "Text color",
  TEXT_COLORS.map(({ id, label, hex }) =>
    createSlashCommandItem({
      id,
      label,
      keywords: ["color", "text", label.toLowerCase()],
      icon: createTextColorIcon(hex),
      swatchColor: hex,
    }),
  ),
);

const backgroundColor = createSlashCommandGroup(
  "background-color",
  "Background color",
  BACKGROUND_COLORS.map(({ id, label, hex }) =>
    createSlashCommandItem({
      id,
      label,
      keywords: ["color", "background", label.toLowerCase()],
      icon: createBackgroundColorIcon(hex),
      swatchColor: hex,
    }),
  ),
);

export const defaultSlashCommandGroups: SlashCommandGroupData[] = [basicBlocks, media, database];

export const colorSlashCommandGroups: SlashCommandGroupData[] = [textColor, backgroundColor];
