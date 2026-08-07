"use client";

import { useState } from "react";

import type { BlockNode } from "../../engine/block/block.types";
import { useEditor } from "../../react/EditorProvider";
import { ImageDialog } from "../../ui/dialogs/ImageDialog";
import { ImageEditor } from "./ImageEditor";
import { ImagePlaceholder } from "./ImagePlaceholder";

export interface ImageBlockProps {
  block: BlockNode;
  isFirst: boolean;
}

export function ImageBlock({ block }: ImageBlockProps) {
  const { documentId, setBlockImageData, canEdit } = useEditor();
  const [isReplacing, setIsReplacing] = useState(false);

  if (!block.image?.url) {
    return (
      <ImagePlaceholder
        documentId={documentId}
        canEdit={canEdit}
        onUploaded={(image) => setBlockImageData(block.id, image)}
      />
    );
  }

  return (
    <div className="relative">
      <ImageEditor
        image={block.image}
        canEdit={canEdit}
        onChange={(image) => setBlockImageData(block.id, image)}
        onReplace={() => setIsReplacing(true)}
      />
      {isReplacing ? (
        <ImageDialog
          documentId={documentId}
          onSelect={(image) => {
            setBlockImageData(block.id, { ...image, align: block.image?.align, width: block.image?.width });
            setIsReplacing(false);
          }}
          onClose={() => setIsReplacing(false)}
        />
      ) : null}
    </div>
  );
}
