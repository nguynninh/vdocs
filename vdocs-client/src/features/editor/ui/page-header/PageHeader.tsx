"use client";

import { Image as ImageIcon, MessageSquarePlus, Smile } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useEditor } from "../../react/EditorProvider";
import { IconPickerPopover } from "../icon-picker/IconPickerPopover";
import { PageIconGlyph } from "../icon-picker/PageIconGlyph";
import type { PageIcon } from "../icon-picker/PageIcon";

export interface PageHeaderProps {
  icon?: PageIcon;
  onIconSelect: (icon: PageIcon) => void;
  onIconRemove: () => void;
  hasCover: boolean;
  onAddCover: () => void;
  onAddComment: () => void;
  title: string;
  placeholder?: string;
  onTitleChange: (title: string) => void;
}

export function PageHeader({
  icon,
  onIconSelect,
  onIconRemove,
  hasCover,
  onAddCover,
  onAddComment,
  title,
  placeholder,
  onTitleChange,
}: PageHeaderProps) {
  const t = useTranslations("editorContent");
  const { canEdit } = useEditor();
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const handleIconSelect = (nextIcon: PageIcon) => {
    onIconSelect(nextIcon);
    setIconPickerOpen(false);
  };

  const handleIconRemove = () => {
    onIconRemove();
    setIconPickerOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col px-24 pt-8">
      {hasCover && <div className="-mx-24 mb-6 h-40 bg-gradient-to-br from-sky-200 to-indigo-200" />}

      {canEdit && (
        <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
          {!icon && (
            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <PopoverTrigger
                render={
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
                  >
                    <Smile className="h-3.5 w-3.5" />
                    {t("addIcon")}
                  </button>
                }
              />
              <PopoverContent align="start" sideOffset={8} className="w-auto p-0">
                <IconPickerPopover hasIcon={false} onSelect={handleIconSelect} onRemove={handleIconRemove} />
              </PopoverContent>
            </Popover>
          )}

          {!hasCover && (
            <button
              type="button"
              onClick={onAddCover}
              className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              {t("addCover")}
            </button>
          )}

          <button
            type="button"
            onClick={onAddComment}
            className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
          >
            <MessageSquarePlus className="h-3.5 w-3.5" />
            {t("addComment")}
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        {icon && (
          canEdit ? (
            <Popover open={iconPickerOpen} onOpenChange={setIconPickerOpen}>
              <PopoverTrigger
                render={
                  <button type="button" className="rounded-md leading-none hover:bg-muted">
                    <PageIconGlyph
                      icon={icon}
                      emojiClassName="text-5xl leading-none"
                      iconClassName="h-12 w-12"
                      imageClassName="h-12 w-12 rounded object-cover"
                    />
                  </button>
                }
              />
              <PopoverContent align="start" sideOffset={8} className="w-auto p-0">
                <IconPickerPopover hasIcon onSelect={handleIconSelect} onRemove={handleIconRemove} />
              </PopoverContent>
            </Popover>
          ) : (
            <PageIconGlyph
              icon={icon}
              emojiClassName="text-5xl leading-none"
              iconClassName="h-12 w-12"
              imageClassName="h-12 w-12 rounded object-cover"
            />
          )
        )}

        <input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={placeholder}
          readOnly={!canEdit}
          className="w-full bg-transparent text-4xl font-bold text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}
