"use client";

import { ChevronsLeft, ChevronLeft, History, Share as ShareIcon, Star, MoreHorizontal } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  analyticsApi,
  type DailyViewStat,
  type DocumentAnalyticsApiResponse,
} from "../../data/api/analyticsApi";
import {
  revisionApi,
  type VersionApiResponse,
  type VersionSummaryApiResponse,
} from "../../data/api/revisionApi";
import { useEditor } from "../../react/EditorProvider";
import type { ActivityEntry } from "./ActivityPanel";

type Tab = "updates" | "analytics";

export interface UpdatesPanelProps {
  documentId: string;
  documentTitle: string;
  editedBy?: ActivityEntry;
  createdBy?: ActivityEntry;
  initialTab?: Tab;
  onClose?: () => void;
}

export function UpdatesPanel({
  documentId,
  documentTitle,
  editedBy,
  createdBy,
  initialTab,
  onClose,
}: UpdatesPanelProps) {
  const t = useTranslations("editorHeader.updatesPanel");
  const [tab, setTab] = useState<Tab>(initialTab ?? "updates");

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
            <ChevronsLeft className="h-4 w-4 rotate-180" />
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
          <VersionsTab documentId={documentId} />
        ) : (
          <AnalyticsTab documentId={documentId} editedBy={editedBy} createdBy={createdBy} />
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({
  documentId,
  editedBy,
  createdBy,
}: {
  documentId: string;
  editedBy?: ActivityEntry;
  createdBy?: ActivityEntry;
}) {
  const t = useTranslations("editorHeader.updatesPanel.analytics");
  const tActivity = useTranslations("editorHeader.activity");
  const format = useFormatter();

  const [data, setData] = useState<DocumentAnalyticsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    analyticsApi
      .get(documentId)
      .then((response) => setData(response.data))
      .catch((error) => console.error("Failed to load analytics", error))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading || !data) {
    return (
      <div className="flex h-32 items-center justify-center text-muted-foreground">
        {loading ? "" : t("empty")}
      </div>
    );
  }

  // The API only returns days that actually had a view — fill in the full
  // range with zeros so a single real data point renders as one thin bar
  // among many empty slots, instead of one bar stretched across the whole
  // chart (which just looked like a solid block).
  const byDate = new Map(data.daily.map((day) => [day.date, day]));
  const days: DailyViewStat[] = [];
  for (let i = data.rangeDays - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    days.push(byDate.get(key) ?? { date: key, totalViews: 0, uniqueViewers: 0 });
  }

  const maxViews = Math.max(1, ...days.map((d) => d.totalViews));
  const chartWidth = 320;
  const chartHeight = 90;
  const barGap = 2;
  const barWidth = chartWidth / days.length - barGap;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm text-foreground">
          {t("viewsTotal", { count: data.totalViews })}
        </p>

        {data.totalViews === 0 ? (
          <div className="flex h-24 items-center justify-center text-muted-foreground">
            {t("empty")}
          </div>
        ) : (
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full"
              onMouseLeave={() => setHoveredDay(null)}
            >
              <line
                x1={0}
                y1={chartHeight - 0.5}
                x2={chartWidth}
                y2={chartHeight - 0.5}
                className="stroke-border"
                strokeWidth={1}
              />
              {days.map((day, index) => {
                const minHeight = day.totalViews > 0 ? 2 : 0;
                const height = Math.max(
                  (day.totalViews / maxViews) * (chartHeight - 16),
                  minHeight
                );
                const x = index * (chartWidth / days.length);

                return (
                  <rect
                    key={day.date}
                    x={x}
                    y={chartHeight - height}
                    width={Math.max(barWidth, 1)}
                    height={height}
                    rx={1}
                    fill={day.totalViews > 0 ? "#3b82f6" : "var(--border)"}
                    className={day.totalViews > 0 ? "hover:fill-blue-600" : undefined}
                    onMouseEnter={() => setHoveredDay(index)}
                  />
                );
              })}
            </svg>

            {hoveredDay !== null && days[hoveredDay] && (
              <div className="pointer-events-none absolute top-0 right-0 rounded-md bg-foreground px-2 py-1 text-xs text-background">
                <p>
                  {format.dateTime(new Date(days[hoveredDay].date), {
                    dateStyle: "medium",
                  })}
                </p>
                <p>{t("viewsCount", { count: days[hoveredDay].totalViews })}</p>
                <p>{t("uniqueCount", { count: days[hoveredDay].uniqueViewers })}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">{t("viewers")}</p>
        {data.viewers.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noViewers")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.viewers.map((viewer) => (
              <li key={viewer.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
                    {viewer.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={viewer.avatar} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <span className="truncate text-foreground">{viewer.name}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {format.relativeTime(new Date(viewer.lastViewedAt))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(createdBy || editedBy) && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("editors")}</p>
          <ul className="flex flex-col gap-2">
            {createdBy && (
              <li className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">
                  {tActivity("createdBy")} <span className="font-medium">{createdBy.actorName}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{createdBy.timeLabel}</span>
              </li>
            )}
            {editedBy && (
              <li className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">
                  {tActivity("editedBy")} <span className="font-medium">{editedBy.actorName}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{editedBy.timeLabel}</span>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function VersionsTab({ documentId }: { documentId: string }) {
  const t = useTranslations("editorHeader.updatesPanel.versions");
  const format = useFormatter();
  const { canEdit, restoreVersion } = useEditor();

  const [versions, setVersions] = useState<VersionSummaryApiResponse[]>([]);
  const [selected, setSelected] = useState<VersionApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadVersions = (silent = false) => {
    if (!silent) setLoading(true);
    revisionApi
      .list(documentId)
      .then((response) => setVersions(response.data))
      .catch((error) => console.error("Failed to load version history", error))
      .finally(() => {
        if (!silent) setLoading(false);
      });
  };

  useEffect(() => {
    loadVersions();

    // New auto-saved checkpoints can appear while this panel stays open
    // during an editing session — poll quietly so they show up without
    // requiring the user to close and reopen the panel.
    const interval = setInterval(() => loadVersions(true), 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  const openVersion = (versionId: string) => {
    revisionApi
      .get(documentId, versionId)
      .then((response) => setSelected(response.data))
      .catch((error) => console.error("Failed to load version", error));
  };

  const handleSaveVersion = () => {
    setSaving(true);
    revisionApi
      .createManual(documentId)
      .then(() => loadVersions())
      .catch((error) => console.error("Failed to save version", error))
      .finally(() => setSaving(false));
  };

  const handleRestore = () => {
    if (!selected) return;
    if (!window.confirm(t("confirmRestore"))) return;

    setRestoring(true);
    restoreVersion(selected.id)
      .then((success) => {
        if (success) {
          setSelected(null);
        }
      })
      .catch((error) => console.error("Failed to restore version", error))
      .finally(() => setRestoring(false));
  };

  if (selected) {
    return (
      <div className="flex h-full flex-col gap-3">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {t("backToList")}
        </button>

        <div className="flex-1 overflow-y-auto rounded-md bg-muted/50 p-3">
          {selected.content.blocks.length === 0 ? (
            <p className="text-muted-foreground">{t("previewEmpty")}</p>
          ) : (
            selected.content.blocks.map((block) => (
              <p key={block.id} className="mb-2 whitespace-pre-wrap text-foreground last:mb-0">
                {block.text || " "}
              </p>
            ))
          )}
        </div>

        {canEdit && (
          <Button onClick={handleRestore} disabled={restoring}>
            {restoring ? t("restoring") : t("restore")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-2">
      {canEdit && (
        <Button variant="ghost" size="sm" className="self-start" onClick={handleSaveVersion} disabled={saving}>
          {t("saveVersion")}
        </Button>
      )}

      {loading ? null : versions.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">{t("empty")}</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {versions.map((version) => (
            <li key={version.id}>
              <button
                type="button"
                onClick={() => openVersion(version.id)}
                className="flex w-full items-start gap-2 rounded-md p-2 text-left hover:bg-muted"
              >
                <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">
                    {version.label ??
                      format.dateTime(new Date(version.createdAt), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {version.trigger === "manual"
                      ? t("manual")
                      : version.trigger === "daily"
                        ? t("daily")
                        : t("auto")}
                    {version.createdBy ? ` · ${version.createdBy.name}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
