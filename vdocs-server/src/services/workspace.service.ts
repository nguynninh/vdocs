import { workspaceRepository } from "../repositories/workspace.repository.ts";

export class WorkspaceNameRequiredError extends Error {}

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

export const workspaceService = {
  createWorkspace,
  listWorkspaces,
};
