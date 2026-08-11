"use client";

import { Clock, FileText, Plus, Share2, Sparkles, Star, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardShell from "@/src/components/layout/DashboardShell";
import { getMe } from "@/src/features/auth/api";
import type { AuthUser } from "@/src/features/auth/types";
import { documentApi } from "@/src/features/editor/data/api/documentApi";
import type { DocumentSummaryApiResponse } from "@/src/features/editor/data/api/documentApi";
import { useLocale } from "@/src/i18n/hooks/useLocale";

import DocumentCard from "./DocumentCard";
import { formatRelativeTime } from "./formatRelativeTime";

function useGreeting(name: string | undefined) {
  const t = useTranslations("dashboard");

  if (!name) return "";

  const hour = new Date().getHours();
  if (hour < 12) return t("greeting.morning", { name });
  if (hour < 18) return t("greeting.afternoon", { name });
  return t("greeting.evening", { name });
}

const DashboardPage = () => {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const { locale } = useLocale();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [documents, setDocuments] = useState<DocumentSummaryApiResponse[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [favoritesCount, setFavoritesCount] = useState<number | null>(null);
  const [sharedCount, setSharedCount] = useState<number | null>(null);

  const greeting = useGreeting(user?.name);

  useEffect(() => {
    let ignore = false;

    getMe().then((response) => {
      if (!ignore) setUser(response.data.user);
    });

    documentApi
      .list()
      .then((response) => {
        if (!ignore) setDocuments(response.data);
      })
      .catch(() => {
        if (!ignore) setHasError(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    documentApi
      .getFavoritesCount()
      .then((response) => {
        if (!ignore) setFavoritesCount(response.data.count);
      })
      .catch(() => {
        if (!ignore) setFavoritesCount(0);
      });

    documentApi
      .getSharedCount()
      .then((response) => {
        if (!ignore) setSharedCount(response.data.count);
      })
      .catch(() => {
        if (!ignore) setSharedCount(0);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCreateDocument() {
    if (isCreating) return;

    setIsCreating(true);

    try {
      const response = await documentApi.create();
      router.push(`/document/${response.data.id}`);
    } catch (error) {
      console.error("Failed to create document", error);
      setIsCreating(false);
    }
  }

  const stats: { key: string; icon: typeof FileText; iconClass: string; value: number | null }[] = [
    { key: "total", icon: FileText, iconClass: "bg-[#EEF1FE] text-[#4F6DF5]", value: documents?.length ?? 0 },
    { key: "shared", icon: Share2, iconClass: "bg-[#E9F9EF] text-[#22A55A]", value: sharedCount },
    { key: "favorites", icon: Star, iconClass: "bg-[#FEF3E4] text-[#F5A524]", value: favoritesCount },
    { key: "trash", icon: Trash2, iconClass: "bg-[#EAF3FF] text-[#3B82F6]", value: null },
  ];

  const recentActivity = (documents ?? []).slice(0, 5);

  return (
    <DashboardShell>
      <div className="flex flex-col gap-8 py-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-[#EEF1FE] via-background to-background p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-6 -top-6 size-32 rounded-full bg-[#4F6DF5]/10 blur-2xl sm:size-40" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{greeting}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
              <Button onClick={handleCreateDocument} disabled={isCreating} size="lg" className="mt-4 shadow-sm">
                <Plus className="size-4" />
                {t("newDocument")}
              </Button>
            </div>

            <div className="relative hidden h-32 w-48 shrink-0 sm:block">
              <div className="absolute right-2 top-6 size-20 rotate-6 rounded-2xl bg-gradient-to-br from-[#4F6DF5] to-[#8B5CF6] shadow-lg shadow-[#4F6DF5]/20" />
              <FileText className="absolute right-6 top-11 size-9 -rotate-6 text-white/90" strokeWidth={1.75} />
              <div className="absolute right-24 top-0 flex size-10 items-center justify-center rounded-xl bg-[#22C55E]/15 text-[#22A55A] shadow-sm">
                <Share2 className="size-5" />
              </div>
              <div className="absolute right-0 bottom-2 flex size-11 items-center justify-center rounded-xl bg-[#8B5CF6]/15 text-[#8B5CF6] shadow-sm">
                <Sparkles className="size-5" />
              </div>
              <div className="absolute left-4 top-16 flex size-9 items-center justify-center rounded-xl bg-[#F5A524]/15 text-[#F5A524] shadow-sm">
                <Star className="size-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ key, icon: Icon, iconClass, value }) => (
            <div
              key={key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
            >
              <span className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{t(`stats.${key}`)}</p>
                <p className="text-2xl font-semibold leading-tight tabular-nums">{value ?? "—"}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">{t("recentDocuments")}</h2>
            </div>

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 rounded-lg" />
                ))}
              </div>
            ) : hasError ? (
              <p className="text-sm text-destructive">{t("error")}</p>
            ) : documents && documents.length > 0 ? (
              <div className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card px-2 shadow-sm">
                {documents.map((document) => (
                  <DocumentCard
                    key={document.id}
                    document={document}
                    untitledLabel={t("untitled")}
                    updatedLabel={t("updatedAt", { time: formatRelativeTime(document.updatedAt, locale) })}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
                <FileText strokeWidth={1.5} className="size-10 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{t("empty.title")}</p>
                  <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
                </div>
                <Button onClick={handleCreateDocument} disabled={isCreating} variant="outline">
                  <Plus className="size-4" />
                  {t("empty.action")}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-muted-foreground">{t("recentActivity")}</h2>
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
              {recentActivity.length > 0 ? (
                recentActivity.map((document) => (
                  <div key={document.id} className="flex gap-3">
                    <span className="mt-1 flex size-2 shrink-0 items-center justify-center rounded-full bg-[#4F6DF5]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm">
                        {t("activityUpdated", { title: document.title || t("untitled") })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(document.updatedAt, locale)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Clock strokeWidth={1.5} className="size-6 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t("noActivity")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
};

export default DashboardPage;
