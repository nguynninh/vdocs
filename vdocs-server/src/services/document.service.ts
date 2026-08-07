import type { Document } from "../generated/prisma/client.js";
import type {
  DocumentPermission,
  LinkAccess,
} from "../dtos/response/DocumentPermission.ts";
import { documentRepository } from "../repositories/document.repository.ts";
import { generateShareToken } from "../utils/shareToken.ts";

export class DocumentNotFoundError extends Error {}
export class DocumentForbiddenError extends Error {}
export class NoWorkspaceError extends Error {}
export class UserNotFoundError extends Error {}
export class ShareLinkNotFoundError extends Error {}

export type MemberRole = "FULL_ACCESS" | "EDITOR" | "COMMENTER" | "VIEWER";

/**
 * Single source of truth for document access — used by both the REST
 * router and the Socket.IO join handler so the two never diverge.
 */
export async function getDocumentPermission(
  document: Document,
  userId: string | null
): Promise<DocumentPermission | null> {
  if (userId) {
    if (document.ownerId === userId) {
      return "OWNER";
    }

    const member = await documentRepository.findMemberRole(document.id, userId);

    if (member) {
      return member.role as DocumentPermission;
    }

    const workspaceMember = await documentRepository.findWorkspaceMembership(
      document.workspaceId,
      userId
    );

    if (workspaceMember) {
      return "EDITOR";
    }
  }

  if (document.linkAccess === "VIEWER" || document.linkAccess === "COMMENTER") {
    return document.linkAccess;
  }

  if (document.linkAccess === "EDITOR") {
    // Anonymous visitors never get edit rights via a link — editing always
    // requires a real account, even when the link itself is set to EDITOR.
    return userId ? "EDITOR" : "COMMENTER";
  }

  return null;
}

export function canEdit(permission: DocumentPermission): boolean {
  return (
    permission === "OWNER" ||
    permission === "FULL_ACCESS" ||
    permission === "EDITOR"
  );
}

export function canManageAccess(permission: DocumentPermission): boolean {
  return permission === "OWNER" || permission === "FULL_ACCESS";
}

async function requireDocumentAndPermission(
  documentId: string,
  userId: string | null
) {
  const document = await documentRepository.findById(documentId);

  if (!document) {
    throw new DocumentNotFoundError(`Document ${documentId} not found`);
  }

  const permission = await getDocumentPermission(document, userId);

  if (!permission) {
    throw new DocumentForbiddenError(
      `${userId ? `User ${userId}` : "Anonymous visitor"} has no access to document ${documentId}`
    );
  }

  return { document, permission };
}

async function createDocument(
  userId: string,
  title?: string,
  workspaceId?: string,
  parentId?: string
) {
  let targetWorkspaceId = workspaceId;

  // A parent document pins the workspace — nesting under a page you can see
  // must land in that page's own workspace, not whatever was passed in.
  if (parentId) {
    const parent = await documentRepository.findById(parentId);

    if (!parent || parent.archivedAt) {
      throw new DocumentNotFoundError(`Document ${parentId} not found`);
    }

    const permission = await getDocumentPermission(parent, userId);
    if (!permission || !canEdit(permission)) {
      throw new DocumentForbiddenError(
        `User ${userId} cannot add a child document under ${parentId}`
      );
    }

    targetWorkspaceId = parent.workspaceId;
  } else if (targetWorkspaceId) {
    const membership = await documentRepository.findWorkspaceMembership(
      targetWorkspaceId,
      userId
    );

    if (!membership) {
      throw new DocumentForbiddenError(
        `User ${userId} is not a member of workspace ${targetWorkspaceId}`
      );
    }
  } else {
    const membership = await documentRepository.findPersonalWorkspace(userId);

    if (!membership) {
      throw new NoWorkspaceError(`User ${userId} has no workspace`);
    }

    targetWorkspaceId = membership.workspaceId;
  }

  return documentRepository.create({
    workspaceId: targetWorkspaceId,
    ownerId: userId,
    title: title?.trim() ?? "",
    parentId,
  });
}

async function listDocuments(userId: string, workspaceId?: string) {
  if (workspaceId) {
    const membership = await documentRepository.findWorkspaceMembership(
      workspaceId,
      userId
    );

    if (!membership) {
      throw new DocumentForbiddenError(
        `User ${userId} is not a member of workspace ${workspaceId}`
      );
    }

    return documentRepository.listForWorkspaces([workspaceId]);
  }

  const membership = await documentRepository.findPersonalWorkspace(userId);

  if (!membership) {
    return [];
  }

  return documentRepository.listForWorkspaces([membership.workspaceId]);
}

async function getDocument(documentId: string, userId: string | null) {
  return requireDocumentAndPermission(documentId, userId);
}

