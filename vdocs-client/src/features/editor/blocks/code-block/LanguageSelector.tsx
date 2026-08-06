"use client";

import { ChevronDown } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { CODE_LANGUAGES, getCodeLanguageLabel } from "./codeBlock.languages";

export interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled }: LanguageSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs text-muted-foreground outline-none hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50 [&[data-popup-open]_svg]:rotate-180"
      >
        {getCodeLanguageLabel(value)}
        <ChevronDown className="h-3 w-3 transition-transform" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-40 overflow-y-auto">
        {CODE_LANGUAGES.map((language) => (
          <DropdownMenuItem key={language.value} onClick={() => onChange(language.value)}>
            {language.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
