"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ImageComponent from "./ImageComponent";

interface Props extends Omit<React.ComponentProps<typeof Input>, "prefix"> {
  prefix?: React.ReactNode;
  allowClear?: boolean;
  containerClassName?: string;
  status?: "default" | "error";
  width?: React.CSSProperties["width"];
  height?: React.CSSProperties["height"];
}

const InputComponent = ({
  width,
  height,
  type = "text",
  prefix,
  allowClear = false,
  containerClassName,
  status = "default",
  className,
  style,
  value,
  defaultValue,
  onChange,
  ...props
}: Props) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [innerValue, setInnerValue] = React.useState(
    typeof defaultValue === "string" ? defaultValue : ""
  );
  const [showPassword, setShowPassword] = React.useState(false);

  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value ?? "") : innerValue;
  const isPasswordField = type === "password";
  const inputType = isPasswordField && showPassword ? "text" : type;
  const showClear = !isPasswordField && allowClear && currentValue.length > 0;
  const hasRightActions = showClear || isPasswordField;
  const rightActionCount = Number(showClear) + Number(isPasswordField);
  const containerStyle = {
    width: width ?? "100%",
    height,
    ...style,
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInnerValue(event.target.value);
    }

    onChange?.(event);
  };

  const handleClear = () => {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    if (!isControlled) {
      setInnerValue("");
    }

    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;

    valueSetter?.call(input, "");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };

  return (
    <div
      className={cn(
        "group relative flex w-full items-center rounded-lg border bg-background transition-colors",
        status === "error"
          ? "border-[#FF3D00] focus-within:border-[#FF3D00] focus-within:ring-3 focus-within:ring-[#FF3D00]/15"
          : "border-input focus-within:border-[#0065FF] focus-within:ring-3 focus-within:ring-[#0065FF]/15 hover:border-foreground/20",
        containerClassName,
        className
      )}
      style={containerStyle}
    >
      {prefix && (
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          {prefix}
        </span>
      )}

      <Input
        key={inputType}
        ref={inputRef}
        type={inputType}
        value={isControlled ? value : innerValue}
        defaultValue={isControlled ? undefined : defaultValue}
        onChange={handleChange}
        className={cn(
          "relative z-0 h-full min-h-11 ml-2 rounded-lg border-0 bg-transparent px-3.5 text-sm shadow-none ring-0 placeholder:text-muted-foreground/90 focus-visible:border-0 focus-visible:ring-0 md:text-sm",
          prefix && "pl-9",
          rightActionCount === 1 && "pr-14",
          rightActionCount === 2 && "pr-24",
        )}
        aria-invalid={status === "error" || props["aria-invalid"] ? true : undefined}
        {...props}
      />

      {hasRightActions && (
        <div className="absolute right-3 top-1/2 z-20 flex -translate-y-1/2 items-center gap-1">
          {showClear && (
            <button
              type="button"
              aria-label="Clear input"
              onPointerDown={(event) => event.preventDefault()}
              onClick={handleClear}
              className="relative flex cursor-pointer touch-manipulation items-center justify-center rounded-full text-sm leading-none text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ImageComponent
                  className="pointer-events-none select-none"
                  src="/icons/ic_clean.svg"
                  alt="Hide password"
                  width={18}
                  height={18}
                  draggable={false}
                />
            </button>
          )}

          {isPasswordField && (
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => setShowPassword((prev) => !prev)}
              className="relative flex h-9 w-9 cursor-pointer touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              {showPassword ? (
                <ImageComponent
                  className="pointer-events-none select-none"
                  src="/icons/ic_eye_slash.svg"
                  alt="Hide password"
                  width={18}
                  height={18}
                  draggable={false}
                />
              ) : (
                <ImageComponent
                  className="pointer-events-none select-none"
                  src="/icons/ic_eye.svg"
                  alt="Show password"
                  width={18}
                  height={18}
                  draggable={false}
                />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default InputComponent;
