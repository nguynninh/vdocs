"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Eye,
  Folder,
  LifeBuoy,
  Lock,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
  Users as UsersIcon,
  X,
} from "lucide-react";

import { listRoles } from "@/apis/roles";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import { useLocale } from "@/components/layout/locale-provider";
import { formatDateTime } from "@/lib/time";
import type { Role } from "@/types/role";

type RoleIconKey = typeof Shield;

interface IconStyle {
  icon: RoleIconKey;
  iconBg: string;
  iconColor: string;
}

const ICON_STYLES: Record<string, IconStyle> = {
  admin: {
    icon: ShieldCheck,
    iconBg: "bg-violet-50 dark:bg-violet-500/15",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  manager: {
    icon: Shield,
    iconBg: "bg-blue-50 dark:bg-blue-500/15",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  user: {
    icon: UserCheck,
    iconBg: "bg-emerald-50 dark:bg-emerald-500/15",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  viewer: {
    icon: Eye,
    iconBg: "bg-amber-50 dark:bg-amber-500/15",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  editor: {
    icon: Pencil,
    iconBg: "bg-rose-50 dark:bg-rose-500/15",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  guest: {
    icon: Folder,
    iconBg: "bg-yellow-50 dark:bg-yellow-500/15",
    iconColor: "text-yellow-600 dark:text-yellow-400",
  },
  developer: {
    icon: Code2,
    iconBg: "bg-indigo-50 dark:bg-indigo-500/15",
    iconColor: "text-indigo-600 dark:text-indigo-400",
  },
  support: {
    icon: LifeBuoy,
    iconBg: "bg-teal-50 dark:bg-teal-500/15",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
};

const DEFAULT_ICON_STYLE: IconStyle = {
  icon: Shield,
  iconBg: "bg-neutral-100 dark:bg-white/10",
  iconColor: "text-neutral-500 dark:text-neutral-400",
};

function iconStyleFor(roleName: string): IconStyle {
  return ICON_STYLES[roleName.toLowerCase()] ?? DEFAULT_ICON_STYLE;
}

function displayName(roleName: string) {
  return roleName.charAt(0).toUpperCase() + roleName.slice(1).toLowerCase();
}

const STATUS_STYLES: Record<"active" | "inactive", string> = {
  active: "bg-emerald-500",
  inactive: "bg-neutral-400",
};

const STATUS_TEXT_STYLES: Record<"active" | "inactive", string> = {
  active: "text-emerald-600 dark:text-emerald-400",
  inactive: "text-neutral-500 dark:text-neutral-400",
};

export default function RolesPage() {
  const { t, locale } = useLocale();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    let ignore = false;

    listRoles()
      .then((data) => {
        if (ignore) return;
        setRoles(data);
        setSelectedName((prev) => prev ?? data[0]?.name ?? null);
      })
      .catch(() => {
        if (!ignore) setError(true);
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const selectedRole = roles.find((role) => role.name === selectedName) ?? null;

  const totalUsers = roles.reduce((sum, role) => sum + role.userCount, 0);
  const activeCount = roles.filter((role) => role.active).length;
  const totalPermissions = new Set(roles.flatMap((role) => role.permissions.map((p) => p.name))).size;
  const activePercent = roles.length ? Math.round((activeCount / roles.length) * 1000) / 10 : 0;

  const STATS = [
    {
      key: "total",
      label: t("roles.stats.total"),
      value: String(roles.length),
      delta: t("roles.stats.totalDelta"),
      deltaClass: "text-emerald-600 dark:text-emerald-400",
      icon: Shield,
      iconBg: "bg-violet-50 dark:bg-violet-500/15",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
    {
      key: "inUse",
      label: t("roles.stats.inUse"),
      value: String(activeCount),
      delta: `${activePercent}% ${t("roles.stats.inUsePercent")}`,
      deltaClass: "text-emerald-600 dark:text-emerald-400",
      icon: ShieldCheck,
      iconBg: "bg-blue-50 dark:bg-blue-500/15",
      iconColor: "text-blue-600 dark:text-blue-400",
      badge: CheckCircle2,
    },
    {
      key: "assigned",
      label: t("roles.stats.assigned"),
      value: String(totalUsers),
      delta: t("roles.stats.assignedSuffix"),
      deltaClass: "text-neutral-500 dark:text-neutral-400",
      icon: UsersIcon,
      iconBg: "bg-neutral-100 dark:bg-white/10",
      iconColor: "text-neutral-500 dark:text-neutral-400",
    },
    {
      key: "permissions",
      label: t("roles.stats.permissions"),
      value: String(totalPermissions),
      delta: t("roles.stats.permissionsDelta"),
      deltaClass: "text-emerald-600 dark:text-emerald-400",
      icon: Lock,
      iconBg: "bg-violet-50 dark:bg-violet-500/15",
      iconColor: "text-violet-600 dark:text-violet-400",
    },
  ] as const;

  const paginationLabel = t("roles.pagination.showing")
    .replace("{from}", roles.length ? "1" : "0")
    .replace("{to}", String(roles.length))
    .replace("{total}", String(roles.length));
  const perPageLabel = t("roles.pagination.perPage").replace("{count}", "10");

  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function permissionGroupCounts(role: Role) {
    const counts = new Map<string, number>();
    for (const permission of role.permissions) {
      counts.set(permission.group, (counts.get(permission.group) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([group, count]) => ({ group, count }));
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50 dark:bg-neutral-950">
      <Header />
      <div className="flex flex-1">
        <Sidebar variant="embedded" />

        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-[1600px]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                  {t("roles.title")}
                </h1>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{t("roles.subtitle")}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"
                >
                  <Download className="h-4 w-4" />
                  {t("roles.exportData")}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                >
                  <Plus className="h-4 w-4" />
                  {t("roles.addRole")}
                </button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                const Badge = "badge" in stat ? stat.badge : null;
                return (
                  <div
                    key={stat.key}
                    className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-neutral-900"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">{stat.label}</span>
                      <div className="relative shrink-0">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}>
                          <Icon className={`h-4.5 w-4.5 ${stat.iconColor}`} />
                        </div>
                        {Badge && (
                          <Badge className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-white text-emerald-500 dark:bg-neutral-900" />
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                      {stat.value}
                    </div>
                    <div className={`mt-1 text-xs font-medium ${stat.deltaClass}`}>{stat.delta}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 dark:border-white/10 dark:bg-neutral-900">
                <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                <input
                  type="text"
                  placeholder={t("roles.filters.searchPlaceholder")}
                  className="h-full min-w-0 flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none dark:text-neutral-100"
                />
              </label>

              <button
                type="button"
                className="flex h-10 w-40 shrink-0 items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"
              >
                {t("roles.filters.all")}
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              </button>

              <button
                type="button"
                className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-white/5"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {t("roles.filters.filterButton")}
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white dark:border-white/10 dark:bg-neutral-900">
                <table className="w-full min-w-[900px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 dark:border-white/10">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-neutral-300 text-indigo-600 dark:border-white/20"
                        />
                      </th>
                      <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                        {t("roles.table.role")}
                      </th>
                      <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                        {t("roles.table.description")}
                      </th>
                      <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                        {t("roles.table.users")}
                      </th>
                      <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                        {t("roles.table.status")}
                      </th>
                      <th className="px-2 py-3 text-left font-medium text-neutral-500 dark:text-neutral-400">
                        {t("roles.table.createdAt")}
                      </th>
                      <th className="px-4 py-3 text-right font-medium text-neutral-500 dark:text-neutral-400">
                        {t("roles.table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                          {t("roles.loading")}
                        </td>
                      </tr>
                    )}
                    {!isLoading && error && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-red-500">
                          {t("roles.loadError")}
                        </td>
                      </tr>
                    )}
                    {!isLoading &&
                      !error &&
                      roles.map((role, index) => {
                        const style = iconStyleFor(role.name);
                        const Icon = style.icon;
                        const isSelected = role.name === selectedName;
                        const statusKey = role.active ? "active" : "inactive";
                        return (
                          <tr
                            key={role.name}
                            onClick={() => setSelectedName(role.name)}
                            className={`cursor-pointer transition-colors ${
                              index !== 0 ? "border-t border-neutral-100 dark:border-white/5" : ""
                            } ${isSelected ? "bg-indigo-50/60 dark:bg-indigo-500/10" : "hover:bg-neutral-50 dark:hover:bg-white/[0.03]"}`}
                          >
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-neutral-300 text-indigo-600 dark:border-white/20"
                              />
                            </td>
                            <td className="px-2 py-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}
                                >
                                  <Icon className={`h-4.5 w-4.5 ${style.iconColor}`} />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-neutral-900 dark:text-neutral-50">
                                    {displayName(role.name)}
                                  </div>
                                  {role.system && (
                                    <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                                      {t("roles.systemBadge")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="max-w-[280px] px-2 py-3 text-neutral-600 dark:text-neutral-300">
                              <span className="line-clamp-2">{role.description}</span>
                            </td>
                            <td className="px-2 py-3 text-neutral-700 dark:text-neutral-200">{role.userCount}</td>
                            <td className="px-2 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium ${STATUS_TEXT_STYLES[statusKey]}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[statusKey]}`} />
                                {t(`roles.status.${statusKey}`)}
                              </span>
                            </td>
                            <td className="px-2 py-3 text-neutral-500 dark:text-neutral-400">
                              {formatDateTime(role.createdAt, locale)}
                            </td>
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  aria-label="Edit"
                                  onClick={() => setSelectedName(role.name)}
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="More"
                                  className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 dark:border-white/10">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">{paginationLabel}</span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous page"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-medium text-white"
                    >
                      1
                    </button>
                    <button
                      type="button"
                      aria-label="Next page"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="flex h-8 items-center gap-2 rounded-lg border border-neutral-200 px-2.5 text-sm text-neutral-600 hover:bg-neutral-50 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                  >
                    {perPageLabel}
                    <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
                  </button>
                </div>
              </div>

              {selectedRole && (
                <aside className="w-full shrink-0 rounded-2xl border border-neutral-200 bg-white p-5 lg:w-80 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                      {t("roles.detail.title")}
                    </h2>
                    <button
                      type="button"
                      aria-label={t("roles.detail.close")}
                      onClick={() => setSelectedName(null)}
                      className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {(() => {
                    const style = iconStyleFor(selectedRole.name);
                    const SelectedIcon = style.icon;
                    const statusKey = selectedRole.active ? "active" : "inactive";
                    const groups = permissionGroupCounts(selectedRole);
                    return (
                      <>
                        <div className="mt-4 flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${style.iconBg}`}
                          >
                            <SelectedIcon className={`h-5 w-5 ${style.iconColor}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-50">
                              {displayName(selectedRole.name)}
                            </div>
                            {selectedRole.system && (
                              <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-500/15 dark:text-blue-400">
                                {t("roles.systemBadge")}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            {t("roles.detail.description")}
                          </div>
                          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                            {selectedRole.description}
                          </p>
                        </div>

                        <div className="mt-5">
                          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            {t("roles.detail.info")}
                          </div>
                          <dl className="mt-2 flex flex-col gap-2 text-sm">
                            <div className="flex items-center justify-between">
                              <dt className="text-neutral-500 dark:text-neutral-400">
                                {t("roles.detail.infoUsers")}
                              </dt>
                              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                                {selectedRole.userCount}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-neutral-500 dark:text-neutral-400">
                                {t("roles.detail.infoStatus")}
                              </dt>
                              <dd
                                className={`inline-flex items-center gap-1.5 font-medium ${STATUS_TEXT_STYLES[statusKey]}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_STYLES[statusKey]}`} />
                                {t(`roles.status.${statusKey}`)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-neutral-500 dark:text-neutral-400">
                                {t("roles.detail.infoCreatedAt")}
                              </dt>
                              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                                {formatDateTime(selectedRole.createdAt, locale)}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between">
                              <dt className="text-neutral-500 dark:text-neutral-400">
                                {t("roles.detail.infoUpdatedAt")}
                              </dt>
                              <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                                {formatDateTime(selectedRole.updatedAt, locale)}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="mt-5">
                          <div className="text-xs font-medium text-neutral-400 dark:text-neutral-500">
                            {t("roles.detail.permissions")} ({selectedRole.permissions.length})
                          </div>
                          <div className="mt-2 flex flex-col gap-1">
                            {groups.map((group) => {
                              const isExpanded = expandedGroups.has(group.group);
                              return (
                                <button
                                  key={group.group}
                                  type="button"
                                  onClick={() => toggleGroup(group.group)}
                                  className="flex items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-white/5"
                                >
                                  <span className="text-neutral-700 dark:text-neutral-200">
                                    {t(`roles.permissionGroups.${group.group}`)}
                                  </span>
                                  <span className="flex items-center gap-2 text-neutral-400">
                                    <span className="text-xs">
                                      {group.count} {t("roles.detail.permissionUnit")}
                                    </span>
                                    <ChevronDown
                                      className={`h-3.5 w-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                    />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          className="mt-5 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/15"
                        >
                          {t("roles.detail.viewAll")}
                        </button>
                      </>
                    );
                  })()}
                </aside>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
