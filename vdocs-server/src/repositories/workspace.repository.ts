import { prisma } from "../configuration/prisma.ts";
import type { WorkspaceMemberRole } from "../generated/prisma/client.js";

function create(input: {
  ownerId: string;
  name: string;
  description?: string;
  icon?: string;
}) {
  return prisma.workspace.create({
    data: {
      name: input.name,
      description: input.description,
      icon: input.icon,
      ownerId: input.ownerId,
      members: {
        create: {
          userId: input.ownerId,
          role: "OWNER",
        },
      },
    },
  });
}

function listForUser(userId: string) {
  return prisma.workspaceMember.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { id: "asc" },
  });
}

function findMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

function listMembers(workspaceId: string) {
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });
}

function findUserByEmail(email: string) {
  return prisma.user.findFirst({ where: { email } });
}

async function searchUsers(input: {
  workspaceId: string;
  query?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    workspaceMembers: { none: { workspaceId: input.workspaceId } },
    ...(input.query
      ? {
          OR: [
            { name: { contains: input.query, mode: "insensitive" as const } },
            { email: { contains: input.query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total };
}

function findUsersByIds(userIds: string[]) {
  return prisma.user.findMany({ where: { id: { in: userIds } } });
}

function upsertUserFromLark(input: {
  larkUserId: string;
  name: string;
  email: string | null;
  avatar: string | null;
}) {
  return prisma.user.upsert({
    where: { provider_providerUserId: { provider: "lark", providerUserId: input.larkUserId } },
    update: { name: input.name, email: input.email, avatar: input.avatar },
    create: {
      provider: "lark",
      providerUserId: input.larkUserId,
      name: input.name,
      email: input.email,
      avatar: input.avatar,
    },
  });
}

function upsertMember(workspaceId: string, userId: string, role: WorkspaceMemberRole) {
  return prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId, userId } },
    create: { workspaceId, userId, role },
    update: { role },
    include: { user: true },
  });
}

function updateMemberRole(workspaceId: string, userId: string, role: WorkspaceMemberRole) {
  return prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId, userId } },
    data: { role },
    include: { user: true },
  });
}

function removeMember(workspaceId: string, userId: string) {
  return prisma.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
}

function findById(workspaceId: string) {
  return prisma.workspace.findUnique({ where: { id: workspaceId } });
}

function findActiveShareLink(workspaceId: string) {
  return prisma.workspaceShareLink.findFirst({
    where: { workspaceId, isActive: true },
    orderBy: { createdAt: "desc" },
  });
}

function findShareLinkByToken(token: string) {
  return prisma.workspaceShareLink.findUnique({
    where: { token },
    include: { workspace: true },
  });
}

function createShareLink(input: {
  workspaceId: string;
  token: string;
  createdBy: string;
}) {
  return prisma.workspaceShareLink.create({
    data: {
      workspaceId: input.workspaceId,
      token: input.token,
      createdBy: input.createdBy,
    },
  });
}

function deactivateShareLinks(workspaceId: string) {
  return prisma.workspaceShareLink.updateMany({
    where: { workspaceId, isActive: true },
    data: { isActive: false },
  });
}

export const workspaceRepository = {
  create,
  listForUser,
  findMembership,
  listMembers,
  findUserByEmail,
  searchUsers,
  findUsersByIds,
  upsertUserFromLark,
  upsertMember,
  updateMemberRole,
  removeMember,
  findById,
  findActiveShareLink,
  findShareLinkByToken,
  createShareLink,
  deactivateShareLinks,
};
