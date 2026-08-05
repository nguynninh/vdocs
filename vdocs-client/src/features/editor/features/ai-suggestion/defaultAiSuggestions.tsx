import { ListTree, Lightbulb, NotebookPen, SpellCheck, Sparkles } from "lucide-react";

import type { AiSuggestionItem } from "./aiSuggestion.types";

export const defaultAiSuggestions: AiSuggestionItem[] = [
  { id: "continueWriting", icon: NotebookPen },
  { id: "writeOutline", icon: ListTree },
  { id: "brainstormIdeas", icon: Lightbulb },
  { id: "summarize", icon: Sparkles },
  { id: "fixSpellingGrammar", icon: SpellCheck },
];
