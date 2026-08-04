"use client";

import * as React from "react";
import { MessageSquarePlus, Trash2 } from "lucide-react";

import { useAuth } from "@/components/layout/auth-provider";
import { useLocale } from "@/components/layout/locale-provider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatRelativeTimeShort } from "@/lib/time";
import { cn } from "@/lib/utils";

export interface DocumentComment {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

interface DocumentCommentsProps {
  documentId: string;
  className?: string;
}

function storageKey(documentId: string) {
  return `document.comments.${documentId}`;
}

function loadComments(documentId: string): DocumentComment[] {
  try {
    const raw = window.localStorage.getItem(storageKey(documentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DocumentComment[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DocumentComments({ documentId, className }: DocumentCommentsProps) {
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [comments, setComments] = React.useState<DocumentComment[]>([]);
  const [draft, setDraft] = React.useState("");
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    loadedRef.current = false;
    setComments(loadComments(documentId));
    loadedRef.current = true;
  }, [documentId]);

  React.useEffect(() => {
    if (!loadedRef.current) return;
    window.localStorage.setItem(storageKey(documentId), JSON.stringify(comments));
  }, [comments, documentId]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const comment: DocumentComment = {
      id: `comment-${Math.random().toString(36).slice(2, 10)}`,
      text,
      authorName: user?.displayName || user?.username || t("document.comments.anonymous"),
      createdAt: new Date().toISOString(),
    };
    setComments((current) => [...current, comment]);
    setDraft("");
  }

  function handleDelete(id: string) {
    setComments((current) => current.filter((comment) => comment.id !== id));
  }

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-none px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground outline-none transition-all hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
          className
        )}
      >
        <MessageSquarePlus className="h-4 w-4" />
        {t("document.toolbar.addComment")}
        {comments.length > 0 && (
          <span className="text-muted-foreground/80">({comments.length})</span>
        )}
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80">
        <p className="mb-2 text-sm font-medium text-foreground">{t("document.comments.title")}</p>

        {comments.length === 0 ? (
          <p className="mb-3 text-sm text-muted-foreground">{t("document.comments.empty")}</p>
        ) : (
          <ul className="mb-3 flex max-h-64 flex-col gap-3 overflow-y-auto">
            {comments.map((comment) => (
              <li key={comment.id} className="group flex items-start justify-between gap-2 text-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{comment.authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTimeShort(comment.createdAt, t, locale)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-muted-foreground">{comment.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(comment.id)}
                  className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  aria-label={t("document.comments.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("document.comments.placeholder")}
            rows={2}
            className="w-full resize-none rounded-md border border-input bg-transparent px-2 py-1.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button type="submit" size="sm" className="self-end" disabled={!draft.trim()}>
            {t("document.comments.submit")}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
