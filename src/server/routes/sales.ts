import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/sales - List individual transactions with pagination & filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { from, to, outletId, employeeId, search, page = "1", limit = "50" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {
      item: {
        status: { not: "Non-Aktif" },
        isHidden: false,
      },
    };
    if (outletId) where.outletId = parseInt(String(outletId));
    if (employeeId) where.employeeId = parseInt(String(employeeId));
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
        { item: { code: { contains: String(search), mode: "insensitive" } } },
      ];
    }

    const [total, rows] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          outlet: { select: { id: true, name: true } },
          item: { select: { id: true, code: true, name: true, itemGroup: true } },
          employee: { select: { id: true, name: true } },
        },
        orderBy: [{ tanggal: "desc" }, { id: "desc" }],
        skip,
        take,
      }),
    ]);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
