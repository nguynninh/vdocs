"use client";

import { ImagePlus, SmilePlus } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import DocumentComments from "./DocumentComments";

interface DocumentToolbarProps {
  documentId: string;
  onAddIcon?: () => void;
  onAddCover?: () => void;
  className?: string;
}

export default function DocumentToolbar({
  documentId,
  onAddIcon,
  onAddCover,
  className,
}: DocumentToolbarProps) {
  const { t } = useLocale();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAddIcon}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <SmilePlus className="h-4 w-4" />
        {t("document.toolbar.addIcon")}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAddCover}
        className="gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <ImagePlus className="h-4 w-4" />
        {t("document.toolbar.addCover")}
      </Button>
      <DocumentComments documentId={documentId} />
    </div>
  );
}
