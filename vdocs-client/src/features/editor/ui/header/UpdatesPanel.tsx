"use client";

import { Clock, Share as ShareIcon, Star, MoreHorizontal, ChevronsLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export interface UpdatesPanelProps {
  documentTitle: string;
  onClose?: () => void;
}

type Tab = "updates" | "analytics";

interface EditEntry {
  type: "edit";
  actorName: string;
  timeLabel: string;
  field: string;
  before?: string;
  after: string;
  moreCount?: number;
}

interface PermissionEntry {
  type: "permission";
  actorName: string;
  timeLabel: string;
  label: string;
  before: string;
  after: string;
}

type FeedEntry = EditEntry | PermissionEntry;

function buildMockFeed(documentTitle: string): FeedEntry[] {
  return [
    {
      type: "edit",
      actorName: "You",
      timeLabel: "2 minutes ago",
      field: "Title",
      before: documentTitle,
      after: documentTitle,
      moreCount: 3,
    },
    {
      type: "permission",
      actorName: "You",
      timeLabel: "17 hours ago",
      label: "Published link",
      before: "Can view",
      after: "Can comment",
    },
    {
      type: "edit",
      actorName: "You",
      timeLabel: "18 hours ago",
      field: "Title",
      after: documentTitle,
    },
    {
      type: "permission",
      actorName: "You",
      timeLabel: "18 hours ago",
      label: "Published link",
      before: "",
      after: "Can view",
    },
  ];
}

export function UpdatesPanel({ documentTitle, onClose }: UpdatesPanelProps) {
  const t = useTranslations("editorHeader.updatesPanel");
  const [tab, setTab] = useState<Tab>("updates");
  const feed = buildMockFeed(documentTitle);

  return (
    <div className="flex h-full w-full flex-col text-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="default" size="sm">
            <ShareIcon className="h-3.5 w-3.5" />
            {t("share")}
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("star")}>
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("more")}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 border-b border-border px-3">
        <button
          type="button"
          onClick={() => setTab("updates")}
          className={`border-b-2 px-1 py-2 text-sm ${
            tab === "updates"
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabs.updates")}
        </button>
        <button
          type="button"
          onClick={() => setTab("analytics")}
          className={`border-b-2 px-1 py-2 text-sm ${
            tab === "analytics"
              ? "border-foreground font-medium text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tabs.analytics")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === "updates" ? (
          <ul className="flex flex-col gap-4">
            {feed.map((entry, index) => (
              <FeedRow key={index} entry={entry} documentTitle={documentTitle} />
            ))}
          </ul>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            {t("analyticsEmpty")}
          </div>
        )}
      </div>
    </div>
  );
}

function FeedRow({ entry, documentTitle }: { entry: FeedEntry; documentTitle: string }) {
  const t = useTranslations("editorHeader.updatesPanel");

  return (
    <li className="flex gap-2">
      <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-muted" aria-hidden />
      <div className="min-w-0 flex-1">
        {entry.type === "edit" ? (
          <>
            <p className="leading-snug text-foreground">
              <span className="font-medium">{entry.actorName}</span> {t("edited")}{" "}
              <span className="font-medium">{documentTitle}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {entry.timeLabel}
            </p>

            <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
              <p className="mb-1 flex items-center gap-1 text-muted-foreground">
                <span className="font-serif italic">Aa</span> {entry.field}
              </p>
              {entry.before && entry.before !== entry.after && (
                <p className="text-muted-foreground line-through">{entry.before}</p>
              )}
              <p className="rounded bg-primary/10 px-1 text-foreground">{entry.after}</p>
            </div>

            {!!entry.moreCount && (
              <button type="button" className="mt-1 text-xs text-muted-foreground hover:underline">
                {t("viewMore", { count: entry.moreCount })}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="leading-snug text-foreground">
              <span className="font-medium">{entry.actorName}</span> {t("updatedPermission")}{" "}
              <span className="font-medium">{documentTitle}</span>
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {entry.timeLabel}
            </p>

            <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
              <p className="mb-1 text-muted-foreground">{entry.label}</p>
              {entry.before ? (
                <p className="flex items-center gap-1">
                  <span className="text-muted-foreground line-through">{entry.before}</span>
                  <span>→</span>
                  <span className="font-medium text-foreground">{entry.after}</span>
                </p>
              ) : (
                <p className="font-medium text-foreground">{entry.after}</p>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
