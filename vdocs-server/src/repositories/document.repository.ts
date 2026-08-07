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
    orderBy: { updatedAt: "desc" },
  });
}

function updateMetadata(
  documentId: string,
  data: { title?: string; icon?: string }
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

export const documentRepository = {
  findById,
  findMemberRole,
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
};
