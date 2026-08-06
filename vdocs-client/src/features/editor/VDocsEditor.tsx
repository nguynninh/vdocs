"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { EditorContent } from "./react/EditorContent";
import { EditorProvider, useEditor } from "./react/EditorProvider";
import { DocumentRenderer } from "./react/renderer/DocumentRenderer";
import type { PageIcon } from "./ui/icon-picker/PageIcon";
import { EditorHeader } from "./ui/header";
import type { ShareMember, AssignableRole } from "./ui/header/SharePanel";
import { PageHeader } from "./ui/page-header";
import { Toolbar } from "./ui/toolbar";
import { documentApi, type LinkAccess } from "./data/api/documentApi";
import { getMe } from "@/src/features/auth/api";
import { debounce } from "./utils/debounce";
import type { DocumentPermission } from "./collaboration/collaboration.types";

export interface VDocsEditorProps {
  documentId: string;
  initialTitle?: string;
  initialIcon?: PageIcon;
  initialContent?: Uint8Array;
  initialPermission?: DocumentPermission;
  initialLinkAccess?: LinkAccess;
  initialCreatedAt?: string;
  initialUpdatedAt?: string;
}

export function VDocsEditor({
  documentId,
  initialTitle = "",
  initialIcon,
  initialContent,
  initialPermission,
  initialLinkAccess = "NONE",
  initialCreatedAt,
  initialUpdatedAt,
}: VDocsEditorProps) {
  const t = useTranslations("editorHeader");
  const tActivity = useTranslations("editorHeader.activity");
  const format = useFormatter();
  const untitledLabel = t("untitled");
  const [title, setTitle] = useState(initialTitle);
  const [icon, setIcon] = useState<PageIcon | undefined>(initialIcon);
  const [hasCover, setHasCover] = useState(false);
  const [linkAccess, setLinkAccess] = useState<LinkAccess>(initialLinkAccess);
  const [members, setMembers] = useState<ShareMember[]>([]);
  const canEdit =
    initialPermission === "OWNER" ||
    initialPermission === "FULL_ACCESS" ||
    initialPermission === "EDITOR";

  const handleLinkAccessChange = (next: LinkAccess) => {
    setLinkAccess(next);
    documentApi.updateAccess(documentId, next).catch((error) => {
      console.error("Failed to update document access", error);
    });
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((error) => {
        console.error("Failed to copy link", error);
      });
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
    } catch (error) {
      console.error("Failed to copy link", error);
    }
    document.body.removeChild(textarea);
  };

  const handleCopyLink = () => {
    documentApi
      .createShareLink(documentId)
      .then((response) => {
        const shareUrl = `${window.location.origin}/share/${response.data.token}`;
        copyToClipboard(shareUrl);
      })
      .catch((error) => {
        console.error("Failed to create share link", error);
      });
  };

  useEffect(() => {
    if (!canEdit) return;

    let cancelled = false;

    async function loadMembers() {
      try {
        const [meResponse, membersResponse] = await Promise.all([
          getMe(),
          documentApi.listMembers(documentId),
        ]);

        if (cancelled) return;

        const me = meResponse.data.user;
        const meId = me.id;

        const others: ShareMember[] = membersResponse.data
          .filter((member) => member.userId !== meId)
          .map((member) => ({
            id: member.userId,
            name: member.name,
            email: member.email ?? "",
            avatarUrl: member.avatar ?? undefined,
            role: member.role,
          }));

        setMembers([
          {
            id: meId,
            name: me.name,
            email: me.email ?? "",
            avatarUrl: me.avatar,
            isYou: true,
            role: initialPermission ?? "VIEWER",
          },
          ...others,
        ]);
      } catch (error) {
        console.error("Failed to load document members", error);
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [documentId, initialPermission, canEdit]);

  const handleInvite = (value: string, role: AssignableRole) => {
    const email = value.trim();
    if (!email) return;

    documentApi
      .inviteMember(documentId, email, role)
      .then((response) => {
        const invited = response.data;
        setMembers((prev) => [
          ...prev.filter((member) => member.id !== invited.userId),
          {
            id: invited.userId,
            name: invited.name,
            email: invited.email ?? "",
            avatarUrl: invited.avatar ?? undefined,
            role: invited.role,
          },
        ]);
      })
      .catch((error) => {
        console.error("Failed to invite member", error);
      });
  };

  const handleMemberRoleChange = (memberId: string, role: AssignableRole) => {
    setMembers((prev) =>
      prev.map((member) => (member.id === memberId ? { ...member, role } : member)),
    );
    documentApi.updateMemberRole(documentId, memberId, role).catch((error) => {
      console.error("Failed to update member role", error);
    });
  };

  const handleMemberRemove = (memberId: string) => {
    setMembers((prev) => prev.filter((member) => member.id !== memberId));
    documentApi.removeMember(documentId, memberId).catch((error) => {
      console.error("Failed to remove member", error);
    });
  };

  const saveMetadata = useMemo(
    () =>
      debounce((payload: { title?: string; icon?: string }) => {
        documentApi.update(documentId, payload).catch((error) => {
          console.error("Failed to save document metadata", error);
        });
      }, 500),
    [documentId],
  );

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    saveMetadata({ title: nextTitle });
  };

  const handleIconChange = (nextIcon: PageIcon | undefined) => {
    setIcon(nextIcon);
    saveMetadata({ icon: nextIcon ? JSON.stringify(nextIcon) : "" });
  };

  return (
    <div className="flex h-dvh flex-col">
      <EditorProvider
        documentId={documentId}
        initialContent={initialContent}
        initialPermission={initialPermission}
      >
        <EditorHeaderWithWordCount
          documentId={documentId}
          icon={icon}
          title={title}
          untitledLabel={untitledLabel}
          onTitleChange={handleTitleChange}
          initialUpdatedAt={initialUpdatedAt}
          initialCreatedAt={initialCreatedAt}
          format={format}
          tActivity={tActivity}
          members={members}
          onInvite={handleInvite}
          onMemberRoleChange={handleMemberRoleChange}
          onMemberRemove={handleMemberRemove}
          linkAccess={linkAccess}
          onLinkAccessChange={handleLinkAccessChange}
          canManageAccess={initialPermission === "OWNER" || initialPermission === "FULL_ACCESS"}
          onCopyLink={handleCopyLink}
        />

        <EditorContent>
          <Toolbar />
          <PageHeader
            icon={icon}
            onIconSelect={handleIconChange}
            onIconRemove={() => handleIconChange(undefined)}
            hasCover={hasCover}
            onAddCover={() => setHasCover(true)}
            onAddComment={() => {}}
            title={title}
            placeholder={untitledLabel}
            onTitleChange={handleTitleChange}
          />
          <DocumentRenderer />
        </EditorContent>
      </EditorProvider>
    </div>
  );
}

interface EditorHeaderWithWordCountProps {
  documentId: string;
  icon?: PageIcon;
  title: string;
  untitledLabel: string;
  onTitleChange: (title: string) => void;
  initialUpdatedAt?: string;
  initialCreatedAt?: string;
  format: ReturnType<typeof useFormatter>;
  tActivity: ReturnType<typeof useTranslations>;
  members: ShareMember[];
  onInvite: (value: string, role: AssignableRole) => void;
  onMemberRoleChange: (memberId: string, role: AssignableRole) => void;
  onMemberRemove: (memberId: string) => void;
  linkAccess: LinkAccess;
  onLinkAccessChange: (next: LinkAccess) => void;
  canManageAccess: boolean;
  onCopyLink: () => void;
}

function EditorHeaderWithWordCount({
  documentId,
  icon,
  title,
  untitledLabel,
  onTitleChange,
  initialUpdatedAt,
  initialCreatedAt,
  format,
  tActivity,
  members,
  onInvite,
  onMemberRoleChange,
  onMemberRemove,
  linkAccess,
  onLinkAccessChange,
  canManageAccess,
  onCopyLink,
}: EditorHeaderWithWordCountProps) {
  const { wordCount, canEdit } = useEditor();

  return (
    <EditorHeader
      documentId={documentId}
      icon={icon}
      title={title}
      placeholder={untitledLabel}
      onTitleChange={canEdit ? onTitleChange : undefined}
      isPrivate
      canEdit={canEdit}
      wordCount={wordCount}
      editedBy={{
        actorName: "Nguyễn Ninh",
        timeLabel: initialUpdatedAt
          ? format.dateTime(new Date(initialUpdatedAt), { dateStyle: "medium", timeStyle: "short" })
          : tActivity("justNow"),
      }}
      createdBy={{
        actorName: "Nguyễn Ninh",
        timeLabel: initialCreatedAt
          ? format.dateTime(new Date(initialCreatedAt), { dateStyle: "medium" })
          : tActivity("justNow"),
      }}
      members={members}
      onInvite={onInvite}
      onMemberRoleChange={onMemberRoleChange}
      onMemberRemove={onMemberRemove}
      linkAccess={linkAccess}
      onLinkAccessChange={onLinkAccessChange}
      canManageAccess={canManageAccess}
      onCopyLink={onCopyLink}
    />
  );
}
