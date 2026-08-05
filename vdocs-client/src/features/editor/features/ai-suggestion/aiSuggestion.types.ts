import type { ComponentType } from "react";

export type AiSuggestionAction =
  | "continueWriting"
  | "writeOutline"
  | "brainstormIdeas"
  | "summarize"
  | "fixSpellingGrammar";

export interface AiSuggestionItem {
  id: AiSuggestionAction;
  icon: ComponentType<{ className?: string }>;
}
