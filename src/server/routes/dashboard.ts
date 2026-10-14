import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/dashboard - Sales metrics & trends
router.get("/", async (req: Request, res: Response) => {
  try {
    const { from, to, outletId, branch } = req.query;

    const where: any = {
      item: {
        status: { not: "Non-Aktif" },
        isHidden: false,
      },
    };
    if (outletId) where.outletId = parseInt(String(outletId));
    if (branch) where.outlet = { branch: String(branch) as any };
    if (from || to) {
      where.tanggal = {};
      if (from) where.tanggal.gte = new Date(String(from));
      if (to) where.tanggal.lte = new Date(String(to));
    }

    // 1. Total Aggregates
    const sales = await prisma.sale.findMany({
      where,
      select: {
        id: true,
        noTransaksi: true,
        tanggal: true,
        qty: true,
        subtotal: true,
        hpp: true,
        labaRugi: true,
        isRetur: true,
        outletId: true,
        itemId: true,
        employeeId: true,
      },
    });

    let totalOmzet = 0;
    let totalHpp = 0;
    let totalLaba = 0;
    let totalQty = 0;
    const uniqueTrx = new Set<string>();
    const uniqueItems = new Set<number>();
    const uniqueEmployees = new Set<number>();
    const uniqueOutlets = new Set<number>();

    // Daily breakdown for trend charts
    const dailyMap = new Map<string, { tanggal: string; omzet: number; laba: number; qty: number; count: number }>();

    for (const s of sales) {
      const omzet = Number(s.subtotal);
      const laba = Number(s.labaRugi);
      const hpp = Number(s.hpp);
      const qty = Number(s.qty);

      totalOmzet += omzet;
      totalHpp += hpp;
      totalLaba += laba;
      totalQty += qty;

      uniqueTrx.add(s.noTransaksi);
      uniqueItems.add(s.itemId);
      uniqueEmployees.add(s.employeeId);
      uniqueOutlets.add(s.outletId);

      const tglStr = s.tanggal.toISOString().split("T")[0];
      if (!dailyMap.has(tglStr)) {
        dailyMap.set(tglStr, { tanggal: tglStr, omzet: 0, laba: 0, qty: 0, count: 0 });
      }
      const day = dailyMap.get(tglStr)!;
      day.omzet += omzet;
      day.laba += laba;
      day.qty += qty;
      day.count += 1;
    }

    const trends = Array.from(dailyMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    // 2. Top 10 Items
    const itemGroup = await prisma.sale.groupBy({
      by: ["itemId"],
      where,
      _sum: {
        subtotal: true,
        labaRugi: true,
        qty: true,
      },
      orderBy: {
        _sum: { subtotal: "desc" },
      },
      take: 10,
    });

    const itemIds = itemGroup.map((i) => i.itemId);
    const itemDetails = await prisma.item.findMany({
      where: { id: { in: itemIds } },
      select: { id: true, code: true, name: true, itemGroup: true },
    });
    const itemMap = new Map(itemDetails.map((it) => [it.id, it]));

    const topItems = itemGroup.map((i) => {
      const detail = itemMap.get(i.itemId);
      return {
        id: i.itemId,
        code: detail?.code || "-",
        name: detail?.name || "Item #" + i.itemId,
        group: detail?.itemGroup || "-",
        omzet: Number(i._sum.subtotal || 0),
        laba: Number(i._sum.labaRugi || 0),
        qty: Number(i._sum.qty || 0),
      };
    });

    // 3. Top Outlets
    const outletGroup = await prisma.sale.groupBy({
      by: ["outletId"],
      where,
      _sum: {
        subtotal: true,
        labaRugi: true,
        qty: true,
      },
      orderBy: {
        _sum: { subtotal: "desc" },
      },
    });

    const outletDetails = await prisma.outlet.findMany();
    const outletMap = new Map(outletDetails.map((o) => [o.id, o]));

    const outletPerformance = outletGroup.map((og) => {
      const out = outletMap.get(og.outletId);
      return {
        id: og.outletId,
        name: out?.name || "Outlet #" + og.outletId,
        branch: out?.branch || "BANDUNG",
        omzet: Number(og._sum.subtotal || 0),
        laba: Number(og._sum.labaRugi || 0),
        qty: Number(og._sum.qty || 0),
      };
    });

    res.json({
      summary: {
        totalOmzet,
        totalHpp,
        totalLaba,
        totalQty,
        totalTransaksi: uniqueTrx.size,
        totalItems: uniqueItems.size,
        activeEmployees: uniqueEmployees.size,
        activeOutlets: uniqueOutlets.size,
      },
      trends,
      topItems,
      outletPerformance,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
