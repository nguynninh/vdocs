"use client";

import { MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEditor } from "../../react/EditorProvider";
import { CopyCodeButton } from "./CopyCodeButton";
import { LanguageSelector } from "./LanguageSelector";

export interface CodeToolbarProps {
  blockId: string;
  text: string;
  language: string;
}

export function CodeToolbar({ blockId, text, language }: CodeToolbarProps) {
  const t = useTranslations("editorContent");
  const { canEdit, setBlockCodeLanguage, duplicateBlock, removeBlock } = useEditor();

  return (
    <div className="flex items-center gap-1 rounded-md border border-border/60 bg-background/90 px-1 py-0.5 shadow-sm backdrop-blur-sm">
      <LanguageSelector
        value={language}
        onChange={(next) => setBlockCodeLanguage(blockId, next)}
        disabled={!canEdit}
      />
      <CopyCodeButton text={text} />
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={!canEdit}
          className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => duplicateBlock(blockId)}>
            {t("gutterDuplicate")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => removeBlock(blockId)}>
            {t("gutterDelete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
