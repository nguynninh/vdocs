"use client";

import * as React from "react";
import { Ban, Bold, Check, Italic, Link, Underline } from "lucide-react";

import { useLocale } from "@/components/layout/locale-provider";
import { cn } from "@/lib/utils";

import { HIGHLIGHT_COLOR_VAR, HIGHLIGHT_COLORS, type TextStyleKey } from "./blocks/richtext";
import type { HighlightColorId } from "./blocks/types";

interface HighlightToolbarProps {
  rect: DOMRect;
  onPick: (color: HighlightColorId | null) => void;
  onLink: (href: string) => void;
  onToggleStyle: (style: TextStyleKey) => void;
}

const TEXT_STYLE_BUTTONS: { style: TextStyleKey; icon: typeof Bold }[] = [
  { style: "bold", icon: Bold },
  { style: "italic", icon: Italic },
  { style: "underline", icon: Underline },
];

const TOOLBAR_MARGIN = 8;

const HighlightToolbar = React.forwardRef<HTMLDivElement, HighlightToolbarProps>(
  function HighlightToolbar({ rect, onPick, onLink, onToggleStyle }, forwardedRef) {
    const { t } = useLocale();
    const [style, setStyle] = React.useState<React.CSSProperties>({ top: rect.top, left: rect.left });
    const [linkOpen, setLinkOpen] = React.useState(false);
    const [href, setHref] = React.useState("");
    const innerRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLDivElement);

    React.useLayoutEffect(() => {
      const el = innerRef.current;
      const width = el?.offsetWidth ?? 0;
      const height = el?.offsetHeight ?? 0;

      let left = rect.left + rect.width / 2 - width / 2;
      left = Math.max(TOOLBAR_MARGIN, Math.min(left, window.innerWidth - width - TOOLBAR_MARGIN));

      const spaceAbove = rect.top;
      const placeAbove = spaceAbove >= height + TOOLBAR_MARGIN;
      const top = placeAbove ? rect.top - height - TOOLBAR_MARGIN : rect.bottom + TOOLBAR_MARGIN;

      setStyle({ top, left });
    }, [rect]);

    function submitLink() {
      if (!href.trim()) return;
      onLink(href);
      setHref("");
      setLinkOpen(false);
    }

    return (
      <div
        ref={innerRef}
        className="fixed z-50 flex items-center gap-1 rounded-md bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10"
        style={style}
      >
        {linkOpen && (
          <div className="flex h-8 items-center gap-1 rounded-md bg-background px-2 ring-1 ring-border">
            <input
              autoFocus
              type="url"
              value={href}
              onChange={(event) => setHref(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitLink();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setLinkOpen(false);
                }
              }}
              placeholder={t("document.body.link.placeholder")}
              className="h-7 w-56 bg-transparent text-xs outline-none placeholder:text-muted-foreground/60"
            />
            <button
              type="button"
              tabIndex={-1}
              title={t("document.body.link.apply")}
              onMouseDown={(event) => event.preventDefault()}
              onClick={submitLink}
              className="flex size-6 shrink-0 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Check className="size-4" />
            </button>
          </div>
        )}
        <button
          type="button"
          tabIndex={-1}
          title={t("document.body.link.add")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setLinkOpen((current) => !current)}
          className="flex size-6 shrink-0 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Link className="size-4" />
        </button>
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
        {TEXT_STYLE_BUTTONS.map(({ style, icon: Icon }) => (
          <button
            key={style}
            type="button"
            tabIndex={-1}
            title={t(`document.body.textStyle.${style}`)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onToggleStyle(style)}
            className="flex size-6 shrink-0 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Icon className="size-4" />
          </button>
        ))}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
        {HIGHLIGHT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            tabIndex={-1}
            title={t(`document.body.highlight.colors.${color}`)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(color)}
            className="flex size-6 shrink-0 items-center justify-center rounded-none hover:ring-1 hover:ring-foreground/20"
          >
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: HIGHLIGHT_COLOR_VAR[color] }}
            />
          </button>
        ))}
        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />
        <button
          type="button"
          tabIndex={-1}
          title={t("document.body.highlight.remove")}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(null)}
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-none text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Ban className="size-4" />
        </button>
      </div>
    );
  }
);

export default HighlightToolbar;
