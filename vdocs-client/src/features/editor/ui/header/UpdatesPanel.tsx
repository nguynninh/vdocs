"use client";

import { ChevronsLeft, ChevronLeft, History, Share as ShareIcon, Star, MoreHorizontal } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  revisionApi,
  type VersionApiResponse,
  type VersionSummaryApiResponse,
} from "../../data/api/revisionApi";
import { useEditor } from "../../react/EditorProvider";

export interface UpdatesPanelProps {
  documentId: string;
  documentTitle: string;
  onClose?: () => void;
}

type Tab = "updates" | "analytics";

export function UpdatesPanel({ documentId, documentTitle, onClose }: UpdatesPanelProps) {
  const t = useTranslations("editorHeader.updatesPanel");
  const [tab, setTab] = useState<Tab>("updates");

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
          <VersionsTab documentId={documentId} />
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            {t("analyticsEmpty")}
          </div>
        )}
      </div>
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
                    {version.trigger === "manual" ? t("manual") : t("auto")}
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
