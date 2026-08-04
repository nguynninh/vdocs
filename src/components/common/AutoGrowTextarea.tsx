"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface AutoGrowTextareaProps
  extends Omit<React.ComponentProps<"textarea">, "rows" | "onChange" | "value"> {
  value: string;
  onValueChange: (value: string) => void;
}

const AutoGrowTextarea = React.forwardRef<HTMLTextAreaElement, AutoGrowTextareaProps>(
  ({ value, onValueChange, className, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLTextAreaElement>(null);
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

    const resize = React.useCallback(() => {
      const textarea = innerRef.current;
      if (!textarea) return;
      textarea.style.height = "0px";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }, []);

    React.useLayoutEffect(() => {
      resize();
    }, [resize, value, className]);

    React.useEffect(() => {
      const frame = requestAnimationFrame(resize);
      return () => cancelAnimationFrame(frame);
    }, [resize]);

    React.useEffect(() => {
      const textarea = innerRef.current;
      if (!textarea || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(resize);
      observer.observe(textarea);
      return () => observer.disconnect();
    }, [resize]);

    return (
      <textarea
        ref={innerRef}
        rows={1}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={cn(
          "block w-full resize-none overflow-hidden border-0 bg-transparent outline-none",
          className
        )}
        {...props}
      />
    );
  }
);

AutoGrowTextarea.displayName = "AutoGrowTextarea";

export default AutoGrowTextarea;
