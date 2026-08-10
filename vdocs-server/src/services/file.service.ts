import crypto from "node:crypto";
import path from "node:path";
import { fileRepository } from "../repositories/file.repository.ts";
import { documentRepository } from "../repositories/document.repository.ts";
import { minioClient, MINIO_BUCKET } from "../configuration/minio.ts";
import {
  DocumentForbiddenError,
  DocumentNotFoundError,
  canEdit,
  getDocumentPermission,
} from "./document.service.ts";

export class FileNotFoundError extends Error {}

function categoryFor(mimeType: string): "images" | "videos" | "files" {
  if (mimeType.startsWith("image/")) return "images";
  if (mimeType.startsWith("video/")) return "videos";
  return "files";
}

function buildObjectKey(documentId: string, originalName: string, mimeType: string) {
  const ext = path.extname(originalName);
  const category = categoryFor(mimeType);
  return `documents/${documentId}/${category}/${crypto.randomUUID()}${ext}`;
}

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
    buffer: Buffer;
  }
) {
  await requireEditableDocument(documentId, userId);

  const objectKey = buildObjectKey(documentId, upload.originalName, upload.mimeType);

  await minioClient.putObject(MINIO_BUCKET, objectKey, upload.buffer, upload.size, {
    "Content-Type": upload.mimeType,
  });

  return fileRepository.create({
    documentId,
    filename: upload.originalName,
    mimeType: upload.mimeType,
    size: upload.size,
    storedName: objectKey,
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

async function getFileStream(fileId: string) {
  const file = await getFile(fileId);
  const stream = await minioClient.getObject(MINIO_BUCKET, file.storedName);

  return { file, stream };
}

export const fileService = {
  uploadFile,
  getFile,
  getFileStream,
};
