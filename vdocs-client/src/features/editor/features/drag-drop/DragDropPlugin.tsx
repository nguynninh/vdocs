"use client";

import { useCallback, useState } from "react";

import { uploadAndBuildImageData } from "../../blocks/image/image.upload";
import { useEditor } from "../../react/EditorProvider";

export interface DragDropPluginProps {
  children: React.ReactNode;
}

// Editor-wide drop target for image files dropped anywhere over the
// document (not just inside a block's own dropzone). Uploads the file and
// inserts a fresh `image` block right after whichever block was under the
// pointer, or at the end of the document if the drop landed outside any block.
export function DragDropPlugin({ children }: DragDropPluginProps) {
  const { documentId, canEdit, state, insertImageBlockAfter } = useEditor();
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const findAnchorBlockId = useCallback(
    (target: EventTarget | null): string | undefined => {
      const blockEl = (target as HTMLElement | null)?.closest<HTMLElement>("[data-block-index]");
      const blocks = state.document.blocks;
      if (blockEl) {
        const index = Number(blockEl.dataset.blockIndex);
        return blocks[index]?.id ?? blocks[blocks.length - 1]?.id;
      }
      return blocks[blocks.length - 1]?.id;
    },
    [state.document.blocks],
  );

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit || !event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = () => setIsDraggingOver(false);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit) return;
    const file = Array.from(event.dataTransfer.files).find((item) => item.type.startsWith("image/"));
    if (!file) return;

    event.preventDefault();
    setIsDraggingOver(false);

    const anchorBlockId = findAnchorBlockId(event.target);
    if (!anchorBlockId) return;

    const { data } = await uploadAndBuildImageData(documentId, file);
    if (data) insertImageBlockAfter(anchorBlockId, data);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={isDraggingOver ? "outline outline-2 outline-primary/50 -outline-offset-2" : undefined}
    >
      {children}
    </div>
  );
}
