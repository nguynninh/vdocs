"use client";

import { useLocale } from "@/components/layout/locale-provider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface DocumentActivityItem {
  action: "edited" | "created";
  actorName: string;
  timeLabel: string;
}

interface DocumentActivityPopoverProps {
  label: string;
  activity: DocumentActivityItem[];
  className?: string;
}

export default function DocumentActivityPopover({
  label,
  activity,
  className,
}: DocumentActivityPopoverProps) {
  const { t } = useLocale();

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        className={cn(
          "whitespace-nowrap rounded-md px-1.5 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground",
          className
        )}
      >
        {label}
      </PopoverTrigger>

      <PopoverContent align="end" className="w-64">
        <p className="mb-2 text-sm font-medium text-foreground">{t("document.activity.title")}</p>
        <ul className="flex flex-col gap-2">
          {activity.map((item, index) => {
            const template = t(
              item.action === "edited" ? "document.activity.editedBy" : "document.activity.createdBy"
            );
            const [prefix, suffix] = template.split("{name}");

            return (
              <li key={index} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  {prefix}
                  <span className="font-medium text-foreground">{item.actorName}</span>
                  {suffix}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{item.timeLabel}</span>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
