import type { ComponentType } from "react";

export type SlashCommandBlockType =
  | "text"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "bulletedList"
  | "numberedList"
  | "todoList"
  | "toggleList"
  | "page"
  | "callout"
  | "quote"
  | "table"
  | "divider"
  | "linkToPage"
  | "image"
  | "video"
  | "audio"
  | "code"
  | "file"
  | "webBookmark"
  | "tableView"
  | "boardView"
  | "galleryView"
  | "listView"
  | "feedView"
  | "dashboardView"
  | "calendarView"
  | "textColorDefault"
  | "textColorGray"
  | "textColorBrown"
  | "textColorOrange"
  | "textColorYellow"
  | "textColorGreen"
  | "textColorBlue"
  | "textColorPurple"
  | "textColorPink"
  | "textColorRed"
  | "backgroundColorDefault"
  | "backgroundColorGray"
  | "backgroundColorBrown"
  | "backgroundColorOrange"
  | "backgroundColorYellow"
  | "backgroundColorGreen"
  | "backgroundColorBlue"
  | "backgroundColorPurple"
  | "backgroundColorPink"
  | "backgroundColorRed";

export interface SlashCommandItem {
  id: SlashCommandBlockType;
  label: string;
  keywords: string[];
  icon: ComponentType<{ className?: string }>;
  shortcut?: string;
  isNew?: boolean;
  swatchColor?: string;
  disabled?: boolean;
}

export interface SlashCommandGroupData {
  id: string;
  label: string;
  items: SlashCommandItem[];
}

export interface SlashCommandSelectEvent {
  item: SlashCommandItem;
}
