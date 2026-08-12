"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Check,
  Copy,
  Crown,
  Database,
  Edit3,
  FileText,
  Link as LinkIcon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SELECTED_WORKSPACE_STORAGE_KEY } from "@/src/components/layout/Siderbar";
import { getWorkspaceIconOption } from "@/src/components/layout/workspace-icons";
import {
  workspaceApi,
  type UserDirectoryApiResponse,
  type WorkspaceApiResponse,
  type WorkspaceMemberApiResponse,
  type WorkspaceMemberRole,
} from "@/src/features/workspace/api";

const LARK_MEMBERS_PAGE_SIZE = 5;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const ROLE_LABEL: Record<WorkspaceMemberRole, string> = {
  OWNER: "Chủ sở hữu",
  FULL_ACCESS: "Toàn quyền truy cập",
  EDITOR: "Có thể chỉnh sửa",
  COMMENTER: "Có thể bình luận",
  VIEWER: "Chỉ xem",
  BLOCK: "Chặn",
};

const WORKSPACE_PERMISSION_OPTIONS: Array<{
  value: Exclude<WorkspaceMemberRole, "OWNER" | "BLOCK">;
  label: string;
  description: string;
}> = [
  {
    value: "FULL_ACCESS",
    label: "Toàn quyền truy cập",
    description: "Có toàn bộ quyền truy cập nội dung trong workspace.",
  },
  {
    value: "EDITOR",
    label: "Có thể chỉnh sửa",
    description: "Có thể xem và chỉnh sửa nội dung được cấp quyền.",
  },
  {
    value: "COMMENTER",
    label: "Có thể bình luận",
    description: "Có thể xem và bình luận trên nội dung được cấp quyền.",
  },
  {
    value: "VIEWER",
    label: "Chỉ xem",
    description: "Chỉ có thể xem nội dung được cấp quyền.",
  },
];

function toWorkspacePermissionRole(role: WorkspaceMemberRole) {
  if (role === "OWNER" || role === "FULL_ACCESS") return "FULL_ACCESS";
  if (role === "EDITOR" || role === "COMMENTER") return role;
  return "VIEWER";
}

