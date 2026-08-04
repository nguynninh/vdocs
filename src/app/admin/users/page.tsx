"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  LockOpen,
  Pencil,
  Search,
  Users as UsersIcon,
} from "lucide-react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useLocale } from "@/components/layout/locale-provider";
import { listUsers, setUserLocked } from "@/apis/users";
import type { User } from "@/types/user";

const ADMIN_ROLE_NAME = "ADMIN";
const PAGE_SIZE = 10;

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-fuchsia-500",
  "bg-teal-500",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase() || "?";
}

function hashIndex(value: string, mod: number) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash % mod;
}

function isAdmin(user: User) {
  return (user.roles ?? []).some((role) => role.toUpperCase().includes(ADMIN_ROLE_NAME));
}

type StatusFilter = "all" | "active" | "locked";
type RoleFilter = "all" | string;

export default function UsersPage() {
  const { t } = useLocale();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    setLoading(true);
    setError(false);
    listUsers()
      .then((data) => {
        if (!ignore) setUsers(data);
      })
      .catch(() => {
        if (!ignore) setError(true);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const availableRoles = useMemo(() => {
    const names = new Set<string>();
    users.forEach((user) => (user.roles ?? []).forEach((role) => names.add(role)));
    return Array.from(names).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (statusFilter === "active" && user.locked) return false;
      if (statusFilter === "locked" && !user.locked) return false;
      if (roleFilter !== "all" && !(user.roles ?? []).includes(roleFilter)) return false;
      if (!query) return true;
      const haystack = `${user.displayName} ${user.username} ${user.email}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [users, search, statusFilter, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = filteredUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const lockedCount = users.filter((user) => user.locked).length;
  const activeCount = users.length - lockedCount;
  const activePercent = users.length ? Math.round((activeCount / users.length) * 100) : 0;

  const STATS = [
    {
      key: "total",
      label: t("users.stats.total"),
      value: users.length,
      icon: UsersIcon,
      iconBg: "bg-blue-50 dark:bg-blue-500/15",
      iconColor: "text-blue-600 dark:text-blue-400",
    },
    {
      key: "active",
      label: t("users.stats.active"),
      value: activeCount,
      delta: t("users.stats.activePercent").replace("{percent}", String(activePercent)),
      icon: CheckCircle2,
      iconBg: "bg-emerald-50 dark:bg-emerald-500/15",
      iconColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "locked",
      label: t("users.stats.locked"),
      value: lockedCount,
      icon: Lock,
      iconBg: "bg-red-50 dark:bg-red-500/15",
      iconColor: "text-red-600 dark:text-red-400",
    },
  ] as const;

  async function toggleLocked(user: User) {
    setActionError(null);
    setPendingUserIds((prev) => new Set(prev).add(user.id));
    try {
      const updated = await setUserLocked(user.id, !user.locked);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch {
      setActionError(t("users.actions.updateError"));
    } finally {
      setPendingUserIds((prev) => {
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
    }
  }

  const from = filteredUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(currentPage * PAGE_SIZE, filteredUsers.length);
  const paginationLabel = t("users.pagination.showing")
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(filteredUsers.length));
  const perPageLabel = t("users.pagination.perPage").replace("{count}", String(PAGE_SIZE));

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setRoleFilter("all");
    setPage(1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar variant="embedded" />

        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[1400px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                  {t("users.title")}
                </h1>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("users.subtitle")}</p>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                {actionError}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.key}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</span>
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${stat.iconBg}`}>
                        <Icon className={`h-4.5 w-4.5 ${stat.iconColor}`} />
                      </div>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                      {loading ? "…" : stat.value}
                    </div>
                    {"delta" in stat && stat.delta && (
                      <div className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        {stat.delta}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-end gap-3">
              <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 dark:border-white/10 dark:bg-neutral-900">
                <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder={t("users.filters.searchPlaceholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none dark:text-neutral-100"
                />
              </label>

              <div className="flex flex-col gap-1">
                <span className="px-0.5 text-xs text-neutral-400">{t("users.filters.role")}</span>
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value);
                      setPage(1);
                    }}
                    className="h-10 w-40 appearance-none rounded-lg border border-neutral-200 bg-white px-3 pr-8 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    <option value="all">{t("users.filters.all")}</option>
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role.toUpperCase().includes(ADMIN_ROLE_NAME) ? t("users.roles.admin") : role}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="px-0.5 text-xs text-neutral-400">{t("users.filters.status")}</span>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value as StatusFilter);
                      setPage(1);
                    }}
                    className="h-10 w-40 appearance-none rounded-lg border border-neutral-200 bg-white px-3 pr-8 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                  >
                    <option value="all">{t("users.filters.all")}</option>
                    <option value="active">{t("users.status.active")}</option>
                    <option value="locked">{t("users.status.locked")}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {t("users.filters.filterButton")}
              </button>
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-white/10">
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-neutral-300 text-indigo-600 dark:border-white/20"
                      />
                    </th>
                    <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                      {t("users.table.user")}
                    </th>
                    <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                      {t("users.table.role")}
                    </th>
                    <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                      {t("users.table.status")}
                    </th>
                    <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                      {t("users.table.email")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-neutral-500 dark:text-neutral-400">
                      {t("users.table.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        {t("users.loading")}
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-red-500">
                        {t("users.loadError")}
                      </td>
                    </tr>
                  ) : pageUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                        {t("users.empty")}
                      </td>
                    </tr>
                  ) : (
                    pageUsers.map((user, index) => {
                      const admin = isAdmin(user);
                      const roleLabel = admin
                        ? t("users.roles.admin")
                        : (user.roles ?? []).length
                          ? t("users.roles.user")
                          : t("users.roles.unknown");
                      const avatarColor = AVATAR_COLORS[hashIndex(user.id, AVATAR_COLORS.length)];
                      return (
                        <tr
                          key={user.id}
                          className={index !== 0 ? "border-t border-neutral-100 dark:border-white/5" : ""}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-neutral-300 text-indigo-600 dark:border-white/20"
                            />
                          </td>
                          <td className="px-2 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${avatarColor}`}
                              >
                                {initials(user.displayName || user.username)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-neutral-900 dark:text-neutral-50">
                                  {user.displayName || user.username}
                                </div>
                                <div className="truncate text-xs text-neutral-400">{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                admin
                                  ? "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
                                  : (user.roles ?? []).length
                                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                                    : "bg-neutral-100 text-neutral-500 dark:bg-white/5 dark:text-neutral-400"
                              }`}
                            >
                              {roleLabel}
                            </span>
                          </td>
                          <td className="px-2 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                user.locked
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${user.locked ? "bg-red-500" : "bg-emerald-500"}`}
                              />
                              {user.locked ? t("users.status.locked") : t("users.status.active")}
                            </span>
                          </td>
                          <td className="px-2 py-3 text-neutral-600 dark:text-neutral-300">{user.email}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                aria-label="Edit"
                                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                aria-label={user.locked ? t("users.actions.unlock") : t("users.actions.lock")}
                                title={user.locked ? t("users.actions.unlock") : t("users.actions.lock")}
                                disabled={pendingUserIds.has(user.id)}
                                onClick={() => toggleLocked(user)}
                                className={`rounded-lg p-1.5 hover:bg-neutral-100 disabled:opacity-40 dark:hover:bg-white/10 ${
                                  user.locked
                                    ? "text-red-500 hover:text-red-600"
                                    : "text-neutral-400 hover:text-neutral-600"
                                }`}
                              >
                                {user.locked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 dark:border-white/10">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">{paginationLabel}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-40 dark:hover:bg-white/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium ${
                        pageNumber === currentPage
                          ? "bg-indigo-600 text-white"
                          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-white/10"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-40 dark:hover:bg-white/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <span className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200 px-2.5 text-sm text-neutral-600 dark:border-white/10 dark:text-neutral-300">
                  {perPageLabel}
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
