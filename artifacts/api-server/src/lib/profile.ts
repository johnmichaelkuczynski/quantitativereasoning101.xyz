import { eq } from "drizzle-orm";
import { db, topicProfileTable } from "@workspace/db";

const ALPHA = 0.3;

/**
 * Record a single per-topic outcome into the evolving profile. emaAccuracy is an
 * exponential moving average so recent performance is weighted more heavily than
 * old performance — the profile tracks the student's growth, not just a lifetime
 * average. Called by graded submits, topic drills, and practice-assignment submits.
 */
export async function recordTopicOutcome(
  topicId: number,
  correct: boolean,
): Promise<void> {
  if (!Number.isFinite(topicId)) return;
  const val = correct ? 1 : 0;
  const [existing] = await db
    .select()
    .from(topicProfileTable)
    .where(eq(topicProfileTable.topicId, topicId));
  if (existing) {
    const ema = existing.emaAccuracy * (1 - ALPHA) + val * ALPHA;
    await db
      .update(topicProfileTable)
      .set({
        attempts: existing.attempts + 1,
        correct: existing.correct + val,
        emaAccuracy: ema,
        updatedAt: new Date(),
      })
      .where(eq(topicProfileTable.topicId, topicId));
  } else {
    await db.insert(topicProfileTable).values({
      topicId,
      attempts: 1,
      correct: val,
      emaAccuracy: 0.5 * (1 - ALPHA) + val * ALPHA,
    });
  }
}

export type TopicMastery = {
  topicId: number;
  attempts: number;
  emaAccuracy: number;
};

/** Read the current per-topic mastery profile keyed by topicId. */
export async function getTopicMastery(): Promise<Map<number, TopicMastery>> {
  const rows = await db.select().from(topicProfileTable);
  const map = new Map<number, TopicMastery>();
  for (const r of rows) {
    map.set(r.topicId, {
      topicId: r.topicId,
      attempts: r.attempts,
      emaAccuracy: r.emaAccuracy,
    });
  }
  return map;
}
