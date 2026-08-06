import { prisma } from "../configuration/prisma.ts";

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

export const workspaceRepository = {
  create,
  listForUser,
};
