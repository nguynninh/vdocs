"use client";

import { Plus } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FloatButtonProps = ComponentProps<typeof Button> & {
  icon?: React.ReactNode;
};

export function FloatButton({ icon, className, ...props }: FloatButtonProps) {
  return (
    <Button
      size="icon-lg"
      className={cn(
        "fixed right-6 bottom-6 z-50 size-12 rounded-full shadow-lg hover:shadow-xl",
        className
      )}
      {...props}
    >
      {icon ?? <Plus className="size-5" />}
    </Button>
  );
}
