"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "markmap-lib";
import { Markmap as MarkmapView } from "markmap-view";
import { Bleed } from "nextra/components";

const transformer = new Transformer();

export function Markmap({ content }: { content: string }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    const { root } = transformer.transform(content);
    const mm = MarkmapView.create(
      svgRef.current,
      {
        duration: 0,
        maxInitialScale: 3,
        fitRatio: 0.9,
        zoom: false,
        pan: false,
      },
      root,
    );
    return () => {
      mm.destroy();
    };
  }, [content]);

  return (
    <Bleed full>
      <svg
        ref={svgRef}
        className="vdocs-markmap"
        style={{
          width: "100%",
          height: "900px",
          fontSize: "18px",
        }}
      />
    </Bleed>
  );
}
