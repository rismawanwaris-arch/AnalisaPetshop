import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireMaster } from "../middleware.js";

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

// DELETE /api/data-explorer - Bulk or single delete sales rows (Master only)
router.delete("/", requireAuth, requireMaster, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Daftar ID data yang akan dihapus tidak valid" });
    }

    const numericIds = ids.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
    if (numericIds.length === 0) {
      return res.status(400).json({ error: "Tidak ada ID data valid yang diberikan" });
    }

    const result = await prisma.sale.deleteMany({
      where: { id: { in: numericIds } },
    });

    // Record in ActivityLog
    const userActor = req.user ? `${req.user.role}:${req.user.username}` : "MASTER";
    await prisma.activityLog.create({
      data: {
        role: userActor,
        action: "DATA_EXPLORER_DELETE",
        detail: `Menghapus ${result.count} baris transaksi penjualan dari Analisa Data`,
        ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      },
    });

    res.json({
      success: true,
      count: result.count,
      message: `Berhasil menghapus ${result.count} baris data transaksi.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal menghapus baris transaksi" });
  }
});

export default router;
