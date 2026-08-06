"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export interface CopyCodeButtonProps {
  text: string;
}

export function CopyCodeButton({ text }: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied or unavailable — nothing else to do here.
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-muted-foreground outline-none hover:bg-muted hover:text-foreground"
      aria-label="Copy code"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
