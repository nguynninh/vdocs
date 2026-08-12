"use client";

import { CodeBlock } from "../../blocks/code-block/CodeBlock";
import { ChildDocumentsView } from "../../blocks/child-documents/ChildDocumentsView";
import { DividerView } from "../../blocks/divider/DividerView";
import { FileBlock } from "../../blocks/file/FileBlock";
import { ImageBlock } from "../../blocks/image/ImageBlock";
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
    case "todoListItem":
    case "quote":
      return <TextBlockView block={block} isFirst={isFirst} />;
    case "codeBlock":
      return <CodeBlock block={block} isFirst={isFirst} />;
    case "divider":
      return <DividerView block={block} isFirst={isFirst} />;
    case "table":
      return <TableView block={block} isFirst={isFirst} />;
    case "childDocuments":
      return <ChildDocumentsView block={block} />;
    case "file":
      return <FileBlock block={block} isFirst={isFirst} />;
    case "image":
      return <ImageBlock block={block} isFirst={isFirst} />;
    default:
      return null;
  }
}
