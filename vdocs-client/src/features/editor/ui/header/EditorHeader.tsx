"use client";

import { ChevronDown, Link as LinkIcon, Lock, MoreHorizontal, Star, Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageIconGlyph } from "../icon-picker/PageIconGlyph";
import type { PageIcon } from "../icon-picker/PageIcon";
import { ActivityPanel, type ActivityEntry } from "./ActivityPanel";
import { MoreOptionsMenu } from "./MoreOptionsMenu";
import { SharePanel, type ShareMember, type LinkAccess, type AssignableRole } from "./SharePanel";
import { UpdatesPanel } from "./UpdatesPanel";

export interface EditorHeaderProps {
  documentId: string;
  icon?: PageIcon;
  title: string;
  placeholder?: string;
  onTitleChange?: (title: string) => void;
  isPrivate?: boolean;
  onPrivacyChange?: (isPrivate: boolean) => void;
  lastEditedLabel?: string;
  editedBy?: ActivityEntry;
  createdBy?: ActivityEntry;
  isStarred?: boolean;
  onToggleStar?: (starred: boolean) => void;
  members?: ShareMember[];
  onInvite?: (value: string, role: AssignableRole) => void;
  onCopyLink?: () => void;
  linkAccess?: LinkAccess;
  onLinkAccessChange?: (next: LinkAccess) => void;
  canManageAccess?: boolean;
  onMemberRoleChange?: (memberId: string, role: AssignableRole) => void;
  onMemberRemove?: (memberId: string) => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  wordCount?: number;
  canEdit?: boolean;
}

export function EditorHeader(props: EditorHeaderProps) {
  const {
    documentId,
    icon,
    title,
    placeholder,
    onTitleChange,
    isPrivate = true,
    onPrivacyChange,
    lastEditedLabel,
    editedBy,
    createdBy,
    isStarred = false,
    onToggleStar,
    members = [],
    onInvite,
    onCopyLink,
    linkAccess = "NONE",
    onLinkAccessChange,
    canManageAccess = false,
    onMemberRoleChange,
    onMemberRemove,
    onRename,
    onDuplicate,
    onDelete,
    wordCount,
    canEdit = true,
  } = props;

  const t = useTranslations("editorHeader");
  const [starred, setStarred] = useState(isStarred);
  const [updatesSidebarOpen, setUpdatesSidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputWidth, setInputWidth] = useState<number | null>(null);

  const handleToggleStar = () => {
    const next = !starred;
    setStarred(next);
    onToggleStar?.(next);
  };

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const style = window.getComputedStyle(el);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    setInputWidth(Math.ceil(ctx.measureText(title || placeholder || " ").width) + 4);
  }, [title, placeholder]);

  return (
    <>
    <header className="flex h-11 items-center justify-between gap-2 border-b border-border bg-background px-4 text-sm">
      <div className="flex min-w-0 items-center gap-1">
        {icon && (
          <span className="shrink-0 leading-none">
            <PageIconGlyph
              icon={icon}
              emojiClassName="text-base leading-none"
              iconClassName="h-3.5 w-3.5"
              imageClassName="h-3.5 w-3.5 rounded object-cover"
            />
          </span>
        )}

        <input
          ref={inputRef}
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          placeholder={placeholder}
          readOnly={!canEdit}
          style={{
            width: inputWidth ? `${inputWidth}px` : `${Math.max((title || placeholder || "").length, 1)}ch`,
          }}
          className="max-w-xs min-w-0 shrink-0 truncate bg-transparent font-medium text-foreground outline-none placeholder:text-muted-foreground"
          aria-label={t("documentNameLabel")}
        />

        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              {isPrivate ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              <span>{isPrivate ? t("private") : t("public")}</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuItem onClick={() => onPrivacyChange?.(true)}>
                <Lock className="h-4 w-4" />
                {t("private")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrivacyChange?.(false)}>
                <Globe className="h-4 w-4" />
                {t("public")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Popover>
          <PopoverTrigger
            openOnHover
            delay={300}
            onClick={() => setUpdatesSidebarOpen(true)}
            render={
              <button
                type="button"
                className="hidden shrink-0 rounded-md px-1 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground sm:inline"
              >
                {lastEditedLabel ?? t("editedJustNow")}
              </button>
            }
          />
          <PopoverContent align="end" sideOffset={8}>
            <ActivityPanel editedBy={editedBy} createdBy={createdBy} />
          </PopoverContent>
        </Popover>

        {canEdit && (
          <Popover>
            <PopoverTrigger
              render={
                <Button variant="default" size="sm">
                  <Lock className="h-3.5 w-3.5" />
                  {t("share")}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <PopoverContent align="end" sideOffset={8}>
              <SharePanel
                members={members}
                onInvite={onInvite}
                onCopyLink={onCopyLink}
                linkAccess={linkAccess}
                onLinkAccessChange={onLinkAccessChange}
                canManageAccess={canManageAccess}
                onMemberRoleChange={onMemberRoleChange}
                onMemberRemove={onMemberRemove}
              />
            </PopoverContent>
          </Popover>
        )}

        {canEdit && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon" aria-label={t("copyLink")} onClick={onCopyLink}>
                  <LinkIcon className="h-4 w-4" />
                </Button>
              }
            />
            <TooltipContent>{t("copyLink")}</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={starred ? t("unstar") : t("star")}
                aria-pressed={starred}
                onClick={handleToggleStar}
              >
                <Star className={starred ? "h-4 w-4 fill-current text-yellow-500" : "h-4 w-4"} />
              </Button>
            }
          />
          <TooltipContent>{starred ? t("unstar") : t("star")}</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon" aria-label={t("moreOptions")}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  }
                />
              }
            />
            <TooltipContent>{t("moreOptions")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end" className="w-auto min-w-0 p-0">
            <MoreOptionsMenu
              onCopyLink={onCopyLink}
              onRename={onRename}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
              onOpenUpdates={() => setUpdatesSidebarOpen(true)}
              onOpenVersionHistory={() => setUpdatesSidebarOpen(true)}
              wordCount={wordCount}
              canEdit={canEdit}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    {!canEdit && (
      <div className="flex items-center justify-center gap-2 bg-blue-50 px-4 py-2 text-center text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">
        {t("viewOnlyBanner")}
      </div>
    )}
    {updatesSidebarOpen && (
      <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-full border-l border-border bg-background shadow-xl">
        <UpdatesPanel
          documentId={documentId}
          documentTitle={title}
          onClose={() => setUpdatesSidebarOpen(false)}
        />
      </div>
    )}
    </>
  );
}
