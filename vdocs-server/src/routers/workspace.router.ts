import { Router } from "express";
import type { Request, Response } from "express";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.ts";
import type { CreateWorkspaceRequest } from "../dtos/request/CreateWorkspaceRequest.ts";
import type { InviteWorkspaceMemberRequest } from "../dtos/request/InviteWorkspaceMemberRequest.ts";
import type { InviteLarkMembersRequest } from "../dtos/request/InviteLarkMembersRequest.ts";
import type { InviteUsersBatchRequest } from "../dtos/request/InviteUsersBatchRequest.ts";
import type { UserDirectoryResponse } from "../dtos/response/UserDirectoryResponse.ts";
import type { UpdateWorkspaceMemberRoleRequest } from "../dtos/request/UpdateWorkspaceMemberRoleRequest.ts";
import type { WorkspaceResponse } from "../dtos/response/WorkspaceResponse.ts";
import type { WorkspaceMemberResponse } from "../dtos/response/WorkspaceMemberResponse.ts";
import type {
  LarkDepartmentResponse,
  LarkMemberResponse,
} from "../dtos/response/LarkDirectoryResponse.ts";
import {
  UserNotFoundError,
  WorkspaceForbiddenError,
  WorkspaceNameRequiredError,
  WorkspaceShareLinkNotFoundError,
  workspaceService,
  type WorkspaceMemberRole,
} from "../services/workspace.service.ts";
import { larkService } from "../services/lark.service.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";

export const workspaceRouter = Router();

function getUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).user.id;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof WorkspaceNameRequiredError) {
    sendError(res, 400, error.message);
    return;
  }

  if (error instanceof WorkspaceForbiddenError) {
    sendError(res, 403, error.message);
    return;
  }

  if (error instanceof UserNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  if (error instanceof WorkspaceShareLinkNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";
  sendError(res, 500, message);
}

// Public — resolves a workspace share link without requiring auth. Must be
// registered before the `requireAuth` gate below.
workspaceRouter.get(
  "/share/:token",
  async (req: Request<{ token: string }>, res: Response) => {
    try {
      const { workspace, permission } = await workspaceService.resolveWorkspaceShareToken(
        req.params.token
      );

      sendSuccess(res, {
        id: workspace.id,
        name: workspace.name,
        icon: workspace.icon,
        permission,
      });
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.use(requireAuth);

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

function toMemberResponse(member: {
  userId: string;
  role: WorkspaceMemberRole;
  createdAt: Date;
  user: { name: string; email: string | null; avatar: string | null };
}): WorkspaceMemberResponse {
  return {
    userId: member.userId,
    name: member.user.name,
    email: member.user.email,
    avatar: member.user.avatar,
    role: member.role,
    joinedAt: member.createdAt.toISOString(),
  };
}

workspaceRouter.get(
  "/:workspaceId/members",
  async (req: Request<{ workspaceId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      const members = await workspaceService.listMembers(
        req.params.workspaceId,
        userId
      );

      sendSuccess(res, members.map(toMemberResponse));
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.post(
  "/:workspaceId/members",
  async (
    req: Request<{ workspaceId: string }, unknown, InviteWorkspaceMemberRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const member = await workspaceService.inviteMember(
        req.params.workspaceId,
        userId,
        req.body.email,
        req.body.role
      );

      sendSuccess(res, toMemberResponse(member), "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.get(
  "/:workspaceId/users",
  async (
    req: Request<{ workspaceId: string }, unknown, unknown, { query?: string; page?: string; pageSize?: string }>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const page = Number(req.query.page ?? 1) || 1;
      const pageSize = Number(req.query.pageSize ?? 8) || 8;

      const result = await workspaceService.searchDirectoryUsers(
        req.params.workspaceId,
        userId,
        { query: req.query.query, page, pageSize }
      );

      const items: UserDirectoryResponse[] = result.items.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      }));

      sendSuccess(res, { items, total: result.total, page, pageSize });
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.post(
  "/:workspaceId/members/batch",
  async (
    req: Request<{ workspaceId: string }, unknown, InviteUsersBatchRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const members = await workspaceService.inviteUsersBatch(
        req.params.workspaceId,
        userId,
        req.body.userIds ?? [],
        req.body.role
      );

      sendSuccess(res, members.map(toMemberResponse), "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.get(
  "/:workspaceId/lark/departments",
  async (req: Request<{ workspaceId: string }>, res: Response) => {
    try {
      const departments = await larkService.listDepartments();
      const response: LarkDepartmentResponse[] = departments.map((department) => ({
        id: department.id,
        name: department.name,
        parentId: department.parentId,
        memberCount: department.memberCount,
      }));

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.get(
  "/:workspaceId/lark/members",
  async (
    req: Request<
      { workspaceId: string },
      unknown,
      unknown,
      { departmentId?: string; query?: string; page?: string; pageSize?: string }
    >,
    res: Response
  ) => {
    try {
      const page = Number(req.query.page ?? 1) || 1;
      const pageSize = Number(req.query.pageSize ?? 8) || 8;

      const result = await larkService.searchMembers({
        departmentId: req.query.departmentId,
        query: req.query.query,
        page,
        pageSize,
      });

      const items: LarkMemberResponse[] = result.items.map((member) => ({
        larkUserId: member.larkUserId,
        name: member.name,
        email: member.email,
        avatar: member.avatar,
        jobTitle: member.jobTitle,
        departmentId: member.departmentId,
      }));

      sendSuccess(res, { items, total: result.total, page, pageSize });
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.post(
  "/:workspaceId/members/lark",
  async (
    req: Request<{ workspaceId: string }, unknown, InviteLarkMembersRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const members = await workspaceService.inviteLarkMembers(
        req.params.workspaceId,
        userId,
        req.body.larkUserIds ?? [],
        req.body.role
      );

      sendSuccess(res, members.map(toMemberResponse), "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.patch(
  "/:workspaceId/members/:memberUserId",
  async (
    req: Request<
      { workspaceId: string; memberUserId: string },
      unknown,
      UpdateWorkspaceMemberRoleRequest
    >,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const member = await workspaceService.updateMemberRole(
        req.params.workspaceId,
        userId,
        req.params.memberUserId,
        req.body.role
      );

      sendSuccess(res, toMemberResponse(member));
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.post(
  "/:workspaceId/share",
  async (req: Request<{ workspaceId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      const shareLink = await workspaceService.getOrCreateShareLink(
        req.params.workspaceId,
        userId
      );

      sendSuccess(res, { token: shareLink.token }, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.delete(
  "/:workspaceId/share",
  async (req: Request<{ workspaceId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      await workspaceService.revokeShareLink(req.params.workspaceId, userId);

      sendSuccess(res, { revoked: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);

workspaceRouter.delete(
  "/:workspaceId/members/:memberUserId",
  async (
    req: Request<{ workspaceId: string; memberUserId: string }>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      await workspaceService.removeMember(
        req.params.workspaceId,
        userId,
        req.params.memberUserId
      );

      sendSuccess(res, { removed: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);
