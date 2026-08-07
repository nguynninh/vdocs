"use client";

import { useState } from "react";

import type { BlockNode } from "../../engine/block/block.types";
import { EditableText } from "../../react/editable/EditableText";
import { useEditor } from "../../react/EditorProvider";
import { useAutoformatText } from "../../react/hooks/useAutoformatText";
import { CodeHighlightOverlay } from "./CodeHighlightOverlay";
import { CodeToolbar } from "./CodeToolbar";
import { DEFAULT_CODE_LANGUAGE } from "./codeBlock.languages";
import { MermaidPreview } from "./MermaidPreview";

export interface CodeBlockProps {
  block: BlockNode;
  isFirst: boolean;
}

export function CodeBlock({ block }: CodeBlockProps) {
  const { insertBlockAfterFocused, convertBlockType } = useEditor();
  const onChange = useAutoformatText(block);
  const language = block.codeLanguage ?? DEFAULT_CODE_LANGUAGE;
  const [isFocused, setIsFocused] = useState(false);
  const showHighlight = !isFocused && block.text.length > 0;

  const onEnter = () => {
    insertBlockAfterFocused(block.id);
  };

  const onBackspaceAtStart = () => {
    if (block.text.length === 0) {
      convertBlockType(block.id, "paragraph");
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-md border border-border bg-muted/40">
      <div className="absolute right-2 top-2 z-10">
        <CodeToolbar blockId={block.id} text={block.text} language={language} />
      </div>
      <div className="relative whitespace-pre-wrap px-3 py-2 pr-24 text-sm leading-6 font-mono">
        {showHighlight && (
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <CodeHighlightOverlay code={block.text} language={language} />
          </div>
        )}
        <div
          className={
            showHighlight
              ? "relative !text-transparent caret-foreground [&_*]:!text-transparent"
              : "relative"
          }
        >
          <EditableText
            blockId={block.id}
            text={block.text}
            marks={block.marks}
            onChange={onChange}
            onEnter={onEnter}
            onBackspaceAtStart={onBackspaceAtStart}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            enterInsertsNewline
          />
        </div>
      </div>
      {language === "mermaid" && <MermaidPreview code={block.text} />}
    </div>
  );
}
