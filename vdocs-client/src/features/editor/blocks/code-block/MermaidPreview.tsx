"use client";

import { useEffect, useRef, useState } from "react";

let mermaidIdCounter = 0;

export interface MermaidPreviewProps {
  code: string;
}

export function MermaidPreview({ code }: MermaidPreviewProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const trimmed = code.trim();
    if (!trimmed) {
      setSvg(null);
      setError(null);
      return;
    }

    const renderId = ++renderIdRef.current;

    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
        const id = `mermaid-${mermaidIdCounter++}`;
        const { svg: renderedSvg } = await mermaid.render(id, trimmed);
        if (renderIdRef.current === renderId) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err) {
        if (renderIdRef.current === renderId) {
          setSvg(null);
          setError(err instanceof Error ? err.message : "Failed to render diagram");
        }
      }
    })();
  }, [code]);

  if (!code.trim()) {
    return null;
  }

  return (
    <div className="border-t border-border bg-background px-3 py-3">
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : svg ? (
        <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="text-xs text-muted-foreground">Rendering diagram…</p>
      )}
    </div>
  );
}
