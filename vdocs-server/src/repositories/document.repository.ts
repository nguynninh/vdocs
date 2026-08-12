import { prisma } from "../configuration/prisma.ts";

function findById(documentId: string) {
  return prisma.document.findUnique({
    where: { id: documentId },
  });
}

function findMemberRole(documentId: string, userId: string) {
  return prisma.documentMember.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId,
      },
    },
  });
}

function findWorkspaceMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });
}

// Walks the document tree from `documentId` up to the root, returning the
// role of the nearest ancestor (including the document itself) that has an
// explicit DocumentMember row for this user. A closer override always wins
// over one set further up the chain.
async function findInheritedMemberRole(documentId: string, userId: string) {
  let currentId: string | null = documentId;

  while (currentId) {
    const member = await prisma.documentMember.findUnique({
      where: { documentId_userId: { documentId: currentId, userId } },
    });

    if (member) {
      return member.role;
    }

    const current: { parentId: string | null } | null =
      await prisma.document.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

    currentId = current?.parentId ?? null;
  }

  return null;
}

function findPersonalWorkspace(userId: string) {
  return prisma.workspaceMember.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });
}

function create(input: {
  workspaceId: string;
  ownerId: string;
  title: string;
  parentId?: string;
}) {
  return prisma.document.create({
    data: {
      workspaceId: input.workspaceId,
      ownerId: input.ownerId,
      title: input.title,
      parentId: input.parentId,
    },
  });
}

function listForWorkspaces(workspaceIds: string[]) {
  return prisma.document.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      archivedAt: null,
    },
    orderBy: { order: "asc" },
  });
}

function updateMetadata(
  documentId: string,
  data: { title?: string; icon?: string; parentId?: string | null; order?: number }
) {
  return prisma.document.update({
    where: { id: documentId },
    data,
  });
}

function archive(documentId: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: { archivedAt: new Date() },
  });
}

function restore(documentId: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: { archivedAt: null },
  });
}

function hardDelete(documentId: string) {
  return prisma.document.delete({
    where: { id: documentId },
  });
}

function listArchivedForWorkspaces(workspaceIds: string[]) {
  return prisma.document.findMany({
    where: {
      workspaceId: { in: workspaceIds },
      archivedAt: { not: null },
    },
    orderBy: { archivedAt: "desc" },
  });
}

function updateLinkAccess(documentId: string, linkAccess: string) {
  return prisma.document.update({
    where: { id: documentId },
    data: { linkAccess },
  });
}

function listMembers(documentId: string) {
  return prisma.documentMember.findMany({
    where: { documentId },
    include: { user: true },
  });
}

function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email } });
}

function upsertMember(documentId: string, userId: string, role: string) {
  return prisma.documentMember.upsert({
    where: { documentId_userId: { documentId, userId } },
    create: { documentId, userId, role },
    update: { role },
    include: { user: true },
  });
}

function updateMemberRole(documentId: string, userId: string, role: string) {
  return prisma.documentMember.update({
    where: { documentId_userId: { documentId, userId } },
    data: { role },
    include: { user: true },
  });
}

function removeMember(documentId: string, userId: string) {
  return prisma.documentMember.delete({
    where: { documentId_userId: { documentId, userId } },
  });
}

function findActiveShareLink(documentId: string) {
  return prisma.shareLink.findFirst({
    where: { documentId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

function findShareLinkByToken(token: string) {
  return prisma.shareLink.findUnique({
    where: { token },
    include: { document: true },
  });
}

function createShareLink(input: {
  documentId: string;
  token: string;
  createdBy: string;
}) {
  return prisma.shareLink.create({
    data: {
      documentId: input.documentId,
      token: input.token,
      createdBy: input.createdBy,
    },
  });
}

function deactivateShareLinks(documentId: string) {
  return prisma.shareLink.updateMany({
    where: { documentId, isActive: true },
    data: { isActive: false },
  });
}

function addFavorite(documentId: string, userId: string) {
  return prisma.documentFavorite.upsert({
    where: { documentId_userId: { documentId, userId } },
    create: { documentId, userId },
    update: {},
  });
}

function removeFavorite(documentId: string, userId: string) {
  return prisma.documentFavorite.deleteMany({
    where: { documentId, userId },
  });
}

function countFavorites(userId: string) {
  return prisma.documentFavorite.count({ where: { userId } });
}

function countSharedWithUser(userId: string) {
  return prisma.documentMember.count({
    where: {
      userId,
      document: {
        archivedAt: null,
        ownerId: { not: userId },
      },
    },
  });
}

function listFavoriteIds(userId: string, documentIds: string[]) {
  return prisma.documentFavorite
    .findMany({
      where: { userId, documentId: { in: documentIds } },
      select: { documentId: true },
    })
    .then((rows) => new Set(rows.map((row) => row.documentId)));
}

export const documentRepository = {
  findById,
  findMemberRole,
  findInheritedMemberRole,
  findWorkspaceMembership,
  findPersonalWorkspace,
  create,
  listForWorkspaces,
  updateMetadata,
  archive,
  restore,
  hardDelete,
  listArchivedForWorkspaces,
  updateLinkAccess,
  listMembers,
  findUserByEmail,
  upsertMember,
  updateMemberRole,
  removeMember,
  findActiveShareLink,
  findShareLinkByToken,
  createShareLink,
  deactivateShareLinks,
  addFavorite,
  removeFavorite,
  countFavorites,
  countSharedWithUser,
  listFavoriteIds,
};