export default function DocumentIndexPage() {
  const t = useTranslations("sidebar");
  const [workspace, setWorkspace] = useState<WorkspaceApiResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMemberIndex, setSelectedMemberIndex] = useState<number | null>(null);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [workspaceShareToken, setWorkspaceShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [members, setMembers] = useState<WorkspaceMemberApiResponse[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>("VIEWER");
  const [larkSearch, setLarkSearch] = useState("");
  const [larkPage, setLarkPage] = useState(1);
  const [larkMembers, setLarkMembers] = useState<UserDirectoryApiResponse[]>([]);
  const [larkTotal, setLarkTotal] = useState(0);
  const [larkLoading, setLarkLoading] = useState(false);
  const [larkError, setLarkError] = useState<string | null>(null);
  const [selectedLarkMembers, setSelectedLarkMembers] = useState<UserDirectoryApiResponse[]>([]);
  const [larkInviteLoading, setLarkInviteLoading] = useState(false);
  const [larkInviteError, setLarkInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInviteOpen || !workspace) return;
    setLarkSearch("");
    setLarkPage(1);
    setSelectedLarkMembers([]);
    setLarkInviteError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInviteOpen, workspace?.id]);

  useEffect(() => {
    if (!isInviteOpen || !workspace) return;

    setLarkLoading(true);
    setLarkError(null);

    const timeout = setTimeout(() => {
      workspaceApi
        .searchUsers(workspace.id, {
          query: larkSearch.trim() || undefined,
          page: larkPage,
          pageSize: LARK_MEMBERS_PAGE_SIZE,
        })
        .then((response) => {
          setLarkMembers(response.data.items);
          setLarkTotal(response.data.total);
        })
        .catch((error) => {
          console.error("Failed to load users", error);
          setLarkError("Không thể tải danh sách thành viên.");
        })
        .finally(() => setLarkLoading(false));
    }, 300);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInviteOpen, workspace?.id, larkSearch, larkPage]);

  const toggleLarkMember = (member: UserDirectoryApiResponse) => {
    setSelectedLarkMembers((current) => {
      const exists = current.some((item) => item.id === member.id);
      if (exists) {
        return current.filter((item) => item.id !== member.id);
      }
      return [...current, member];
    });
  };

  const handleLarkInviteSubmit = async () => {
    if (!workspace || selectedLarkMembers.length === 0) return;
    setLarkInviteLoading(true);
    setLarkInviteError(null);
    try {
      await workspaceApi.inviteUsersBatch(
        workspace.id,
        selectedLarkMembers.map((member) => member.id),
        inviteRole
      );
      loadMembers(workspace.id);
      setIsInviteOpen(false);
    } catch (error) {
      console.error("Failed to invite users", error);
      setLarkInviteError("Không thể mời thành viên đã chọn. Vui lòng thử lại.");
    } finally {
      setLarkInviteLoading(false);
    }
  };

  useEffect(() => {
    const workspaceId = window.localStorage.getItem(SELECTED_WORKSPACE_STORAGE_KEY);

    if (!workspaceId) return;

    workspaceApi
      .list()
      .then((response) => {
        setWorkspace(response.data.find((item) => item.id === workspaceId) ?? null);
      })
      .catch((error) => {
        console.error("Failed to load workspace overview", error);
      });
  }, []);

  const loadMembers = (workspaceId: string) => {
    setMembersLoading(true);
    setMembersError(null);
    workspaceApi
      .listMembers(workspaceId)
      .then((response) => setMembers(response.data))
      .catch((error) => {
        console.error("Failed to load workspace members", error);
        setMembersError("Không thể tải danh sách thành viên.");
      })
      .finally(() => setMembersLoading(false));
  };

  useEffect(() => {
    if (!workspace) return;
    loadMembers(workspace.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const handleRoleChange = async (userId: string, role: WorkspaceMemberRole) => {
    if (!workspace) return;
    try {
      await workspaceApi.updateMemberRole(workspace.id, userId, role);
      loadMembers(workspace.id);
    } catch (error) {
      console.error("Failed to update member role", error);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!workspace) return;
    try {
      await workspaceApi.removeMember(workspace.id, userId);
      setSelectedMemberIndex(null);
      loadMembers(workspace.id);
    } catch (error) {
      console.error("Failed to remove member", error);
    }
  };

  useEffect(() => {
    if (!isShareOpen || !workspace) return;
    setShareLoading(true);
    setShareError(null);
    workspaceApi
      .createShareLink(workspace.id)
      .then((response) => setWorkspaceShareToken(response.data.token))
      .catch((error) => {
        console.error("Failed to load workspace share link", error);
        setShareError("Không thể tải liên kết chia sẻ. Vui lòng thử lại.");
      })
      .finally(() => setShareLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isShareOpen, workspace?.id]);

  const handleCreateWorkspaceShareLink = async () => {
    if (!workspace) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const response = await workspaceApi.createShareLink(workspace.id);
      setWorkspaceShareToken(response.data.token);
    } catch (error) {
      console.error("Failed to create workspace share link", error);
      setShareError("Không thể tạo liên kết chia sẻ. Vui lòng thử lại.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleRevokeWorkspaceShareLink = async () => {
    if (!workspace) return;
    setShareLoading(true);
    setShareError(null);
    try {
      await workspaceApi.revokeShareLink(workspace.id);
      setWorkspaceShareToken(null);
    } catch (error) {
      console.error("Failed to revoke workspace share link", error);
      setShareError("Không thể thu hồi liên kết chia sẻ. Vui lòng thử lại.");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyWorkspaceShareLink = async (url: string) => {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
      } catch (error) {
        console.error("Failed to copy workspace share link", error);
      }
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch (error) {
        console.error("Failed to copy workspace share link", error);
      }
      document.body.removeChild(textarea);
    }

    setShareLinkCopied(true);
    window.setTimeout(() => setShareLinkCopied(false), 1200);
  };

  const workspaceUrl = useMemo(() => {
    if (!workspace || typeof window === "undefined") return "";
    const slug = workspace.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    return `${window.location.origin}/workspace/${slug || workspace.id}`;
  }, [workspace]);

  if (workspace) {
    const canManageWorkspaceShare =
      workspace.role === "OWNER" || workspace.role === "FULL_ACCESS";
    const workspaceShareUrl =
      workspaceShareToken && typeof window !== "undefined"
        ? `${window.location.origin}/share/workspace/${workspaceShareToken}`
        : "";
    const { icon: WorkspaceIcon, className } = getWorkspaceIconOption(workspace.icon);
    const navigationItems: Array<{ key: string; icon: LucideIcon; label: string }> = [
      { key: "overview", icon: Box, label: "Tổng quan" },
      { key: "members", icon: Users, label: "Thành viên" },
      { key: "integrations", icon: Sparkles, label: "Tích hợp" },
      { key: "security", icon: Shield, label: "Bảo mật" },
      { key: "advanced", icon: Settings, label: "Nâng cao" },
      { key: "danger", icon: AlertTriangle, label: "Khu vực nguy hiểm" },
    ];
    const selectedMember = selectedMemberIndex == null ? null : members[selectedMemberIndex] ?? null;
    const fullAccessCount = members.filter((member) => toWorkspacePermissionRole(member.role) === "FULL_ACCESS").length;
    const memberStats: Array<{
      icon: LucideIcon;
      label: string;
      value: string;
      suffix: string;
      color: string;
    }> = [
      { icon: Users, label: "Tổng thành viên", value: String(members.length), suffix: "thành viên", color: "text-blue-600" },
      { icon: Crown, label: "Toàn quyền", value: String(fullAccessCount), suffix: "thành viên", color: "text-violet-600" },
      { icon: Sparkles, label: "Quyền hạn chế", value: String(members.length - fullAccessCount), suffix: "thành viên", color: "text-emerald-500" },
    ];
    const larkTotalPages = Math.max(1, Math.ceil(larkTotal / LARK_MEMBERS_PAGE_SIZE));
    const isLarkMemberSelected = (userId: string) =>
      selectedLarkMembers.some((member) => member.id === userId);
    const permissionRows: Array<{
      icon: LucideIcon;
      title: string;
      description: string;
      value: string;
    }> = [
      { icon: FileText, title: "Quản lý tài liệu", description: "Tạo, chỉnh sửa, xoá tài liệu và quản lý phiên bản.", value: "Toàn quyền" },
      { icon: Users, title: "Quản lý thành viên", description: "Mời, xoá thành viên và quản lý vai trò.", value: "Toàn quyền" },
      { icon: Settings, title: "Quản lý cài đặt", description: "Thay đổi cài đặt workspace, vai trò và quyền hạn.", value: "Toàn quyền" },
      { icon: Sparkles, title: "Quản lý tích hợp", description: "Kết nối và quản lý các ứng dụng tích hợp.", value: "Có thể chỉnh sửa" },
      { icon: Database, title: "Xuất dữ liệu", description: "Xuất tài liệu và dữ liệu của workspace.", value: "Không có quyền" },
    ];
    const sections = [
      {
        icon: Users,
        title: "Thành viên",
        description: `${workspace.role === "OWNER" ? "Bạn là chủ sở hữu workspace này." : "Quản lý thành viên trong workspace."}`,
        action: "Quản lý thành viên",
        color: "text-blue-600",
      },
      {
        icon: Sparkles,
        title: "Tích hợp",
        description: "Kết nối với các công cụ và dịch vụ bên ngoài.",
        action: "Xem tất cả",
        color: "text-emerald-500",
      },
      {
        icon: Shield,
        title: "Bảo mật",
        description: "Cấu hình các thiết lập bảo mật cho workspace.",
        action: "Cấu hình",
        color: "text-indigo-600",
      },
      {
        icon: Settings,
        title: "Nâng cao",
        description: "Các thiết lập nâng cao và tuỳ chỉnh khác.",
        action: "Cấu hình",
        color: "text-slate-600",
      },
    ];

    return (
      <div className="min-h-[calc(100vh-2rem)] py-4">
        <div className="grid min-h-[calc(100vh-4rem)] overflow-hidden rounded-lg border bg-background md:grid-cols-[220px_1fr]">
          <aside className="border-b bg-muted/20 p-3 md:border-b-0 md:border-r">
            <nav className="space-y-1 text-sm">
              {navigationItems.map(({ key, icon: Icon, label }) => (
                <button
                  key={label}
                  onClick={() => setActiveTab(key)}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left ${
                    activeTab === key ? "bg-violet-50 text-violet-700" : "text-foreground hover:bg-muted"
                  }`}
                  type="button"
                >
                  <Icon className="size-4" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="p-4">
            {activeTab === "members" ? selectedMember ? (
              <div className="space-y-5">
                <section className="rounded-lg border p-5">
                  <div className="mb-6 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedMemberIndex(null)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" />
                      Quay lại danh sách thành viên
                    </button>
                  </div>

                  <div className="flex gap-5">
                    <span className="relative flex size-20 items-center justify-center rounded-full bg-violet-100 text-xl font-semibold text-violet-700">
                      {selectedMember.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h1 className="text-xl font-semibold">{selectedMember.name}</h1>
                      <p className="mt-1 text-sm text-muted-foreground">{selectedMember.email}</p>
                      <div className="mt-4 flex gap-3">
                        {selectedMember.role === "OWNER" ? (
                          <span className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm">
                            Chủ sở hữu
                          </span>
                        ) : (
                          <select
                            value={toWorkspacePermissionRole(selectedMember.role)}
                            onChange={(event) =>
                              handleRoleChange(selectedMember.userId, event.target.value as WorkspaceMemberRole)
                            }
                            className="flex h-9 w-48 items-center rounded-md border px-3 text-sm"
                          >
                            {WORKSPACE_PERMISSION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-6 text-sm text-muted-foreground">
                    Tham gia từ {new Date(selectedMember.joinedAt).toLocaleDateString("vi-VN")}
                  </p>
                </section>

                <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                  <section className="rounded-lg border p-5">
                    <h2 className="font-semibold">Quyền trong Workspace</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Quyền xác định những gì thành viên có thể làm trong workspace này.</p>
                    <div className="mt-4 rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                      {WORKSPACE_PERMISSION_OPTIONS.find((option) => option.value === toWorkspacePermissionRole(selectedMember.role))?.description}
                    </div>
                  </section>

                  <div className="space-y-4">
                    <section className="rounded-lg border p-5">
                      <h2 className="font-semibold">Vai trò hiện tại</h2>
                      <div className="mt-4 flex gap-3">
                        <span className="flex size-10 items-center justify-center rounded-lg bg-violet-600 text-white">
                          <Shield className="size-5" />
                        </span>
                        <div>
                          <p className="font-medium">{ROLE_LABEL[selectedMember.role]}</p>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        className="mt-5 w-full"
                        disabled={selectedMember.role === "OWNER"}
                        onClick={() => handleRemoveMember(selectedMember.userId)}
                      >
                        <Trash2 className="size-4" />
                        Xóa khỏi workspace
                      </Button>
                    </section>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-lg font-semibold">Thành viên</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Quản lý các thành viên và quyền truy cập trong workspace.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsInviteOpen(true)}>
                      <Plus className="size-4" />
                      Mời thành viên
                    </Button>
                  </div>
                </div>

                <section className="grid rounded-lg border p-5 md:grid-cols-3">
                  {memberStats.map(({ icon: Icon, label, value, suffix, color }) => (
                    <div key={label} className="flex items-center gap-4 border-border py-2 md:border-r md:px-6 md:last:border-r-0">
                      <Icon className={`size-6 ${color}`} />
                      <div>
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-2xl font-semibold">{value}</p>
                        <p className="text-xs text-muted-foreground">{suffix}</p>
                      </div>
                    </div>
                  ))}
                </section>

                <section className="overflow-hidden rounded-lg border">
                  <div className="grid grid-cols-[1.7fr_1fr_1fr_80px] border-b bg-muted/20 px-5 py-3 text-xs font-semibold">
                    <span>Thành viên</span>
                    <span>Vai trò</span>
                    <span>Tham gia</span>
                    <span>Thao tác</span>
                  </div>
                  {membersLoading && (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">Đang tải danh sách thành viên...</div>
                  )}
                  {membersError && (
                    <div className="px-5 py-8 text-center text-sm text-red-600">{membersError}</div>
                  )}
                  {!membersLoading && !membersError && members.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">Chưa có thành viên nào.</div>
                  )}
                  {!membersLoading && members.map((member, index) => (
                    <div key={member.userId} className="grid grid-cols-[1.7fr_1fr_1fr_80px] items-center border-b px-5 py-3 text-sm last:border-b-0">
                      <button
                        type="button"
                        onClick={() => setSelectedMemberIndex(index)}
                        className="flex items-center gap-3 text-left"
                      >
                        <span className={`flex size-9 items-center justify-center rounded-full text-xs font-medium ${
                          index % 3 === 0 ? "bg-violet-100 text-violet-700" : index % 3 === 1 ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"
                        }`}>
                          {member.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">{member.name}</p>
                            {(member.role === "OWNER" || member.role === "FULL_ACCESS") && (
                              <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[11px] text-violet-700">
                                {member.role === "OWNER" ? "Chủ sở hữu" : "Toàn quyền"}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </button>
                      <span className="text-xs">{ROLE_LABEL[member.role]}</span>
                      <span className="text-xs">{new Date(member.joinedAt).toLocaleDateString("vi-VN")}</span>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label={`Xóa ${member.name}`}
                        disabled={member.role === "OWNER"}
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </section>
              </div>
            ) : (
              <>
            <section className="rounded-lg border p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h1 className="text-sm font-semibold">Thông tin chung</h1>
                <Button size="sm">Lưu thay đổi</Button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[130px_1fr_330px]">
                <div className="space-y-3">
                  <span className={`flex size-14 items-center justify-center rounded-xl ${className}`}>
                    <WorkspaceIcon className="size-8" strokeWidth={2.3} />
                  </span>
                  <Button variant="outline" size="sm" disabled>
                    Đổi ảnh
                  </Button>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2 text-xs font-medium">
                    <span>Tên Workspace</span>
                    <Input value={workspace.name} readOnly />
                  </label>
                  <label className="block space-y-2 text-xs font-medium">
                    <span>Mô tả</span>
                    <Textarea
                      value={workspace.description ?? "Nơi lưu trữ và quản lý tài liệu tương tác của đội ngũ VDocs."}
                      readOnly
                      className="min-h-20"
                    />
                  </label>
                  <label className="block space-y-2 text-xs font-medium">
                    <span>Ngôn ngữ mặc định</span>
                    <select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
                      <option>🇻🇳 Tiếng Việt</option>
                      <option>🇺🇸 English</option>
                      <option>🇨🇳 中文</option>
                    </select>
                  </label>
                </div>

                <div className="space-y-4">
                  <label className="block space-y-2 text-xs font-medium">
                    <span>Đường dẫn (URL)</span>
                    <Input value={workspace.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")} readOnly />
                  </label>
                  <div className="flex items-center gap-2 text-xs text-violet-700">
                    <LinkIcon className="size-3.5" />
                    <span className="min-w-0 flex-1 truncate">{workspaceUrl}</span>
                    <button
                      type="button"
                      aria-label="Sao chép đường dẫn"
                      onClick={async () => {
                        await navigator.clipboard.writeText(workspaceUrl);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1200);
                      }}
                    >
                      <Copy className="size-4" />
                    </button>
                  </div>
                  {copied && <p className="text-xs text-emerald-600">Đã sao chép liên kết</p>}
                  <label className="block space-y-2 text-xs font-medium">
                    <span>Múi giờ</span>
                    <select className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm">
                      <option>(GMT+07:00) Asia/Ho Chi Minh</option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            <div className="mt-3 space-y-3">
              {sections.map(({ icon: Icon, title, description, action, color }) => (
                <section key={title} className="flex items-center gap-4 rounded-lg border p-4">
                  <Icon className={`size-5 ${color}`} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="truncate text-xs text-muted-foreground">{description}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    {action}
                  </Button>
                </section>
              ))}

              <section className="flex items-center gap-4 rounded-lg border p-4">
                <LinkIcon className="size-5 text-violet-600" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold">Chia sẻ liên kết</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {canManageWorkspaceShare
                      ? "Tạo một liên kết công khai để chia sẻ toàn bộ workspace."
                      : "Chỉ chủ sở hữu hoặc người có toàn quyền mới có thể chia sẻ workspace."}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManageWorkspaceShare}
                  onClick={() => setIsShareOpen(true)}
                >
                  Cấu hình
                </Button>
              </section>

              <section className="flex items-center gap-4 rounded-lg border border-red-100 bg-red-50/70 p-4">
                <AlertTriangle className="size-5 text-red-500" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-red-700">Khu vực nguy hiểm</h2>
                  <p className="truncate text-xs text-red-700/70">Các hành động không thể hoàn tác. Hãy cẩn thận.</p>
                </div>
                <Button variant="destructive" size="sm" disabled>
                  <Trash2 className="size-4" />
                  Xóa Workspace
                </Button>
              </section>
            </div>
              </>
            )}
          </main>
        </div>
        {isInviteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <section className="flex max-h-[94vh] w-full max-w-[920px] flex-col rounded-lg bg-background shadow-xl">
              <div className="flex items-start justify-between p-6">
                <div>
                  <h2 className="text-lg font-semibold">Thêm thành viên</h2>
                  <p className="mt-5 font-semibold">1. Tìm thành viên</p>
                  <p className="mt-1 text-sm text-muted-foreground">Tìm kiếm bằng email hoặc tên người dùng đã đăng ký tài khoản trên VDocs.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInviteOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Đóng"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-auto px-6 pb-6">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder="Tìm kiếm bằng email hoặc tên người dùng"
                      value={larkSearch}
                      onChange={(event) => {
                        setLarkPage(1);
                        setLarkSearch(event.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-lg border">
                  <div className="min-w-0 overflow-auto">
                    <div className="grid min-w-[520px] grid-cols-[minmax(260px,1.3fr)_90px] border-b bg-muted/20 px-4 py-3 text-xs font-semibold">
                      <span>Người dùng</span>
                      <span />
                    </div>
                    {larkError && <p className="px-4 py-3 text-sm text-red-600">{larkError}</p>}
                    {!larkError && larkLoading && (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Đang tải danh sách...</p>
                    )}
                    {!larkError && !larkLoading && larkMembers.length === 0 && (
                      <p className="px-4 py-3 text-sm text-muted-foreground">Không tìm thấy thành viên phù hợp.</p>
                    )}
                    {!larkError &&
                      !larkLoading &&
                      larkMembers.map((member, index) => {
                        const selected = isLarkMemberSelected(member.id);

                        return (
                          <div
                            key={member.id}
                            className="grid min-w-[520px] grid-cols-[minmax(260px,1.3fr)_90px] items-center border-b px-4 py-3 text-sm last:border-b-0"
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex size-9 items-center justify-center rounded-full text-xs font-medium ${
                                  index % 3 === 0
                                    ? "bg-violet-100 text-violet-700"
                                    : index % 3 === 1
                                      ? "bg-slate-200 text-slate-700"
                                      : "bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {getInitials(member.name)}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{member.name}</p>
                                <p className="truncate text-xs text-muted-foreground">{member.email ?? "—"}</p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="xs"
                              className={selected ? "text-violet-700" : undefined}
                              onClick={() => toggleLarkMember(member)}
                            >
                              {selected ? "Đã thêm" : "+ Thêm"}
                            </Button>
                          </div>
                        );
                      })}
                    <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground">
                      <span>
                        Hiển thị {larkMembers.length === 0 ? 0 : (larkPage - 1) * LARK_MEMBERS_PAGE_SIZE + 1}-
                        {(larkPage - 1) * LARK_MEMBERS_PAGE_SIZE + larkMembers.length} trong tổng số {larkTotal} kết quả
                      </span>
                      <button type="button" className="ml-auto mr-4 text-violet-700">
                        Xem tất cả kết quả
                      </button>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon-sm"
                          disabled={larkPage <= 1}
                          onClick={() => setLarkPage((page) => Math.max(1, page - 1))}
                        >
                          ‹
                        </Button>
                        <span className="flex items-center px-2">
                          {larkPage}/{larkTotalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="icon-sm"
                          disabled={larkPage >= larkTotalPages}
                          onClick={() => setLarkPage((page) => Math.min(larkTotalPages, page + 1))}
                        >
                          ›
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
                  <div>
                    <h3 className="font-semibold">2. Thiết lập vai trò & quyền hạn</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Chọn vai trò và quyền hạn cho các thành viên sẽ được thêm vào workspace.</p>
                    <label className="mt-5 block space-y-2 text-sm">
	                      <span>Vai trò mặc định</span>
	                      <select
	                        value={inviteRole}
	                        onChange={(event) => setInviteRole(event.target.value as WorkspaceMemberRole)}
	                        className="h-14 w-full rounded-lg border border-input bg-background px-3 text-sm"
	                      >
                          {WORKSPACE_PERMISSION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
	                      </select>
                      <span className="block text-xs text-muted-foreground">
                        {WORKSPACE_PERMISSION_OPTIONS.find((option) => option.value === inviteRole)?.description}
                      </span>
                    </label>
                  </div>

                  <aside className="flex flex-col rounded-lg border p-5">
                    <h3 className="font-semibold">Thành viên sẽ được thêm ({selectedLarkMembers.length})</h3>
                    {selectedLarkMembers.length === 0 ? (
                      <p className="mt-4 text-sm text-muted-foreground">Chưa chọn thành viên nào.</p>
                    ) : (
                      <div className="mt-4 space-y-3 overflow-auto">
                        {selectedLarkMembers.map((member) => (
                          <div key={member.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex size-8 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700">
                                {getInitials(member.name)}
                              </span>
                              <div>
                                <p className="text-sm">{member.name}</p>
                                <p className="text-xs text-muted-foreground">{member.email}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleLarkMember(member)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label={`Bỏ chọn ${member.name}`}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {larkInviteError && <p className="mt-3 text-sm text-red-600">{larkInviteError}</p>}
                    <div className="mt-8 flex justify-end gap-3 border-t pt-5">
                      <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                        Hủy
                      </Button>
                      <Button
                        onClick={handleLarkInviteSubmit}
                        disabled={selectedLarkMembers.length === 0 || larkInviteLoading}
                      >
                        {larkInviteLoading
                          ? "Đang mời..."
                          : `Mời thành viên (${selectedLarkMembers.length})`}
                      </Button>
                    </div>
                  </aside>
                </div>
              </div>
            </section>
          </div>
        )}
        {isShareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <section className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <h2 className="text-lg font-semibold">Chia sẻ liên kết Workspace</h2>
                <button
                  type="button"
                  onClick={() => setIsShareOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Đóng"
                >
                  <X className="size-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Bất kỳ ai có liên kết này đều có thể xem toàn bộ tài liệu trong workspace.
              </p>

              {shareError && <p className="mt-3 text-sm text-red-600">{shareError}</p>}

              <div className="mt-5">
                {workspaceShareToken ? (
                  <>
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                      <LinkIcon className="size-4 shrink-0 text-violet-600" />
                      <span className="min-w-0 flex-1 truncate">{workspaceShareUrl}</span>
                      <button
                        type="button"
                        aria-label="Sao chép đường dẫn"
                        onClick={() => handleCopyWorkspaceShareLink(workspaceShareUrl)}
                      >
                        {shareLinkCopied ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                    </div>
                    {shareLinkCopied && (
                      <p className="mt-2 text-xs text-emerald-600">Đã sao chép liên kết</p>
                    )}
                    <Button
                      variant="destructive"
                      className="mt-4 w-full"
                      disabled={shareLoading}
                      onClick={handleRevokeWorkspaceShareLink}
                    >
                      <Trash2 className="size-4" />
                      Thu hồi liên kết
                    </Button>
                  </>
                ) : (
                  <Button
                    className="w-full"
                    disabled={shareLoading}
                    onClick={handleCreateWorkspaceShareLink}
                  >
                    {shareLoading ? "Đang tạo liên kết..." : "Tạo liên kết chia sẻ"}
                  </Button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] flex-col items-center justify-center gap-3 text-center">
      <FileText strokeWidth={1.5} className="size-12 text-muted-foreground" />
      <div>
        <p className="text-lg font-medium">{t("emptyWelcomeTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("emptyWelcomeDescription")}</p>
      </div>
    </div>
  );
}
