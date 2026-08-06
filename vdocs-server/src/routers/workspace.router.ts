import { Router } from "express";
import type { Request, Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.ts";
import type { CreateWorkspaceRequest } from "../dtos/request/CreateWorkspaceRequest.ts";
import type { WorkspaceResponse } from "../dtos/response/WorkspaceResponse.ts";
import {
  WorkspaceNameRequiredError,
  workspaceService,
} from "../services/workspace.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";

export const workspaceRouter = Router();

workspaceRouter.use(requireAuth);

function getUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).user.id;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof WorkspaceNameRequiredError) {
    sendError(res, 400, error.message);
    return;
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";
  sendError(res, 500, message);
}

workspaceRouter.post(
  "/",
  async (
    req: Request<unknown, unknown, CreateWorkspaceRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const workspace = await workspaceService.createWorkspace(userId, req.body ?? {});

      const response: WorkspaceResponse = {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        icon: workspace.icon,
        role: "OWNER",
        createdAt: workspace.createdAt.toISOString(),
      };

      sendSuccess(res, response, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaces = await workspaceService.listWorkspaces(userId);

    const response: WorkspaceResponse[] = workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      icon: workspace.icon,
      role: workspace.role,
      createdAt: workspace.createdAt.toISOString(),
    }));

    sendSuccess(res, response);
  } catch (error) {
    handleError(error, res);
  }
});
