import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/data-explorer - Raw sale exploration (Sales & Returns)
router.get("/", async (req: Request, res: Response) => {
  try {
    const { from, to, outletId, type, search, page = "1", limit = "50" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (outletId) where.outletId = parseInt(String(outletId));
    if (type === "RETUR") where.isRetur = true;
    if (type === "SALE") where.isRetur = false;

    if (from || to) {
      where.tanggal = {};
      if (from) where.tanggal.gte = new Date(String(from));
      if (to) where.tanggal.lte = new Date(String(to));
    }

    if (search) {
      where.OR = [
        { noTransaksi: { contains: String(search), mode: "insensitive" } },
        { customer: { contains: String(search), mode: "insensitive" } },
        { item: { name: { contains: String(search), mode: "insensitive" } } },
        { employee: { name: { contains: String(search), mode: "insensitive" } } },
      ];
    }

    const [total, rows, summaryAggregate] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } },
          item: { select: { id: true, code: true, name: true, itemGroup: true } },
          employee: { select: { id: true, name: true } },
          import: { select: { filename: true } },
        },
        orderBy: [{ tanggal: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
      prisma.sale.aggregate({
        where,
        _sum: {
          subtotal: true,
          labaRugi: true,
          qty: true,
        },
        _avg: {
          subtotal: true,
        },
      }),
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      rows,
      summary: {
        totalOmzet: Number(summaryAggregate._sum.subtotal || 0),
        totalLaba: Number(summaryAggregate._sum.labaRugi || 0),
        totalQty: Number(summaryAggregate._sum.qty || 0),
        avgOmzet: Number(summaryAggregate._avg.subtotal || 0),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
