import { prisma } from "../configuration/prisma.ts";

function recordView(documentId: string, viewerId: string, viewDate: string) {
  return prisma.documentView.upsert({
    where: { documentId_viewerId_viewDate: { documentId, viewerId, viewDate } },
    create: { documentId, viewerId, viewDate },
    update: { count: { increment: 1 }, lastViewedAt: new Date() },
  });
}

function listViews(documentId: string, since: Date) {
  return prisma.documentView.findMany({
    where: { documentId, lastViewedAt: { gte: since } },
    include: { viewer: true },
    orderBy: { lastViewedAt: "desc" },
  });
}

export const analyticsRepository = {
  recordView,
  listViews,
};
