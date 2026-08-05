"use client";

import { Carrot, Flag, Grid2x2, History, Lightbulb, Plane, Search, Shuffle, Smile, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useRef, useState, type ChangeEvent } from "react";

import { EMOJI_CATEGORIES } from "../../features/emoji";
import { EmojiGrid } from "./EmojiGrid";
import { ICON_OPTIONS } from "./icon.data";
import type { PageIcon } from "./PageIcon";

export interface IconPickerPopoverProps {
  hasIcon: boolean;
  onSelect: (icon: PageIcon) => void;
  onRemove: () => void;
}

type Tab = "emoji" | "icons" | "upload";

const CATEGORY_NAV: Array<{ id: string; Icon: typeof Smile }> = [
  { id: "people", Icon: Smile },
  { id: "food", Icon: Carrot },
  { id: "activity", Icon: Trophy },
  { id: "travel", Icon: Plane },
  { id: "objects", Icon: Lightbulb },
  { id: "flags", Icon: Flag },
];

export function IconPickerPopover({ hasIcon, onSelect, onRemove }: IconPickerPopoverProps) {
  const t = useTranslations("iconPicker");
  const [tab, setTab] = useState<Tab>("emoji");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const filteredEmojis = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return EMOJI_CATEGORIES.flatMap((category) =>
      category.emojis.filter((emoji) => emoji.keywords.some((keyword) => keyword.includes(normalized))),
    ).map((emoji) => emoji.char);
  }, [query]);

  const selectEmoji = (value: string) => {
    setRecent((prev) => [value, ...prev.filter((item) => item !== value)].slice(0, 9));
    onSelect({ kind: "emoji", value });
  };

  const handleShuffle = () => {
    const all = EMOJI_CATEGORIES.flatMap((category) => category.emojis);
    const random = all[Math.floor(Math.random() * all.length)];
    if (random) selectEmoji(random.char);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        onSelect({ kind: "upload", src: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const scrollToCategory = (id: string) => {
    categoryRefs.current[id]?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <div className="w-80">
      <div className="flex items-center justify-between border-b border-border px-3 pt-2">
        <div className="flex gap-4 text-sm">
          {(["emoji", "icons", "upload"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`pb-2 ${
                tab === value
                  ? "border-b-2 border-foreground font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(value)}
            </button>
          ))}
        </div>

        {hasIcon && (
          <button
            type="button"
            onClick={onRemove}
            className="pb-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("remove")}
          </button>
        )}
      </div>

      {tab === "emoji" && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border p-2">
            <div className="flex flex-1 items-center gap-1.5 rounded-md border border-input px-2 py-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("filterPlaceholder")}
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleShuffle}
              aria-label={t("shuffle")}
              className="rounded-md p-1.5 hover:bg-muted"
            >
              <Shuffle className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-72 overflow-y-auto p-2">
            {filteredEmojis ? (
              <EmojiGrid emojis={filteredEmojis} onSelect={selectEmoji} />
            ) : (
              <>
                {recent.length > 0 && (
                  <EmojiGrid title={t("recent")} emojis={recent} onSelect={selectEmoji} />
                )}
                {EMOJI_CATEGORIES.map((category) => (
                  <div
                    key={category.id}
                    ref={(node) => {
                      categoryRefs.current[category.id] = node;
                    }}
                  >
                    <EmojiGrid
                      title={t(category.labelKey)}
                      emojis={category.emojis.map((emoji) => emoji.char)}
                      onSelect={selectEmoji}
                    />
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={t("recent")}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <History className="h-4 w-4" />
            </button>
            {CATEGORY_NAV.map(({ id, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToCategory(id)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("more")}
            >
              <Grid2x2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {tab === "icons" && (
        <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto p-3">
          {ICON_OPTIONS.map(({ name, Icon }) => (
            <button
              key={name}
              type="button"
              onClick={() => onSelect({ kind: "icon", name })}
              className="flex h-8 w-8 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      )}

      {tab === "upload" && (
        <div className="p-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-input p-6 text-sm text-muted-foreground hover:bg-muted">
            {t("uploadHint")}
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
      )}
    </div>
  );
}
