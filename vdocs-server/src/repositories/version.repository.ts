import { prisma } from "../configuration/prisma.ts";

function listForDocument(documentId: string) {
  return prisma.documentVersion.findMany({
    where: { documentId },
    include: { creator: true },
    orderBy: { createdAt: "desc" },
  });
}

function findById(documentId: string, versionId: string) {
  return prisma.documentVersion.findFirst({
    where: { id: versionId, documentId },
    include: { creator: true },
  });
}

function create(input: {
  documentId: string;
  ydocState: Buffer;
  contentVersion: number;
  trigger: "auto" | "manual";
  label?: string;
  createdBy?: string;
}) {
  return prisma.documentVersion.create({
    data: input,
    include: { creator: true },
  });
}

export const versionRepository = {
  listForDocument,
  findById,
  create,
};
