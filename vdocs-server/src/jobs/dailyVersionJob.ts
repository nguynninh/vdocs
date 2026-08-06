import { prisma } from "../configuration/prisma.ts";
import { versionRepository } from "../repositories/version.repository.ts";
import { encodeState } from "../realtime/documentRoomManager.ts";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * End-of-day checkpoint: one consolidated "daily" version per document that
 * was actually edited today, on top of the 10-minute-throttled "auto"
 * checkpoints taken during live editing (see documentRoomManager.ts).
 * Skips documents that already got a daily version today (safe to re-run).
 */
export async function runDailyVersionJob(): Promise<void> {
  const since = startOfToday();

  const documents = await prisma.document.findMany({
    where: { updatedAt: { gte: since }, archivedAt: null },
    select: { id: true, ydocState: true, contentVersion: true },
  });

  for (const document of documents) {
    try {
      const alreadyRanToday = await prisma.documentVersion.findFirst({
        where: { documentId: document.id, trigger: "daily", createdAt: { gte: since } },
        select: { id: true },
      });

      if (alreadyRanToday) {
        continue;
      }

      // Prefer the live in-memory room (has the latest unsaved edits) when
      // the document is currently open; otherwise fall back to the last
      // persisted blob.
      const liveState = encodeState(document.id);
      const state =
        liveState.length > 0
          ? Buffer.from(liveState)
          : document.ydocState
            ? Buffer.from(document.ydocState)
            : null;

      if (!state) {
        continue;
      }

      await versionRepository.create({
        documentId: document.id,
        ydocState: state,
        contentVersion: document.contentVersion,
        trigger: "daily",
      });
    } catch (error) {
      console.error(`Daily version job failed for document ${document.id}`, error);
    }
  }
}

/** Schedules runDailyVersionJob() to fire once shortly after each local
 * midnight, for as long as the process stays up. */
export function scheduleDailyVersionJob(): void {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 5, 0); // a few seconds past midnight

  const msUntilNextRun = nextMidnight.getTime() - now.getTime();

  setTimeout(function runAndReschedule() {
    runDailyVersionJob().catch((error) =>
      console.error("Daily version job failed", error)
    );
    setInterval(() => {
      runDailyVersionJob().catch((error) =>
        console.error("Daily version job failed", error)
      );
    }, ONE_DAY_MS);
  }, msUntilNextRun);
}
