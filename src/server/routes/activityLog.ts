import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/activity-log - Activity log history
router.get("/", async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "50" } = req.query;
    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(100, Math.max(10, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * take;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count(),
      prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
