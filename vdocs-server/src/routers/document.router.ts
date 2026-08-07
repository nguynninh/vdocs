import { Router } from "express";
import type { Request, Response } from "express";
import {
  optionalAuth,
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.ts";
import type { CreateDocumentRequest } from "../dtos/request/CreateDocumentRequest.ts";
import type { UpdateDocumentRequest } from "../dtos/request/UpdateDocumentRequest.ts";
import type { UpdateDocumentAccessRequest } from "../dtos/request/UpdateDocumentAccessRequest.ts";
import type { InviteMemberRequest } from "../dtos/request/InviteMemberRequest.ts";
import type { UpdateMemberRoleRequest } from "../dtos/request/UpdateMemberRoleRequest.ts";
import type {
  DocumentResponse,
  DocumentSummaryResponse,
  DocumentTrashResponse,
  DocumentUpdateResponse,
} from "../dtos/response/DocumentResponse.ts";
import type { DocumentMemberResponse } from "../dtos/response/DocumentMemberResponse.ts";
import type { LinkAccess } from "../dtos/response/DocumentPermission.ts";
import type {
  DocumentVersionResponse,
  DocumentVersionSummaryResponse,
} from "../dtos/response/DocumentVersionResponse.ts";
import {
  DocumentForbiddenError,
  DocumentNotFoundError,
  NoWorkspaceError,
  ShareLinkNotFoundError,
  UserNotFoundError,
  documentService,
  type MemberRole,
} from "../services/document.service.ts";
import {
  VersionNotFoundError,
  versionService,
} from "../services/version.service.ts";
import { analyticsService } from "../services/analytics.service.ts";
import type { DocumentAnalyticsResponse } from "../dtos/response/DocumentAnalyticsResponse.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";

export const documentRouter = Router();

documentRouter.use(optionalAuth);

function getUserId(req: Request<any, any, any, any, any>): string {
  return (req as unknown as AuthenticatedRequest).user.id;
}

function getOptionalUserId(
  req: Request<any, any, any, any, any>
): string | null {
  return (req as unknown as Partial<AuthenticatedRequest>).user?.id ?? null;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof DocumentNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  if (error instanceof DocumentForbiddenError) {
    sendError(res, 403, error.message);
    return;
  }

  if (error instanceof NoWorkspaceError) {
    sendError(res, 400, error.message);
    return;
  }

  if (error instanceof UserNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  if (error instanceof ShareLinkNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  if (error instanceof VersionNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  const message =
    error instanceof Error ? error.message : "Internal server error";
  sendError(res, 500, message);
}

documentRouter.post(
  "/",
  requireAuth,
  async (req: Request<unknown, unknown, CreateDocumentRequest>, res: Response) => {
    try {
      const userId = getUserId(req);
      const document = await documentService.createDocument(
        userId,
        req.body?.title,
        req.body?.workspaceId,
        req.body?.parentId
      );

      sendSuccess(res, { id: document.id }, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get("/", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId =
      typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
    const documents = await documentService.listDocuments(userId, workspaceId);

    const response: DocumentSummaryResponse[] = documents.map((document) => ({
      id: document.id,
      parentId: document.parentId,
      title: document.title,
      icon: document.icon,
      updatedAt: document.updatedAt.toISOString(),
    }));

    sendSuccess(res, response);
  } catch (error) {
    handleError(error, res);
  }
});

documentRouter.get("/trash", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId =
      typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
    const documents = await documentService.listTrash(userId, workspaceId);

    const response: DocumentTrashResponse[] = documents.map((document) => ({
      id: document.id,
      title: document.title,
      icon: document.icon,
      updatedAt: document.updatedAt.toISOString(),
      archivedAt: (document.archivedAt as Date).toISOString(),
    }));

    sendSuccess(res, response);
  } catch (error) {
    handleError(error, res);
  }
});

documentRouter.post(
  "/:documentId/restore",
  requireAuth,
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      const document = await documentService.restoreDocument(
        req.params.documentId,
        userId
      );

      sendSuccess(res, { id: document.id });
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.delete(
  "/:documentId/permanent",
  requireAuth,
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      await documentService.permanentlyDeleteDocument(
        req.params.documentId,
        userId
      );

      sendSuccess(res, { deleted: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get(
  "/share/:token",
  async (req: Request<{ token: string }>, res: Response) => {
    try {
      const userId = getOptionalUserId(req);
      const { document, permission } = await documentService.getDocumentByShareToken(
        req.params.token,
        userId
      );

      const response: DocumentResponse = {
        id: document.id,
        workspaceId: document.workspaceId,
        title: document.title,
        icon: document.icon,
        permission,
        linkAccess: document.linkAccess as LinkAccess,
        contentVersion: document.contentVersion,
        content: document.ydocState
          ? Buffer.from(document.ydocState).toString("base64")
          : null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.post(
  "/:documentId/share",
  requireAuth,
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      const shareLink = await documentService.getOrCreateShareLink(
        req.params.documentId,
        userId
      );

      sendSuccess(res, { token: shareLink.token }, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.delete(
  "/:documentId/share",
  requireAuth,
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      await documentService.revokeShareLink(req.params.documentId, userId);

      sendSuccess(res, { revoked: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get(
  "/:documentId",
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getOptionalUserId(req);
      const { document, permission } = await documentService.getDocument(
        req.params.documentId,
        userId
      );

      const response: DocumentResponse = {
        id: document.id,
        workspaceId: document.workspaceId,
        title: document.title,
        icon: document.icon,
        permission,
        linkAccess: document.linkAccess as LinkAccess,
        contentVersion: document.contentVersion,
        content: document.ydocState
          ? Buffer.from(document.ydocState).toString("base64")
          : null,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };

      if (userId) {
        analyticsService.recordView(req.params.documentId, userId).catch((error) => {
          console.error("Failed to record document view", error);
        });
      }

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get(
  "/:documentId/analytics",
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getOptionalUserId(req);
      const rangeDays = req.query.days ? Number(req.query.days) : undefined;
      const analytics = await analyticsService.getAnalytics(
        req.params.documentId,
        userId,
        rangeDays
      );

      const response: DocumentAnalyticsResponse = {
        rangeDays: analytics.rangeDays,
        totalViews: analytics.totalViews,
        uniqueViewers: analytics.uniqueViewers,
        daily: analytics.daily,
        viewers: analytics.viewers.map((viewer) => ({
          id: viewer.id,
          name: viewer.name,
          avatar: viewer.avatar,
          lastViewedAt: viewer.lastViewedAt.toISOString(),
          totalViews: viewer.totalViews,
        })),
      };

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.patch(
  "/:documentId/access",
  requireAuth,
  async (
    req: Request<{ documentId: string }, unknown, UpdateDocumentAccessRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const document = await documentService.updateLinkAccess(
        req.params.documentId,
        userId,
        req.body.linkAccess
      );

      sendSuccess(res, { id: document.id, linkAccess: document.linkAccess });
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get(
  "/:documentId/members",
  requireAuth,
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      const members = await documentService.listMembers(
        req.params.documentId,
        userId
      );

      const response: DocumentMemberResponse[] = members.map((member) => ({
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role as MemberRole,
      }));

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.post(
  "/:documentId/members",
  requireAuth,
  async (
    req: Request<{ documentId: string }, unknown, InviteMemberRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const member = await documentService.inviteMember(
        req.params.documentId,
        userId,
        req.body.email,
        req.body.role
      );

      const response: DocumentMemberResponse = {
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role as MemberRole,
      };

      sendSuccess(res, response, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.patch(
  "/:documentId/members/:memberUserId",
  requireAuth,
  async (
    req: Request<
      { documentId: string; memberUserId: string },
      unknown,
      UpdateMemberRoleRequest
    >,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const member = await documentService.updateMemberRole(
        req.params.documentId,
        userId,
        req.params.memberUserId,
        req.body.role
      );

      const response: DocumentMemberResponse = {
        userId: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role as MemberRole,
      };

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.delete(
  "/:documentId/members/:memberUserId",
  requireAuth,
  async (
    req: Request<{ documentId: string; memberUserId: string }>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      await documentService.removeMember(
        req.params.documentId,
        userId,
        req.params.memberUserId
      );

      sendSuccess(res, { removed: true });
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.patch(
  "/:documentId",
  requireAuth,
  async (
    req: Request<{ documentId: string }, unknown, UpdateDocumentRequest>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const document = await documentService.updateDocument(
        req.params.documentId,
        userId,
        req.body ?? {}
      );

      const response: DocumentUpdateResponse = {
        id: document.id,
        title: document.title,
        icon: document.icon,
        createdAt: document.createdAt.toISOString(),
        updatedAt: document.updatedAt.toISOString(),
      };

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.delete(
  "/:documentId",
  requireAuth,
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getUserId(req);
      const document = await documentService.trashDocument(
        req.params.documentId,
        userId
      );

      sendSuccess(res, { id: document.id });
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get(
  "/:documentId/versions",
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      const userId = getOptionalUserId(req);
      const versions = await versionService.listVersions(
        req.params.documentId,
        userId
      );

      const response: DocumentVersionSummaryResponse[] = versions.map((version) => ({
        id: version.id,
        trigger: version.trigger,
        label: version.label,
        contentVersion: version.contentVersion,
        createdAt: version.createdAt.toISOString(),
        createdBy: version.createdBy,
      }));

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.get(
  "/:documentId/versions/:versionId",
  async (req: Request<{ documentId: string; versionId: string }>, res: Response) => {
    try {
      const userId = getOptionalUserId(req);
      const version = await versionService.getVersion(
        req.params.documentId,
        req.params.versionId,
        userId
      );

      const response: DocumentVersionResponse = {
        id: version.id,
        trigger: version.trigger,
        label: version.label,
        contentVersion: version.contentVersion,
        createdAt: version.createdAt.toISOString(),
        createdBy: version.createdBy,
        content: version.content,
      };

      sendSuccess(res, response);
    } catch (error) {
      handleError(error, res);
    }
  }
);

documentRouter.post(
  "/:documentId/versions",
  requireAuth,
  async (
    req: Request<{ documentId: string }, unknown, { label?: string }>,
    res: Response
  ) => {
    try {
      const userId = getUserId(req);
      const version = await versionService.createManualVersion(
        req.params.documentId,
        userId,
        req.body?.label
      );

      const response: DocumentVersionSummaryResponse = {
        id: version.id,
        trigger: version.trigger,
        label: version.label,
        contentVersion: version.contentVersion,
        createdAt: version.createdAt.toISOString(),
        createdBy: version.createdBy,
      };

      sendSuccess(res, response, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);
