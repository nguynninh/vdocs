"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  FolderKanban,
  FolderPlus,
  MoreHorizontal,
  Plus,
  Share2,
  Star,
  Upload,
  Users,
} from "lucide-react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/components/layout/auth-provider";
import { useLocale } from "@/components/layout/locale-provider";
import { createDocument, listDocuments } from "@/apis/documents";
import { listUsers } from "@/apis/users";
import { formatRelativeTimeShort } from "@/lib/time";
import type { DocumentSummaryResponse } from "@/types/document";

const STAT_CARDS = [
  {
    key: "documents",
    icon: FileText,
    iconBg: "bg-blue-50 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    key: "projects",
    icon: FolderKanban,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "members",
    icon: Users,
    iconBg: "bg-amber-50 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    key: "shared",
    icon: Share2,
    iconBg: "bg-violet-50 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
] as const;

export default function Home() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState<DocumentSummaryResponse[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [documentCount, setDocumentCount] = useState(0);
  const [memberCount, setMemberCount] = useState(0);

  const displayName = user?.displayName || user?.username || "admin";

  useEffect(() => {
    let ignore = false;

    listDocuments()
      .then((documents) => {
        if (ignore) return;
        setRecentDocuments(documents.slice(0, 5));
        setDocumentCount(documents.length);
      })
      .catch(() => {
        if (!ignore) setRecentDocuments([]);
      })
      .finally(() => {
        if (!ignore) setLoadingDocuments(false);
      });

    listUsers()
      .then((users) => {
        if (!ignore) setMemberCount(users.length);
      })
      .catch(() => {
        // Non-admin users can't list users; leave the member count at 0.
      });

    return () => {
      ignore = true;
    };
  }, []);

  const statValues: Record<(typeof STAT_CARDS)[number]["key"], number> = {
    documents: documentCount,
    members: memberCount,
    projects: 0,
    shared: 0,
  };

  const handleCreateDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const document = await createDocument();
      router.push(`/document/${document.id}`);
    } finally {
      setCreating(false);
    }
  };

  const SHORTCUTS = [
    { key: "newDocument", icon: Plus, color: "text-blue-500", onClick: handleCreateDocument, disabled: creating },
    { key: "newFolder", icon: FolderPlus, color: "text-emerald-500" },
    { key: "uploadFile", icon: Upload, color: "text-violet-500" },
    { key: "favorites", icon: Star, color: "text-amber-500" },
  ] as const;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar variant="embedded" />

        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="flex w-full gap-8">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                {t("home.welcomePrefix")}
                {displayName}! 👋
              </h1>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("home.welcomeSubtitle")}</p>

              <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                {STAT_CARDS.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
                    >
                      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}>
                        <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {t(`home.stats.${stat.key}`)}
                      </div>
                      <div className="mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                        {statValues[stat.key]}
                      </div>
                    </div>
                  );
                })}
              </div>

              <section className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                    {t("home.recentDocuments.title")}
                  </h2>
                  <Link
                    href="#"
                    className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {t("home.recentDocuments.viewAll")}
                  </Link>
                </div>
                <div className="mt-3 rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
                  {loadingDocuments ? (
                    <div className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      …
                    </div>
                  ) : recentDocuments.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
                      {t("home.recentDocuments.empty")}
                    </div>
                  ) : (
                    recentDocuments.map((doc, index) => {
                      const name = doc.updatedBy || t("document.activity.unknown");
                      const updatedLabel = t("home.recentDocuments.updatedBy")
                        .replace("{time}", formatRelativeTimeShort(doc.updatedAt, t, locale))
                        .replace("{name}", name);
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => router.push(`/document/${doc.id}`)}
                          className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-white/5 ${
                            index !== 0 ? "border-t border-neutral-100 dark:border-white/5" : ""
                          }`}
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-500/15">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                              {doc.title || t("document.untitled")}
                            </div>
                            <div className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                              {updatedLabel}
                            </div>
                          </div>
                          <span
                            aria-label="More"
                            className="shrink-0 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <aside className="hidden w-80 shrink-0 flex-col gap-6 self-start lg:sticky lg:top-16 lg:flex">
              <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900">
                <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {t("home.shortcuts.title")}
                </h2>
                <div className="mt-3 flex flex-col gap-1">
                  {SHORTCUTS.map((shortcut) => {
                    const Icon = shortcut.icon;
                    return (
                      <button
                        key={shortcut.key}
                        type="button"
                        onClick={shortcut.onClick}
                        disabled={shortcut.disabled}
                        className="flex items-center gap-3 rounded-lg px-2 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 dark:text-neutral-300 dark:hover:bg-white/5"
                      >
                        <Icon className={`h-4 w-4 ${shortcut.color}`} />
                        {t(`home.shortcuts.${shortcut.key}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>

      <button
        type="button"
        aria-label="Add"
        disabled={creating}
        onClick={handleCreateDocument}
        className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 shadow-lg hover:bg-indigo-500 disabled:opacity-60"
      >
        <Image src="/icons/ic_add.svg" alt="" width={24} height={24} className="invert" />
      </button>
    </div>
  );
}
