"use client";

import type { BlockNode } from "../../engine/block/block.types";

export interface DividerViewProps {
  block: BlockNode;
  isFirst: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- keeps the shared block-view prop signature
export function DividerView(props: DividerViewProps) {
  return <hr className="my-2 border-border" />;
}
