import { Router, type IRouter } from "express";
import { isAdmin } from "../auth";
import { storage } from "../storage";

const router: IRouter = Router();

router.get("/admin/check", isAdmin, (_req, res) => {
  res.json({ ok: true });
});

router.get("/admin/analytics", isAdmin, async (req, res) => {
  try {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const [visitList, allTimestamps] = await Promise.all([
      storage.getVisits(500),
      storage.getVisitTimestampsSince(null),
    ]);

    const times = allTimestamps.map((t) => new Date(t).getTime());
    const countSince = (ms: number) => times.filter((t) => t >= now - ms).length;

    const stats = {
      lastDay: countSince(DAY),
      lastWeek: countSince(7 * DAY),
      lastMonth: countSince(30 * DAY),
      lastYear: countSince(365 * DAY),
      allTime: times.length,
    };

    const buildSeries = (
      start: number,
      bucketMs: number,
      buckets: number,
      labelFn: (d: Date) => string,
    ) => {
      const counts = new Array<number>(buckets).fill(0);
      for (const t of times) {
        if (t >= start) {
          const idx = Math.min(Math.floor((t - start) / bucketMs), buckets - 1);
          counts[idx]++;
        }
      }
      return counts.map((count, i) => ({
        label: labelFn(new Date(start + i * bucketMs)),
        count,
      }));
    };

    const series = {
      lastDay: buildSeries(now - DAY, HOUR, 24, (d) =>
        d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
      ),
      lastWeek: buildSeries(now - 7 * DAY, DAY, 7, (d) =>
        d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
      ),
      lastMonth: buildSeries(now - 30 * DAY, DAY, 30, (d) =>
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ),
      lastYear: buildSeries(now - 365 * DAY, (365 / 12) * DAY, 12, (d) =>
        d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      ),
      allTime: (() => {
        const earliest = times.length ? Math.min(...times) : now;
        const span = Math.max(now - earliest, DAY);
        const buckets = Math.min(24, Math.max(6, Math.ceil(span / (30 * DAY))));
        return buildSeries(earliest, span / buckets, buckets, (d) =>
          d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }),
        );
      })(),
    };

    res.json({
      stats,
      series,
      visits: visitList.map((v) => ({
        id: v.id,
        email: v.email,
        visitedAt: v.visitedAt,
      })),
    });
  } catch (error) {
    req.log.error({ err: error }, "Admin analytics failed");
    res.status(500).json({ error: "Failed to load login analytics" });
  }
});

export default router;
