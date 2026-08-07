import { prisma } from "../configuration/prisma.ts";

function create(input: {
  documentId: string;
  filename: string;
  mimeType: string;
  size: number;
  storedName: string;
  uploadedBy: string;
}) {
  return prisma.documentFile.create({ data: input });
}

function findById(fileId: string) {
  return prisma.documentFile.findUnique({ where: { id: fileId } });
}

export const fileRepository = {
  create,
  findById,
};
