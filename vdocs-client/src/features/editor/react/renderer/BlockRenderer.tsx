"use client";

import { CodeBlock } from "../../blocks/code-block/CodeBlock";
import { DividerView } from "../../blocks/divider/DividerView";
import { TableView } from "../../blocks/table/TableView";
import type { BlockNode } from "../../engine/block/block.types";
import { TextBlockView } from "./TextBlockView";

export interface BlockRendererProps {
  block: BlockNode;
  isFirst: boolean;
}

export function BlockRenderer({ block, isFirst }: BlockRendererProps) {
  switch (block.type) {
    case "paragraph":
    case "heading1":
    case "heading2":
    case "heading3":
    case "bulletedListItem":
    case "numberedListItem":
    case "quote":
      return <TextBlockView block={block} isFirst={isFirst} />;
    case "codeBlock":
      return <CodeBlock block={block} isFirst={isFirst} />;
    case "divider":
      return <DividerView block={block} isFirst={isFirst} />;
    case "table":
      return <TableView block={block} isFirst={isFirst} />;
    default:
      return null;
  }
}
