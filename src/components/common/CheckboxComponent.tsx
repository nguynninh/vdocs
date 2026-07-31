"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface CheckboxComponentProps
  extends Omit<React.ComponentProps<typeof Checkbox>, "children" | "style"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  textSize?: React.CSSProperties["fontSize"];
  width?: React.CSSProperties["width"];
  style?: React.CSSProperties;
}

const CheckboxComponent = React.forwardRef<
  React.ElementRef<typeof Checkbox>,
  CheckboxComponentProps
>(
  (
    {
      label,
      description,
      error,
      className,
      containerClassName,
      labelClassName,
      textSize = "14px",
      width = "100%",
      id,
      disabled,
      style,
      ...props
    },
    ref
  ) => {
    const reactId = React.useId();
    const checkboxId = id ?? reactId;
    const hasDescription = Boolean(description);
    const hasError = Boolean(error);
    const hasSupportingText = hasDescription || hasError;
    const descriptionId = hasDescription ? `${checkboxId}-description` : undefined;
    const errorId = hasError ? `${checkboxId}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <label
        htmlFor={checkboxId}
        className={cn(
          "flex w-full gap-3 rounded-lg text-sm",
          hasSupportingText ? "items-start" : "items-center",
          disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer",
          containerClassName
        )}
        style={{ width, ...style }}
      >
        <Checkbox
          ref={ref}
          id={checkboxId}
          disabled={disabled}
          aria-describedby={describedBy}
          aria-invalid={hasError || props["aria-invalid"] ? true : undefined}
          className={cn(hasSupportingText && "mt-0.5", "rounded-[4px]", className)}
          {...props}
        />

        <span className="flex min-w-0 flex-1 flex-col gap-1">
          {label && (
            <span
              className={cn("font-medium leading-5 text-foreground", labelClassName)}
              style={{ fontSize: textSize }}
            >
              {label}
            </span>
          )}

          {description && (
            <span
              id={descriptionId}
              className="leading-5 text-muted-foreground"
              style={{ fontSize: textSize }}
            >
              {description}
            </span>
          )}

          {error && (
            <span
              id={errorId}
              className="leading-5 text-[#FF3D00]"
              style={{ fontSize: textSize }}
            >
              {error}
            </span>
          )}
        </span>
      </label>
    );
  }
);

CheckboxComponent.displayName = "CheckboxComponent";

export default CheckboxComponent;
