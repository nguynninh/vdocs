import { analyticsRepository } from "../repositories/analytics.repository.ts";
import { documentRepository } from "../repositories/document.repository.ts";
import {
  DocumentForbiddenError,
  DocumentNotFoundError,
  getDocumentPermission,
} from "./document.service.ts";

const DEFAULT_RANGE_DAYS = 28;

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function requireReadAccess(documentId: string, userId: string | null) {
  const document = await documentRepository.findById(documentId);

  if (!document) {
    throw new DocumentNotFoundError(`Document ${documentId} not found`);
  }

  const permission = await getDocumentPermission(document, userId);

  if (!permission) {
    throw new DocumentForbiddenError(
      `${userId ? `User ${userId}` : "Anonymous visitor"} has no access to document ${documentId}`
    );
  }

  return { document, permission };
}

/** Logs (or bumps) today's view row for this viewer — called once per
 * successful authenticated document load. Anonymous viewers aren't tracked
 * since there's no stable identity to dedup or list them by. */
async function recordView(documentId: string, userId: string): Promise<void> {
  await analyticsRepository.recordView(documentId, userId, toDateKey(new Date()));
}

async function getAnalytics(
  documentId: string,
  userId: string | null,
  rangeDays: number = DEFAULT_RANGE_DAYS
) {
  await requireReadAccess(documentId, userId);

  const since = new Date();
  since.setDate(since.getDate() - rangeDays);

  const rows = await analyticsRepository.listViews(documentId, since);

  const dailyMap = new Map<string, { totalViews: number; uniqueViewers: number }>();
  const viewerMap = new Map<
    string,
    { id: string; name: string; avatar: string | null; lastViewedAt: Date; totalViews: number }
  >();

  for (const row of rows) {
    const day = dailyMap.get(row.viewDate) ?? { totalViews: 0, uniqueViewers: 0 };
    day.totalViews += row.count;
    day.uniqueViewers += 1;
    dailyMap.set(row.viewDate, day);

    const existing = viewerMap.get(row.viewerId);
    if (!existing || existing.lastViewedAt < row.lastViewedAt) {
      viewerMap.set(row.viewerId, {
        id: row.viewer.id,
        name: row.viewer.name,
        avatar: row.viewer.avatar,
        lastViewedAt: row.lastViewedAt,
        totalViews: (existing?.totalViews ?? 0) + row.count,
      });
    } else {
      existing.totalViews += row.count;
    }
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  const viewers = Array.from(viewerMap.values()).sort(
    (a, b) => b.lastViewedAt.getTime() - a.lastViewedAt.getTime()
  );

  return {
    rangeDays,
    totalViews: daily.reduce((sum, d) => sum + d.totalViews, 0),
    uniqueViewers: viewerMap.size,
    daily,
    viewers,
  };
}

export const analyticsService = {
  recordView,
  getAnalytics,
};
