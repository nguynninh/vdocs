"use client";

import { ChevronDown, Link as LinkIcon, Lock, Globe, Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type LinkAccess = "NONE" | "VIEWER" | "COMMENTER" | "EDITOR";
export type MemberRole = "FULL_ACCESS" | "EDITOR" | "COMMENTER" | "VIEWER";
export type AssignableRole = MemberRole;

function memberRoleLabel(t: (key: string) => string, role: "OWNER" | MemberRole) {
  switch (role) {
    case "OWNER":
    case "FULL_ACCESS":
      return t("fullAccess");
    case "EDITOR":
      return t("canEdit");
    case "COMMENTER":
      return t("canComment");
    case "VIEWER":
      return t("canView");
  }
}

function linkAccessLabel(t: (key: string) => string, access: LinkAccess) {
  switch (access) {
    case "EDITOR":
      return t("canEdit");
    case "COMMENTER":
      return t("canComment");
    case "VIEWER":
    default:
      return t("canView");
  }
}

export interface ShareMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  isYou?: boolean;
  role: "OWNER" | MemberRole;
}

export interface SharePanelProps {
  members: ShareMember[];
  onInvite?: (value: string, role: AssignableRole) => void;
  onCopyLink?: () => void;
  linkAccess?: LinkAccess;
  onLinkAccessChange?: (next: LinkAccess) => void;
  canManageAccess?: boolean;
  onMemberRoleChange?: (memberId: string, role: AssignableRole) => void;
  onMemberRemove?: (memberId: string) => void;
}

export function SharePanel(props: SharePanelProps) {
  const {
    members,
    onInvite,
    onCopyLink,
    linkAccess = "NONE",
    onLinkAccessChange,
    canManageAccess = false,
    onMemberRoleChange,
    onMemberRemove,
  } = props;

  const t = useTranslations("editorHeader.sharePanel");
  const [tab, setTab] = useState<"share" | "publish">("share");
  const [inviteValue, setInviteValue] = useState("");
  const [inviteRole, setInviteRole] = useState<AssignableRole>("EDITOR");

  return (
    <div className="w-96 p-3 text-sm">
      <div className="mb-3 flex items-center gap-4 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("share")}
          className={cn(
            "border-b-2 pb-2 text-sm font-medium",
            tab === "share"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("shareTab")}
        </button>
        <button
          type="button"
          onClick={() => setTab("publish")}
          className={cn(
            "border-b-2 pb-2 text-sm font-medium",
            tab === "publish"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("publishTab")}
        </button>
      </div>

      {tab === "share" ? (
        <>
          <div className="flex items-center gap-2">
            <Input
              value={inviteValue}
              onChange={(e) => setInviteValue(e.target.value)}
              placeholder={t("invitePlaceholder")}
              className="h-8 flex-1 text-sm"
            />
            <Button
              size="sm"
              onClick={() => {
                onInvite?.(inviteValue, inviteRole);
                setInviteValue("");
              }}
            >
              {t("shareTab")}
            </Button>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm text-foreground">
                      {member.name}
                      {member.isYou && (
                        <span className="text-muted-foreground"> ({t("you")})</span>
                      )}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {member.email}
                    </div>
                  </div>
                </div>
                {member.role === "OWNER" || !canManageAccess ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {memberRoleLabel(t, member.role)}
                  </span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:bg-muted">
                      <span>{memberRoleLabel(t, member.role)}</span>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onMemberRoleChange?.(member.id, "FULL_ACCESS")}>
                        {t("fullAccess")}
                        {member.role === "FULL_ACCESS" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMemberRoleChange?.(member.id, "EDITOR")}>
                        {t("canEdit")}
                        {member.role === "EDITOR" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMemberRoleChange?.(member.id, "COMMENTER")}>
                        {t("canComment")}
                        {member.role === "COMMENTER" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onMemberRoleChange?.(member.id, "VIEWER")}>
                        {t("canView")}
                        {member.role === "VIEWER" && <Check className="ml-auto h-4 w-4" />}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onMemberRemove?.(member.id)}>
                        {t("remove")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-border pt-3">
            <div className="mb-1 text-xs font-medium text-muted-foreground">
              {t("generalAccess")}
            </div>
            <div className="flex items-center justify-between gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={!canManageAccess}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm",
                    canManageAccess ? "hover:bg-muted" : "cursor-default opacity-80"
                  )}
                >
                  {linkAccess === "NONE" ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span>{linkAccess === "NONE" ? t("onlyInvited") : t("anyoneWithLink")}</span>
                  {canManageAccess && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-80">
                  <DropdownMenuItem onClick={() => onLinkAccessChange?.("NONE")}>
                    <Lock className="h-4 w-4" />
                    <div className="flex-1">
                      <div>{t("onlyInvited")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("onlyInvitedDescription")}
                      </div>
                    </div>
                    {linkAccess === "NONE" && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onLinkAccessChange?.(linkAccess === "NONE" ? "VIEWER" : linkAccess)}
                  >
                    <Globe className="h-4 w-4" />
                    <div className="flex-1">
                      <div>{t("anyoneWithLink")}</div>
                      <div className="text-xs text-muted-foreground">
                        {t("anyoneWithLinkDescription")}
                      </div>
                    </div>
                    {linkAccess !== "NONE" && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {linkAccess !== "NONE" && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={!canManageAccess}
                    className={cn(
                      "flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground",
                      canManageAccess ? "hover:bg-muted" : "cursor-default opacity-80"
                    )}
                  >
                    <span>{linkAccessLabel(t, linkAccess)}</span>
                    {canManageAccess && <ChevronDown className="h-3.5 w-3.5" />}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem onClick={() => onLinkAccessChange?.("VIEWER")}>
                      {t("canView")}
                      {linkAccess === "VIEWER" && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onLinkAccessChange?.("COMMENTER")}>
                      {t("canComment")}
                      {linkAccess === "COMMENTER" && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onLinkAccessChange?.("EDITOR")}>
                      {t("canEdit")}
                      {linkAccess === "EDITOR" && <Check className="ml-auto h-4 w-4" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <a href="#" className="text-xs text-muted-foreground hover:underline">
              {t("learnAboutSharing")}
            </a>
            <Button variant="outline" size="sm" onClick={onCopyLink}>
              <LinkIcon className="h-3.5 w-3.5" />
              {t("copyLink")}
            </Button>
          </div>
        </>
      ) : (
        <div className="py-6 text-center text-sm text-muted-foreground">
          {t("publishPlaceholder")}
        </div>
      )}
    </div>
  );
}
