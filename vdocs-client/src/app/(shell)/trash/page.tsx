"use client";

import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  documentApi,
  type DocumentTrashApiResponse,
} from "@/src/features/editor/data/api/documentApi";
import { useLocale } from "@/src/i18n/hooks/useLocale";

import { formatRelativeTime } from "../dashboard/formatRelativeTime";

const TRASH_RETENTION_DAYS = 30;
const SELECTED_WORKSPACE_STORAGE_KEY = "vdocs.selectedWorkspaceId";

function daysLeft(archivedAt: string): number {
  const elapsedMs = Date.now() - new Date(archivedAt).getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  return Math.max(TRASH_RETENTION_DAYS - elapsedDays, 0);
}

export default function TrashPage() {
  const t = useTranslations("trash");
  const { locale } = useLocale();

  const [documents, setDocuments] = useState<DocumentTrashApiResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isBulkPending, setIsBulkPending] = useState(false);

  function fetchTrash() {
    const workspaceId = window.localStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY) ?? undefined;

    setIsLoading(true);
    setHasError(false);

    documentApi
      .listTrash(workspaceId)
      .then((response) => setDocuments(response.data))
      .catch(() => setHasError(true))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    fetchTrash();
  }, []);

  async function handleRestore(documentId: string) {
    setPendingId(documentId);

    try {
      await documentApi.restore(documentId);
      setDocuments((prev) => prev?.filter((document) => document.id !== documentId) ?? prev);
    } catch (error) {
      console.error("Failed to restore document", error);
    } finally {
      setPendingId(null);
    }
  }

  async function handleDeletePermanently(document: DocumentTrashApiResponse) {
    const confirmed = window.confirm(
      t("confirmDeletePermanently", { title: document.title || t("untitledDocument") })
    );
    if (!confirmed) return;

    setPendingId(document.id);

    try {
      await documentApi.permanentlyDelete(document.id);
      setDocuments((prev) => prev?.filter((item) => item.id !== document.id) ?? prev);
    } catch (error) {
      console.error("Failed to permanently delete document", error);
    } finally {
      setPendingId(null);
    }
  }

  async function handleRestoreAll() {
    if (!documents || documents.length === 0 || isBulkPending) return;
    if (!window.confirm(t("confirmRestoreAll"))) return;

    setIsBulkPending(true);

    try {
      await Promise.all(documents.map((document) => documentApi.restore(document.id)));
      fetchTrash();
    } catch (error) {
      console.error("Failed to restore all documents", error);
    } finally {
      setIsBulkPending(false);
    }
  }

  async function handleDeleteAllPermanently() {
    if (!documents || documents.length === 0 || isBulkPending) return;
    if (!window.confirm(t("confirmDeleteAll"))) return;

    setIsBulkPending(true);

    try {
      await Promise.all(documents.map((document) => documentApi.permanentlyDelete(document.id)));
      fetchTrash();
    } catch (error) {
      console.error("Failed to permanently delete all documents", error);
    } finally {
      setIsBulkPending(false);
    }
  }

  const hasDocuments = Boolean(documents && documents.length > 0);

  return (
    <div className="flex flex-col gap-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Trash2 className="size-5" />
            </span>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">{t("title")}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={handleRestoreAll}
              disabled={!hasDocuments || isBulkPending}
            >
              <RotateCcw className="size-4" />
              {t("restoreAll")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllPermanently}
              disabled={!hasDocuments || isBulkPending}
            >
              <Trash2 className="size-4" />
              {t("deleteAll")}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : hasError ? (
          <p className="text-sm text-destructive">{t("error")}</p>
        ) : hasDocuments ? (
          <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card px-2 shadow-sm">
            <div className="flex items-center gap-3 px-2 py-2 text-xs font-medium text-muted-foreground">
              <span className="flex-1">{t("columnName")}</span>
              <span className="w-32 shrink-0">{t("columnDeletedAt")}</span>
              <span className="w-24 shrink-0">{t("columnExpiresAt")}</span>
              <span className="w-20 shrink-0" />
            </div>

            {documents!.map((document) => (
              <div key={document.id} className="flex items-center gap-3 px-2 py-2.5">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF1FE] text-lg leading-none">
                  {document.icon ? document.icon : <FileText strokeWidth={2.25} className="size-4 text-[#4F6DF5]" />}
                </span>

                <p className="min-w-0 flex-1 truncate text-sm font-medium">
                  {document.title || t("untitledDocument")}
                </p>

                <span className="w-32 shrink-0 truncate text-xs text-muted-foreground">
                  {formatRelativeTime(document.archivedAt, locale)}
                </span>

                <span className="w-24 shrink-0 text-xs text-destructive">
                  {t("expiresInDays", { days: daysLeft(document.archivedAt) })}
                </span>

                <div className="flex w-20 shrink-0 justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("restore")}
                    aria-label={t("restore")}
                    disabled={pendingId === document.id}
                    onClick={() => handleRestore(document.id)}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={t("deletePermanently")}
                    aria-label={t("deletePermanently")}
                    disabled={pendingId === document.id}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDeletePermanently(document)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <Trash2 strokeWidth={1.5} className="size-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{t("empty.title")}</p>
              <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
            </div>
          </div>
        )}
      </div>
  );
}