async function updateDocument(
  documentId: string,
  userId: string,
  data: { title?: string; icon?: string; parentId?: string | null; order?: number }
) {
  const { permission } = await requireDocumentAndPermission(documentId, userId);

  if (!canEdit(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot edit document ${documentId}`
    );
  }

  return documentRepository.updateMetadata(documentId, data);
}

async function trashDocument(documentId: string, userId: string) {
  const { permission } = await requireDocumentAndPermission(documentId, userId);

  if (!canEdit(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot trash document ${documentId}`
    );
  }

  return documentRepository.archive(documentId);
}

async function listTrash(userId: string, workspaceId?: string) {
  if (workspaceId) {
    const membership = await documentRepository.findWorkspaceMembership(
      workspaceId,
      userId
    );

    if (!membership) {
      throw new DocumentForbiddenError(
        `User ${userId} is not a member of workspace ${workspaceId}`
      );
    }

    return documentRepository.listArchivedForWorkspaces([workspaceId]);
  }

  const membership = await documentRepository.findPersonalWorkspace(userId);

  if (!membership) {
    return [];
  }

  return documentRepository.listArchivedForWorkspaces([membership.workspaceId]);
}

async function restoreDocument(documentId: string, userId: string) {
  const { permission } = await requireDocumentAndPermission(documentId, userId);

  if (!canEdit(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot restore document ${documentId}`
    );
  }

  return documentRepository.restore(documentId);
}

async function permanentlyDeleteDocument(documentId: string, userId: string) {
  const { document, permission } = await requireDocumentAndPermission(
    documentId,
    userId
  );

  if (!canManageAccess(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot permanently delete document ${documentId}`
    );
  }

  if (!document.archivedAt) {
    throw new DocumentForbiddenError(
      `Document ${documentId} must be trashed before it can be permanently deleted`
    );
  }

  await documentRepository.hardDelete(documentId);
}

async function updateLinkAccess(
  documentId: string,
  userId: string,
  linkAccess: LinkAccess
) {
  const { permission } = await requireDocumentAndPermission(documentId, userId);

  if (!canManageAccess(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot change access for document ${documentId}`
    );
  }

  return documentRepository.updateLinkAccess(documentId, linkAccess);
}

async function requireManageAccess(documentId: string, userId: string) {
  const { document, permission } = await requireDocumentAndPermission(
    documentId,
    userId
  );

  if (!canManageAccess(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot manage members for document ${documentId}`
    );
  }

  return document;
}

async function listMembers(documentId: string, userId: string) {
  await requireDocumentAndPermission(documentId, userId);

  return documentRepository.listMembers(documentId);
}

async function inviteMember(
  documentId: string,
  userId: string,
  email: string,
  role: MemberRole
) {
  await requireManageAccess(documentId, userId);

  const invitedUser = await documentRepository.findUserByEmail(email.trim());

  if (!invitedUser) {
    throw new UserNotFoundError(`No user found with email ${email}`);
  }

  return documentRepository.upsertMember(documentId, invitedUser.id, role);
}

async function updateMemberRole(
  documentId: string,
  userId: string,
  targetUserId: string,
  role: MemberRole
) {
  await requireManageAccess(documentId, userId);

  return documentRepository.updateMemberRole(documentId, targetUserId, role);
}

async function removeMember(
  documentId: string,
  userId: string,
  targetUserId: string
) {
  await requireManageAccess(documentId, userId);

  await documentRepository.removeMember(documentId, targetUserId);
}

async function getOrCreateShareLink(documentId: string, userId: string) {
  const { permission } = await requireDocumentAndPermission(documentId, userId);

  if (!canManageAccess(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot create a share link for document ${documentId}`
    );
  }

  const existing = await documentRepository.findActiveShareLink(documentId);

  if (existing) {
    return existing;
  }

  return documentRepository.createShareLink({
    documentId,
    token: generateShareToken(),
    createdBy: userId,
  });
}

async function revokeShareLink(documentId: string, userId: string) {
  const { permission } = await requireDocumentAndPermission(documentId, userId);

  if (!canManageAccess(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot revoke the share link for document ${documentId}`
    );
  }

  await documentRepository.deactivateShareLinks(documentId);
}

async function getDocumentByShareToken(token: string, userId: string | null) {
  const shareLink = await documentRepository.findShareLinkByToken(token);

  if (!shareLink || !shareLink.isActive) {
    throw new ShareLinkNotFoundError(`Share link ${token} not found`);
  }

  if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
    throw new ShareLinkNotFoundError(`Share link ${token} has expired`);
  }

  const permission = await getDocumentPermission(shareLink.document, userId);

  if (!permission) {
    throw new DocumentForbiddenError(
      `${userId ? `User ${userId}` : "Anonymous visitor"} has no access via share link ${token}`
    );
  }

  return { document: shareLink.document, permission };
}

export const documentService = {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  trashDocument,
  listTrash,
  restoreDocument,
  permanentlyDeleteDocument,
  updateLinkAccess,
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  getOrCreateShareLink,
  revokeShareLink,
  getDocumentByShareToken,
};
