import path from "node:path";
import { fileRepository } from "../repositories/file.repository.ts";
import { documentRepository } from "../repositories/document.repository.ts";
import {
  DocumentForbiddenError,
  DocumentNotFoundError,
  canEdit,
  getDocumentPermission,
} from "./document.service.ts";

export class FileNotFoundError extends Error {}

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

async function requireEditableDocument(documentId: string, userId: string) {
  const document = await documentRepository.findById(documentId);

  if (!document || document.archivedAt) {
    throw new DocumentNotFoundError(`Document ${documentId} not found`);
  }

  const permission = await getDocumentPermission(document, userId);

  if (!permission || !canEdit(permission)) {
    throw new DocumentForbiddenError(
      `User ${userId} cannot upload files to document ${documentId}`
    );
  }

  return document;
}

async function uploadFile(
  documentId: string,
  userId: string,
  upload: {
    originalName: string;
    mimeType: string;
    size: number;
    storedName: string;
  }
) {
  await requireEditableDocument(documentId, userId);

  return fileRepository.create({
    documentId,
    filename: upload.originalName,
    mimeType: upload.mimeType,
    size: upload.size,
    storedName: upload.storedName,
    uploadedBy: userId,
  });
}

async function getFile(fileId: string) {
  const file = await fileRepository.findById(fileId);

  if (!file) {
    throw new FileNotFoundError(`File ${fileId} not found`);
  }

  return file;
}

export const fileService = {
  uploadFile,
  getFile,
  UPLOAD_DIR,
};
