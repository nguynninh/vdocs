"use client";

import {
  AppWindow,
  ArrowRightLeft,
  BarChart3,
  Bell,
  ChevronRight,
  Clipboard,
  Copy,
  Download,
  FolderInput,
  Grid2x2,
  History,
  Languages,
  Link as LinkIcon,
  Lock,
  PenLine,
  Search,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  Type,
  Undo2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEditor } from "../../react/EditorProvider";

export interface MoreOptionsMenuProps {
  onCopyLink?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onOpenUpdates?: () => void;
  onOpenVersionHistory?: () => void;
  onImport?: () => void;
  wordCount?: number;
  canEdit?: boolean;
}

function ToggleRow({
  icon: Icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className="group/dropdown-menu-item flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm select-none hover:bg-accent hover:text-accent-foreground"
    >
      <Icon className="size-4 shrink-0" />
      <span className="flex-1">{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </span>
    </div>
  );
}

export function MoreOptionsMenu(props: MoreOptionsMenuProps) {
  const {
    onCopyLink,
    onRename,
    onDuplicate,
    onDelete,
    onOpenUpdates,
    onOpenVersionHistory,
    onImport,
    wordCount = 0,
    canEdit = true,
  } = props;
  const t = useTranslations("editorHeader.moreOptionsMenu");

  const { fullWidth, setFullWidth, fontStyle, setFontStyle, smallText, setSmallText } = useEditor();
  const [lockPage, setLockPage] = useState(false);

  if (!canEdit) {
    return (
      <div className="w-72">
        <div className="p-1.5">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("searchActions")} className="h-8 pl-7 text-sm" />
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="p-1.5">
          <DropdownMenuItem onClick={onCopyLink}>
            <LinkIcon className="size-4" />
            {t("copyLink")}
            <DropdownMenuShortcut>⌘⌥L</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Clipboard className="size-4" />
            {t("copyPageContents")}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>
            <PenLine className="size-4" />
            {t("suggestEdits")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Upload className="size-4" />
            {t("export")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Bell className="size-4" />
            {t("notifyMe")}
            <DropdownMenuShortcut>{t("comments")}</DropdownMenuShortcut>
            <ChevronRight className="size-4" />
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive">
            <Trash2 className="size-4" />
            {t("reportPage")}
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="p-1.5">
          <DropdownMenuItem>
            <SlidersHorizontal className="size-4" />
            {t("cookieSettings")}
          </DropdownMenuItem>
          <DropdownMenuItem>
            <AppWindow className="size-4" />
            {t("openInMacApp")}
          </DropdownMenuItem>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72">
      <div className="p-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={t("searchActions")} className="h-8 pl-7 text-sm" />
        </div>
      </div>

      <DropdownMenuSeparator />

      <div className="grid grid-cols-3 gap-1 p-1.5">
        {(["default", "serif", "mono"] as const).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => setFontStyle(style)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md py-1.5 text-xs hover:bg-accent",
              fontStyle === style ? "text-primary" : "text-muted-foreground",
              style === "serif" && "font-serif",
              style === "mono" && "font-mono"
            )}
          >
            <span className="text-base font-medium">Ag</span>
            {t(`fontStyles.${style}`)}
          </button>
        ))}
      </div>

      <DropdownMenuSeparator />

      <div className="p-1.5">
        <DropdownMenuItem onClick={onCopyLink}>
          <LinkIcon className="size-4" />
          {t("copyLink")}
          <DropdownMenuShortcut>⌘⌥L</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Clipboard className="size-4" />
          {t("copyPageContents")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}>
          <Copy className="size-4" />
          {t("duplicate")}
          <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FolderInput className="size-4" />
          {t("moveTo")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}>
          <Trash2 className="size-4" />
          {t("moveToTrash")}
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator />

      <div className="p-1.5">
        <ToggleRow icon={Type} label={t("smallText")} checked={smallText} onCheckedChange={setSmallText} />
        <ToggleRow
          icon={ArrowRightLeft}
          label={t("fullWidth")}
          checked={fullWidth}
          onCheckedChange={setFullWidth}
        />
        <DropdownMenuItem>
          <SlidersHorizontal className="size-4" />
          {t("customizePage")}
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator />

      <div className="p-1.5">
        <ToggleRow icon={Lock} label={t("lockPage")} checked={lockPage} onCheckedChange={setLockPage} />
        <DropdownMenuItem>
          <Sparkles className="size-4" />
          {t("useWithAi")}
          <ChevronRight className="ml-auto size-4" />
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator />

      <div className="p-1.5">
        <DropdownMenuItem onClick={onRename}>
          <PenLine className="size-4" />
          {t("suggestEdits")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Languages className="size-4" />
          {t("translate")}
          <ChevronRight className="ml-auto size-4" />
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator />

      <div className="p-1.5">
        <DropdownMenuItem>
          <Undo2 className="size-4" />
          {t("undo")}
          <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onImport}>
          <Download className="size-4" />
          {t("import")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Upload className="size-4" />
          {t("export")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Grid2x2 className="size-4" />
          {t("turnIntoWiki")}
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator />

      <div className="p-1.5">
        <DropdownMenuItem onClick={onOpenUpdates}>
          <BarChart3 className="size-4" />
          {t("updatesAndAnalytics")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenVersionHistory}>
          <History className="size-4" />
          {t("versionHistory")}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Bell className="size-4" />
          {t("notifyMe")}
          <DropdownMenuShortcut>{t("comments")}</DropdownMenuShortcut>
          <ChevronRight className="size-4" />
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Grid2x2 className="size-4" />
          {t("connections")}
          <DropdownMenuShortcut>{t("none")}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <AppWindow className="size-4" />
          {t("openInMacApp")}
        </DropdownMenuItem>
      </div>

      <DropdownMenuSeparator />

      <div className="px-3 py-2 text-xs text-muted-foreground">
        {t("wordCount", { count: wordCount })}
      </div>
    </div>
  );
}
