"use client";

import {
  Copy,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  MessageSquare,
  Palette,
  Plus,
  Quote,
  Sparkles,
  SquarePen,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BlockNode, BlockType } from "../../engine/block/block.types";
import { useEditor } from "../EditorProvider";

export interface BlockGutterControlsProps {
  block: BlockNode;
  selectedBlockIds?: string[];
  onHandleDragStart?: (event: React.DragEvent) => void;
  onHandleDragEnd?: () => void;
}

const TURN_INTO_OPTIONS: Array<{ type: BlockType; label: string; icon: typeof Type }> = [
  { type: "paragraph", label: "Text", icon: Type },
  { type: "heading1", label: "Heading 1", icon: Heading1 },
  { type: "heading2", label: "Heading 2", icon: Heading2 },
  { type: "heading3", label: "Heading 3", icon: Heading3 },
  { type: "bulletedListItem", label: "Bulleted list", icon: List },
  { type: "numberedListItem", label: "Numbered list", icon: ListOrdered },
  { type: "todoListItem", label: "To-do list", icon: ListTodo },
  { type: "quote", label: "Quote", icon: Quote },
];

// Colors aren't part of BlockNode yet (see engine/block/block.types.ts), so
// these entries render as disabled placeholders rather than wired actions —
// picking one is a no-op until the engine grows a color field.
const COLOR_OPTIONS = [
  "Default",
  "Gray",
  "Brown",
  "Orange",
  "Yellow",
  "Green",
  "Blue",
  "Purple",
  "Pink",
  "Red",
];

export function BlockGutterControls({
  block,
  selectedBlockIds,
  onHandleDragStart,
  onHandleDragEnd,
}: BlockGutterControlsProps) {
  const t = useTranslations("editorContent");
  const {
    insertBlockAfterFocused,
    convertBlockType,
    convertBlockTypeForBlocks,
    duplicateBlock,
    duplicateBlocks,
    removeBlock,
    removeBlocks,
    canEdit,
  } = useEditor();

  if (!canEdit) return null;

  // A drag-highlight selection spanning this block means the menu's actions
  // should apply to every selected block, not just the one whose gutter icon
  // was clicked — otherwise "Turn into" etc. only ever affects one block.
  const isMultiSelected = (selectedBlockIds?.length ?? 0) > 1 && selectedBlockIds!.includes(block.id);
  const targetIds = isMultiSelected ? selectedBlockIds! : [block.id];

  return (
    <div
      data-block-gutter
      className="absolute left-0 top-0 flex h-full -translate-x-full items-start gap-0.5 pr-1 pt-1 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <button
        type="button"
        aria-label={t("gutterAddBlock")}
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        onClick={() => insertBlockAfterFocused(block.id)}
      >
        <Plus className="size-4" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={t("gutterOpenMenu")}
          draggable
          onDragStart={onHandleDragStart}
          onDragEnd={onHandleDragEnd}
          className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <GripVertical className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="bottom" className="w-64">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Type className="size-4" />
              {t("gutterTurnInto")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TURN_INTO_OPTIONS.map(({ type, label, icon: Icon }) => (
                <DropdownMenuItem
                  key={type}
                  onClick={() =>
                    isMultiSelected
                      ? convertBlockTypeForBlocks(targetIds, type)
                      : convertBlockType(block.id, type)
                  }
                >
                  <Icon className="size-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="size-4" />
              {t("gutterColor")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {COLOR_OPTIONS.map((label) => (
                <DropdownMenuItem key={label} disabled>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem disabled>
            <Copy className="size-4" />
            {t("gutterCopyLink")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => (isMultiSelected ? duplicateBlocks(targetIds) : duplicateBlock(block.id))}
          >
            <Copy className="size-4" />
            {t("gutterDuplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <SquarePen className="size-4" />
            {t("gutterMoveTo")}
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => (isMultiSelected ? removeBlocks(targetIds) : removeBlock(block.id))}
          >
            <Trash2 className="size-4" />
            {t("gutterDelete")}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem disabled>
            <MessageSquare className="size-4" />
            {t("gutterComment")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Wand2 className="size-4" />
            {t("gutterSuggestEdits")}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Sparkles className="size-4" />
            {t("gutterAskAi")}
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled>
              <Wand2 className="size-4" />
              {t("gutterSkills")}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent />
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
