"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ProjectNavItem } from "@/lib/project-nav";

export default function ProjectNavMenu({ item }: { item: ProjectNavItem }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1.5 text-muted-foreground outline-none hover:text-foreground data-popup-open:text-foreground [&[data-popup-open]_svg]:rotate-180">
        {item.label}
        <ChevronDown className="h-4 w-4 transition-transform" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {item.children?.map((child) => (
          <DropdownMenuItem key={child.label} render={<a href={child.href ?? "#"} />}>
            {child.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
