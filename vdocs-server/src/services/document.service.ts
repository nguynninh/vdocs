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

export type MemberRole =
  | "FULL_ACCESS"
  | "EDITOR"
  | "COMMENTER"
  | "VIEWER"
  | "BLOCK";

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

    // A DocumentMember row set on this document, or on the nearest ancestor
    // that has one, always wins — that's how a page overrides the access it
    // would otherwise inherit from its parent (or, ultimately, the workspace).
    const inheritedRole = await documentRepository.findInheritedMemberRole(
      document.id,
      userId
    );

    if (inheritedRole) {
      return inheritedRole as DocumentPermission;
    }

    const workspaceMember = await documentRepository.findWorkspaceMembership(
      document.workspaceId,
      userId
    );

    if (workspaceMember) {
      return mapWorkspaceRoleToDocumentPermission(workspaceMember.role);
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

function mapWorkspaceRoleToDocumentPermission(
  workspaceRole: string
): DocumentPermission {
  switch (workspaceRole) {
    case "OWNER":
    case "FULL_ACCESS":
      return "FULL_ACCESS";
    case "EDITOR":
      return "EDITOR";
    case "COMMENTER":
      return "COMMENTER";
    case "BLOCK":
      return "BLOCK";
    default:
      return "VIEWER";
  }
}

// "BLOCK" is a real, truthy permission value (an explicit deny), not the
// absence of one — callers must check for it alongside `null`.
export function isBlocked(
  permission: DocumentPermission | null
): permission is null | "BLOCK" {
  return permission === null || permission === "BLOCK";
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

  if (isBlocked(permission)) {
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

async function withFavoriteFlags<T extends { id: string }>(
  documents: T[],
  userId: string
) {
  const favoriteIds = await documentRepository.listFavoriteIds(
    userId,
    documents.map((document) => document.id)
  );

  return documents.map((document) => ({
    ...document,
    favorite: favoriteIds.has(document.id),
  }));
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

    const documents = await documentRepository.listForWorkspaces([workspaceId]);
    return withFavoriteFlags(documents, userId);
  }

  const membership = await documentRepository.findPersonalWorkspace(userId);

  if (!membership) {
    return [];
  }

  const documents = await documentRepository.listForWorkspaces([
    membership.workspaceId,
  ]);
  return withFavoriteFlags(documents, userId);
}

async function addFavorite(documentId: string, userId: string) {
  await requireDocumentAndPermission(documentId, userId);
  await documentRepository.addFavorite(documentId, userId);
  return { favorited: true };
}

async function removeFavorite(documentId: string, userId: string) {
  await documentRepository.removeFavorite(documentId, userId);
  return { favorited: false };
}

async function getFavoritesCount(userId: string) {
  return documentRepository.countFavorites(userId);
}

async function getSharedCount(userId: string) {
  return documentRepository.countSharedWithUser(userId);
}

async function getDocument(documentId: string, userId: string | null) {
  return requireDocumentAndPermission(documentId, userId);
}

/**
 * Lists every descendant of `documentId` (its full subtree), for populating
 * the share page's table of contents. Access follows the same rule as the
 * document itself: a valid `shareToken` elevates an otherwise-blocked
 * visitor to VIEWER, mirroring resolveShareToken.
 */
async function getDocumentChildren(
  documentId: string,
  userId: string | null,
  shareToken?: string
) {
  const document = await documentRepository.findById(documentId);

  if (!document) {
    throw new DocumentNotFoundError(`Document ${documentId} not found`);
  }

  let permission = await getDocumentPermission(document, userId);

  if (isBlocked(permission) && shareToken) {
    const resolved = await resolveShareToken(shareToken, userId);
    if (resolved.document.id === documentId) {
      permission = resolved.permission;
    }
  }

  if (isBlocked(permission)) {
    throw new DocumentForbiddenError(
      `${userId ? `User ${userId}` : "Anonymous visitor"} has no access to document ${documentId}`
    );
  }

  const workspaceDocuments = await documentRepository.listForWorkspaces([
    document.workspaceId,
  ]);

  const childrenByParentId = new Map<string, typeof workspaceDocuments>();
  for (const candidate of workspaceDocuments) {
    if (!candidate.parentId) continue;
    const siblings = childrenByParentId.get(candidate.parentId) ?? [];
    siblings.push(candidate);
    childrenByParentId.set(candidate.parentId, siblings);
  }

  const descendants: typeof workspaceDocuments = [];
  const queue = [documentId];
  while (queue.length) {
    const parentId = queue.shift() as string;
    const children = childrenByParentId.get(parentId) ?? [];
    for (const child of children) {
      descendants.push(child);
      queue.push(child.id);
    }
  }

  return descendants;
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
  const document = await requireManageAccess(documentId, userId);

  if (targetUserId === document.ownerId) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot change the role of the owner of document ${documentId}`
    );
  }

  return documentRepository.updateMemberRole(documentId, targetUserId, role);
}

async function removeMember(
  documentId: string,
  userId: string,
  targetUserId: string
) {
  const document = await requireManageAccess(documentId, userId);

  if (targetUserId === document.ownerId) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot remove the owner of document ${documentId}`
    );
  }

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

/**
 * Resolves a valid, active share link's document and permission — a valid
 * link always grants at least VIEWER access, on top of whatever stronger
 * access the visitor already has (ownership, membership, or linkAccess).
 * Used by both the REST share route and the Socket.IO join handler so a
 * share-link viewer's live editor session and initial fetch never diverge.
 */
export async function resolveShareToken(token: string, userId: string | null) {
  const shareLink = await documentRepository.findShareLinkByToken(token);

  if (!shareLink || !shareLink.isActive) {
    throw new ShareLinkNotFoundError(`Share link ${token} not found`);
  }

  if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
    throw new ShareLinkNotFoundError(`Share link ${token} has expired`);
  }

  const permission = await getDocumentPermission(shareLink.document, userId);

  return {
    document: shareLink.document,
    permission: permission && !isBlocked(permission) ? permission : "VIEWER",
  };
}

