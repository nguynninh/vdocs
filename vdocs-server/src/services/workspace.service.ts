import { workspaceRepository } from "../repositories/workspace.repository.ts";
import { larkService } from "./lark.service.ts";
import type { WorkspaceMemberRole } from "../generated/prisma/client.js";

export type { WorkspaceMemberRole };

export class WorkspaceNameRequiredError extends Error {}
export class WorkspaceForbiddenError extends Error {}
export class WorkspaceMemberNotFoundError extends Error {}
export class UserNotFoundError extends Error {}

async function createWorkspace(
  ownerId: string,
  input: { name: string; description?: string; icon?: string }
) {
  const name = input.name?.trim();

  if (!name) {
    throw new WorkspaceNameRequiredError("Workspace name is required");
  }

  return workspaceRepository.create({
    ownerId,
    name,
    description: input.description?.trim() || undefined,
    icon: input.icon?.trim() || undefined,
  });
}

async function listWorkspaces(userId: string) {
  const memberships = await workspaceRepository.listForUser(userId);

  return memberships.map((membership) => ({
    ...membership.workspace,
    role: membership.role,
  }));
}

async function requireMembership(workspaceId: string, userId: string) {
  const membership = await workspaceRepository.findMembership(workspaceId, userId);

  if (!membership) {
    throw new WorkspaceForbiddenError(
      `User ${userId} is not a member of workspace ${workspaceId}`
    );
  }

  return membership;
}

async function requireOwner(workspaceId: string, userId: string) {
  const membership = await requireMembership(workspaceId, userId);

  if (membership.role !== "OWNER" && membership.role !== "FULL_ACCESS") {
    throw new WorkspaceForbiddenError(
      `User ${userId} cannot manage members for workspace ${workspaceId}`
    );
  }

  return membership;
}

async function listMembers(workspaceId: string, userId: string) {
  await requireMembership(workspaceId, userId);

  return workspaceRepository.listMembers(workspaceId);
}

async function inviteMember(
  workspaceId: string,
  userId: string,
  email: string,
  role: WorkspaceMemberRole
) {
  await requireOwner(workspaceId, userId);

  const invitedUser = await workspaceRepository.findUserByEmail(email.trim());

  if (!invitedUser) {
    throw new UserNotFoundError(`No user found with email ${email}`);
  }

  return workspaceRepository.upsertMember(workspaceId, invitedUser.id, role);
}

async function searchDirectoryUsers(
  workspaceId: string,
  userId: string,
  params: { query?: string; page: number; pageSize: number }
) {
  await requireMembership(workspaceId, userId);
  return workspaceRepository.searchUsers({ workspaceId, ...params });
}

async function inviteUsersBatch(
  workspaceId: string,
  userId: string,
  targetUserIds: string[],
  role: WorkspaceMemberRole
) {
  await requireOwner(workspaceId, userId);

  if (targetUserIds.length === 0) {
    throw new UserNotFoundError("No user selected");
  }

  const users = await workspaceRepository.findUsersByIds(targetUserIds);

  if (users.length === 0) {
    throw new UserNotFoundError("Selected users were not found");
  }

  return Promise.all(
    users.map((user) => workspaceRepository.upsertMember(workspaceId, user.id, role))
  );
}

async function inviteLarkMembers(
  workspaceId: string,
  userId: string,
  larkUserIds: string[],
  role: WorkspaceMemberRole
) {
  await requireOwner(workspaceId, userId);

  if (larkUserIds.length === 0) {
    throw new UserNotFoundError("No Lark member selected");
  }

  const larkMembers = await larkService.findMembersByIds(larkUserIds);

  if (larkMembers.length === 0) {
    throw new UserNotFoundError("Selected Lark members were not found in the directory");
  }

  return Promise.all(
    larkMembers.map(async (larkMember) => {
      const user = await workspaceRepository.upsertUserFromLark({
        larkUserId: larkMember.larkUserId,
        name: larkMember.name,
        email: larkMember.email,
        avatar: larkMember.avatar,
      });

      return workspaceRepository.upsertMember(workspaceId, user.id, role);
    })
  );
}

async function updateMemberRole(
  workspaceId: string,
  userId: string,
  targetUserId: string,
  role: WorkspaceMemberRole
) {
  await requireOwner(workspaceId, userId);

  return workspaceRepository.updateMemberRole(workspaceId, targetUserId, role);
}

async function removeMember(
  workspaceId: string,
  userId: string,
  targetUserId: string
) {
  const membership = await requireOwner(workspaceId, userId);

  if (targetUserId === membership.userId) {
    throw new WorkspaceForbiddenError("Owner cannot remove themselves");
  }

  await workspaceRepository.removeMember(workspaceId, targetUserId);
}

export const workspaceService = {
  createWorkspace,
  listWorkspaces,
  listMembers,
  inviteMember,
  searchDirectoryUsers,
  inviteUsersBatch,
  inviteLarkMembers,
  updateMemberRole,
  removeMember,
};
