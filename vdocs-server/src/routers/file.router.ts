import { Router } from "express";
import type { Request, Response } from "express";
import multer from "multer";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import {
  requireAuth,
  type AuthenticatedRequest,
} from "../middleware/auth.middleware.ts";
import {
  DocumentForbiddenError,
  DocumentNotFoundError,
} from "../services/document.service.ts";
import { FileNotFoundError, fileService } from "../services/file.service.ts";
import type { FileResponse } from "../dtos/response/FileResponse.ts";
import { sendError, sendSuccess } from "../utils/apiResponse.ts";

fs.mkdirSync(fileService.UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fileService.UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const fileRouter = Router();

function getUserId(req: Request): string {
  return (req as unknown as AuthenticatedRequest).user.id;
}

function handleError(error: unknown, res: Response) {
  if (error instanceof DocumentNotFoundError || error instanceof FileNotFoundError) {
    sendError(res, 404, error.message);
    return;
  }

  if (error instanceof DocumentForbiddenError) {
    sendError(res, 403, error.message);
    return;
  }

  const message = error instanceof Error ? error.message : "Internal server error";
  sendError(res, 500, message);
}

fileRouter.post(
  "/documents/:documentId/files",
  requireAuth,
  upload.single("file"),
  async (req: Request<{ documentId: string }>, res: Response) => {
    try {
      if (!req.file) {
        sendError(res, 400, "No file uploaded");
        return;
      }

      const userId = getUserId(req);
      const file = await fileService.uploadFile(req.params.documentId, userId, {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        storedName: req.file.filename,
      });

      const response: FileResponse = {
        id: file.id,
        filename: file.filename,
        mimeType: file.mimeType,
        size: file.size,
        url: `/files/${file.id}/download`,
      };

      sendSuccess(res, response, "Created", 201);
    } catch (error) {
      handleError(error, res);
    }
  }
);

fileRouter.get(
  "/files/:fileId/download",
  async (req: Request<{ fileId: string }>, res: Response) => {
    try {
      const file = await fileService.getFile(req.params.fileId);

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(file.filename)}"`
      );
      res.sendFile(path.join(fileService.UPLOAD_DIR, file.storedName));
    } catch (error) {
      handleError(error, res);
    }
  }
);
