"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { BulletList } from "../../blocks/list/BulletList";
import { NumberedList } from "../../blocks/list/NumberedList";
import type { BlockNode, BlockType } from "../../engine/block/block.types";
import { getNumberedListIndex } from "../../engine/document/getListItemIndex";
import { EditableText } from "../editable/EditableText";
import { useEditor } from "../EditorProvider";
import { useAutoformatText } from "../hooks/useAutoformatText";

export interface TextBlockViewProps {
  block: BlockNode;
  isFirst: boolean;
}

// EditableText itself carries no typography classes, so this fully controls the
// rendered font size/weight/leading for every block type — including the default
// paragraph/list look, which used to live on EditableText's own div.
const TYPOGRAPHY_CLASS_NAMES: Record<BlockType, string> = {
  paragraph: "text-base leading-7",
  heading1: "text-3xl font-semibold leading-tight",
  heading2: "text-2xl font-semibold leading-tight",
  heading3: "text-xl font-semibold leading-snug",
  bulletedListItem: "text-base leading-7",
  numberedListItem: "text-base leading-7",
  quote: "text-base leading-7 border-l-2 border-border pl-3 italic text-foreground/90",
  codeBlock: "text-sm leading-6 rounded-md bg-muted px-3 py-2 font-mono",
  divider: "",
  table: "",
};

// "Small text" (MoreOptionsMenu toggle) shrinks each block one Tailwind step
// down rather than scaling by parent font-size, since Tailwind's text-* sizes
// are all rem-based (relative to the root, not the parent) and wouldn't
// shrink from a wrapping container alone.
const SMALL_TYPOGRAPHY_CLASS_NAMES: Record<BlockType, string> = {
  paragraph: "text-sm leading-6",
  heading1: "text-2xl font-semibold leading-tight",
  heading2: "text-xl font-semibold leading-tight",
  heading3: "text-lg font-semibold leading-snug",
  bulletedListItem: "text-sm leading-6",
  numberedListItem: "text-sm leading-6",
  quote: "text-sm leading-6 border-l-2 border-border pl-3 italic text-foreground/90",
  codeBlock: "text-xs leading-5 rounded-md bg-muted px-3 py-2 font-mono",
  divider: "",
  table: "",
};

// Every branch below renders through this one component (never a different
// component per block.type) so that converting a block's type — via a
// markdown shortcut or the slash menu — updates its className instead of
// unmounting/remounting the contentEditable node, which would drop focus and
// swallow whatever the user was mid-typing.
export function TextBlockView({ block }: TextBlockViewProps) {
  const t = useTranslations("editorContent");
  const { state, smallText, insertBlockAfterFocused, mergeBlockIntoPrevious, convertBlockType } = useEditor();
  const onChange = useAutoformatText(block);
  const [isFocused, setIsFocused] = useState(false);

  const isListItem = block.type === "bulletedListItem" || block.type === "numberedListItem";
  const showPlaceholder = block.type === "paragraph" && block.text.length === 0 && isFocused;

  const onEnter = () => {
    insertBlockAfterFocused(block.id, isListItem ? block.type : undefined);
  };

  const onBackspaceAtStart = () => {
    if (block.type === "paragraph") {
      mergeBlockIntoPrevious(block.id);
    } else {
      convertBlockType(block.id, "paragraph");
    }
  };

  const editable = (
    <div className="relative">
      <EditableText
        blockId={block.id}
        text={block.text}
        marks={block.marks}
        onChange={onChange}
        onEnter={onEnter}
        onBackspaceAtStart={onBackspaceAtStart}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {showPlaceholder && (
        <div
          className="pointer-events-none absolute inset-0 z-10 py-1 text-base leading-7"
          style={{ color: "#9ca3af" }}
        >
          {t("placeholderPrefix")} <span className="underline">{t("placeholderLink")}</span>
        </div>
      )}
    </div>
  );

  const typographyClassName = (smallText ? SMALL_TYPOGRAPHY_CLASS_NAMES : TYPOGRAPHY_CLASS_NAMES)[block.type];

  return (
    <div className={isListItem ? "flex gap-2" : ""}>
      <div className={isListItem ? `order-2 min-w-0 flex-1 ${typographyClassName}` : typographyClassName}>
        {editable}
      </div>
      {isListItem && (
        <div className="order-1 pt-1 text-base leading-7">
          {block.type === "numberedListItem" ? (
            <NumberedList index={getNumberedListIndex(state.document, block.id)} />
          ) : (
            <BulletList />
          )}
        </div>
      )}
    </div>
  );
}
