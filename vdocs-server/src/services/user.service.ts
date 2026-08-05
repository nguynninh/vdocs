import { prisma } from "../configuration/prisma.ts";
import type { AuthUser } from "../dtos/response/AuthUser.ts";

async function ensurePersonalWorkspace(userId: string, userName: string) {
  const existingMembership = await prisma.workspaceMember.findFirst({
    where: { userId },
  });

  if (existingMembership) {
    return;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name: `${userName}'s workspace`,
      ownerId: userId,
    },
  });

  await prisma.workspaceMember.create({
    data: {
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    },
  });
}

async function upsertUserFromAuthUser(authUser: AuthUser) {
  const user = await prisma.user.upsert({
    where: {
      provider_providerUserId: {
        provider: authUser.provider,
        providerUserId: authUser.providerUserId,
      },
    },
    update: {
      name: authUser.name,
      email: authUser.email,
      avatar: authUser.avatar,
      mobile: authUser.mobile,
    },
    create: {
      provider: authUser.provider,
      providerUserId: authUser.providerUserId,
      name: authUser.name,
      email: authUser.email,
      avatar: authUser.avatar,
      mobile: authUser.mobile,
    },
  });

  await ensurePersonalWorkspace(user.id, user.name);

  return user;
}

export const userService = {
  upsertUserFromAuthUser,
};
