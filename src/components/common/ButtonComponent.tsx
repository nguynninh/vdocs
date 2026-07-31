"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonType = "default" | "primary" | "dashed" | "text" | "link";

interface ButtonComponentProps
  extends Omit<React.ComponentProps<"button">, "type"> {
  type?: ButtonType;
  htmlType?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  block?: boolean;
  loading?: boolean;
}

const typeClasses: Record<ButtonType, string> = {
  default:
    "border border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50",
  primary:
    "border border-[#0065FF] bg-[#0065FF] text-white shadow-[0_8px_20px_rgba(0,101,255,0.18)] hover:bg-[#0057DB] hover:border-[#0057DB]",
  dashed:
    "border border-dashed border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50",
  text: "border border-transparent bg-transparent text-slate-900 shadow-none hover:bg-slate-100",
  link: "border border-transparent bg-transparent px-0 text-[#0065FF] shadow-none hover:text-[#0057DB]",
};

const ButtonComponent = React.forwardRef<HTMLButtonElement, ButtonComponentProps>(
  (
    {
      type = "default",
      htmlType = "button",
      block = false,
      loading = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={htmlType}
        disabled={disabled || loading}
        className={cn(
          "inline-flex h-12 items-center justify-center rounded-lg px-6 text-xl font-bold transition-colors outline-none focus-visible:ring-4 focus-visible:ring-[#0065FF]/20 disabled:cursor-not-allowed disabled:opacity-60",
          block && "flex w-full",
          typeClasses[type],
          className
        )}
        {...props}
      >
        {loading ? "Loading..." : children}
      </button>
    );
  }
);

ButtonComponent.displayName = "ButtonComponent";

export default ButtonComponent;