async function getDocumentByShareToken(token: string, userId: string | null) {
  return resolveShareToken(token, userId);
}

/**
 * Same as resolveShareToken, but for a document nested under the shared
 * root (a child/grandchild page reached from the share page's sidebar).
 * Walks the target's parentId chain to confirm it descends from the
 * share link's document before granting VIEWER access.
 */
export async function resolveDescendantViaShareToken(
  documentId: string,
  token: string,
  userId: string | null
) {
  const shareLink = await documentRepository.findShareLinkByToken(token);

  if (!shareLink || !shareLink.isActive) {
    throw new ShareLinkNotFoundError(`Share link ${token} not found`);
  }

  if (shareLink.expiresAt && shareLink.expiresAt.getTime() < Date.now()) {
    throw new ShareLinkNotFoundError(`Share link ${token} has expired`);
  }

  const document = await documentRepository.findById(documentId);

  if (!document) {
    throw new DocumentNotFoundError(`Document ${documentId} not found`);
  }

  let currentId: string | null = documentId;
  let isDescendant = false;
  while (currentId) {
    if (currentId === shareLink.documentId) {
      isDescendant = true;
      break;
    }
    const current: { parentId: string | null } | null =
      await documentRepository.findById(currentId);
    currentId = current?.parentId ?? null;
  }

  if (!isDescendant) {
    throw new DocumentForbiddenError(
      `Document ${documentId} is not reachable via share link ${token}`
    );
  }

  const permission = await getDocumentPermission(document, userId);

  return {
    document,
    permission: permission && !isBlocked(permission) ? permission : "VIEWER",
  };
}

export const documentService = {
  createDocument,
  listDocuments,
  getDocument,
  getDocumentChildren,
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
  resolveDescendantViaShareToken,
  addFavorite,
  removeFavorite,
  getFavoritesCount,
  getSharedCount,
};
