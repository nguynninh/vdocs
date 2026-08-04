"use client";

import * as React from "react";
import {
  ChevronDown,
  Copy,
  Link as LinkIcon,
  Lock,
  MoreHorizontal,
  StretchHorizontal,
  Star,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRelativeTimeShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import DocumentActivityPopover, { type DocumentActivityItem } from "./DocumentActivityPopover";

export interface DocumentHeaderMeta {
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

interface DocumentHeaderProps {
  title: string;
  meta: DocumentHeaderMeta | null;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  saveStatusLabel?: string;
  className?: string;
  locked: boolean;
  onToggleLock: () => void;
  smallText: boolean;
  onToggleSmallText: () => void;
  fullWidth: boolean;
  onToggleFullWidth: () => void;
  onDuplicate: () => void;
  onTrash: () => void;
}

export default function DocumentHeader({
  title,
  meta,
  isFavorite,
  onToggleFavorite,
  saveStatusLabel,
  className,
  locked,
  onToggleLock,
  smallText,
  onToggleSmallText,
  fullWidth,
  onToggleFullWidth,
  onDuplicate,
  onTrash,
}: DocumentHeaderProps) {
  const { t, locale } = useLocale();
  const [trashDialogOpen, setTrashDialogOpen] = React.useState(false);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).catch(() => undefined);
  }

  function handleConfirmTrash() {
    setTrashDialogOpen(false);
    onTrash();
  }

  const editedLabel = meta
    ? `${t("document.activity.edited")} ${formatRelativeTimeShort(meta.updatedAt, t, locale)}`
    : t("document.activity.edited");

  const activity: DocumentActivityItem[] = meta
    ? [
        {
          action: "edited",
          actorName: meta.updatedBy ?? t("document.activity.unknown"),
          timeLabel: formatRelativeTimeShort(meta.updatedAt, t, locale),
        },
        {
          action: "created",
          actorName: meta.createdBy ?? t("document.activity.unknown"),
          timeLabel: formatRelativeTimeShort(meta.createdAt, t, locale),
        },
      ]
    : [];

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-11 shrink-0 items-center gap-3 border-b border-border bg-background px-4 text-sm",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        <span className="truncate font-medium text-foreground">{title || t("document.untitled")}</span>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground">
            <Lock className="h-3.5 w-3.5" />
            {t("document.visibility.private")}
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem>{t("document.visibility.private")}</DropdownMenuItem>
            <DropdownMenuItem>{t("document.visibility.shared")}</DropdownMenuItem>
            <DropdownMenuItem>{t("document.visibility.public")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex shrink-0 items-center gap-1 text-muted-foreground">
        {saveStatusLabel && (
          <span className="mr-1 whitespace-nowrap text-xs text-muted-foreground">{saveStatusLabel}</span>
        )}
        <DocumentActivityPopover label={editedLabel} activity={activity} className="mr-1" />

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap rounded-md border border-border px-2.5 py-1 text-foreground outline-none hover:bg-muted data-popup-open:bg-muted">
            {t("document.share.trigger")}
            <ChevronDown className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>{t("document.share.invitePeople")}</DropdownMenuItem>
            <DropdownMenuItem>{t("document.share.copyLink")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("document.actions.copyLink")}
          onClick={handleCopyLink}
          className="rounded-full"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t("document.actions.addToFavorites")}
          aria-pressed={isFavorite}
          onClick={onToggleFavorite}
          className="rounded-full"
        >
          <Star className={cn("h-4 w-4", isFavorite && "fill-yellow-400 text-yellow-500")} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t("document.actions.moreOptions")}
            className="flex size-8 items-center justify-center rounded-full outline-none hover:bg-muted hover:text-foreground data-popup-open:bg-muted data-popup-open:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleCopyLink}>
              <LinkIcon />
              {t("document.actions.copyLink")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy />
              {t("document.actions.duplicate")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem checked={smallText} onCheckedChange={onToggleSmallText}>
              <Type />
              {t("document.actions.smallText")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={fullWidth} onCheckedChange={onToggleFullWidth}>
              <StretchHorizontal />
              {t("document.actions.fullWidth")}
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem checked={locked} onCheckedChange={onToggleLock}>
              {locked ? <Unlock /> : <Lock />}
              {locked ? t("document.actions.unlockPage") : t("document.actions.lockPage")}
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem variant="destructive" onClick={() => setTrashDialogOpen(true)}>
              <Trash2 />
              {t("document.actions.moveToTrash")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="items-start text-left">
            <DialogTitle>{t("document.trashConfirm.title")}</DialogTitle>
            <DialogDescription>{t("document.trashConfirm.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setTrashDialogOpen(false)}>
              {t("document.trashConfirm.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmTrash}>
              {t("document.trashConfirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
