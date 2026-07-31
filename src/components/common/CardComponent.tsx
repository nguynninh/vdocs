import * as React from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CardSize = "default" | "small";

interface CardComponentProps extends React.ComponentProps<"div"> {
  width?: React.CSSProperties["width"];
  height?: React.CSSProperties["height"];
  title?: React.ReactNode;
  extra?: React.ReactNode;
  cover?: React.ReactNode;
  actions?: React.ReactNode[];
  description?: React.ReactNode;
  bordered?: boolean;
  hoverable?: boolean;
  size?: CardSize;
  headClassName?: string;
  bodyClassName?: string;
}

const CardComponent = ({
  width,
  height,
  title,
  extra,
  cover,
  actions,
  description,
  bordered = true,
  hoverable = false,
  size = "default",
  className,
  style,
  headClassName,
  bodyClassName,
  children,
  ...props
}: CardComponentProps) => {
  const hasHeader = title || extra || description;
  const hasActions = Boolean(actions?.length);
  const cardStyle = {
    width,
    height,
    ...style,
  };

  return (
    <Card
      size={size === "small" ? "sm" : "default"}
      className={cn(
        "overflow-hidden rounded-2xl bg-white text-slate-900",
        bordered ? "border border-slate-200 ring-0" : "border-0 ring-0 shadow-none",
        hoverable && "transition-shadow duration-200 hover:shadow-lg",
        className
      )}
      style={cardStyle}
      {...props}
    >
      {cover && <div className="border-b border-slate-200">{cover}</div>}

      {hasHeader && (
        <CardHeader
          className={cn(
            "grid-cols-[1fr_auto] gap-x-4 gap-y-1 border-b border-slate-200 px-6 py-4",
            size === "small" && "px-4 py-3",
            headClassName
          )}
        >
          {title && (
            <CardTitle className="text-base font-semibold tracking-normal text-slate-900">
              {title}
            </CardTitle>
          )}

          {extra && (
            <div className="col-start-2 row-start-1 self-center text-sm text-slate-500">
              {extra}
            </div>
          )}

          {description && (
            <CardDescription className="text-sm leading-6 text-slate-500">
              {description}
            </CardDescription>
          )}
        </CardHeader>
      )}

      <CardContent
        className={cn("px-6 py-5 text-sm leading-6 text-slate-700", size === "small" && "px-4 py-4", bodyClassName)}
      >
        {children}
      </CardContent>

      {hasActions && (
        <CardFooter className="grid grid-cols-[repeat(auto-fit,minmax(0,1fr))] border-t border-slate-200 bg-slate-50 p-0">
          {actions?.map((action, index) => (
            <div
              key={index}
              className="flex min-h-11 items-center justify-center px-4 py-3 text-sm text-slate-600 [&:not(:last-child)]:border-r [&:not(:last-child)]:border-slate-200"
            >
              {action}
            </div>
          ))}
        </CardFooter>
      )}
    </Card>
  );
};

export default CardComponent;
