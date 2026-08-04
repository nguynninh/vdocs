"use client";

import * as React from "react";

import AutoGrowTextarea from "@/components/common/AutoGrowTextarea";
import { cn } from "@/lib/utils";

interface DocumentTitleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder: string;
  className?: string;
}

const DocumentTitleInput = React.forwardRef<HTMLTextAreaElement, DocumentTitleInputProps>(
  ({ value, onChange, onSubmit, placeholder, className }, ref) => {
    return (
      <AutoGrowTextarea
        ref={ref}
        value={value}
        onValueChange={onChange}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onSubmit?.();
          }
        }}
        className={cn(
          "text-4xl font-bold text-foreground placeholder:text-muted-foreground/40",
          className
        )}
      />
    );
  }
);

DocumentTitleInput.displayName = "DocumentTitleInput";

export default DocumentTitleInput;
