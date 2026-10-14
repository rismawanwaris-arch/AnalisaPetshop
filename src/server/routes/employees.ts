import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/employees - Performance overview & date filter
router.get("/", async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const where: any = {
      item: {
        status: { not: "Non-Aktif" },
        isHidden: false,
      },
    };
    if (from || to) {
      where.tanggal = {};
      if (from) where.tanggal.gte = new Date(String(from));
      if (to) where.tanggal.lte = new Date(String(to));
    }

    const employees = await prisma.employee.findMany({
      where: {
        isHidden: false,
      },
      include: {
        sales: {
          where,
          select: {
            noTransaksi: true,
            qty: true,
            subtotal: true,
            labaRugi: true,
            outlet: { select: { name: true } },
          },
        },
      },
    });

    const result = employees.map((e) => {
      let totalOmzet = 0;
      let totalLaba = 0;
      let totalQty = 0;
      const trxSet = new Set<string>();
      const outletSet = new Set<string>();

      for (const s of e.sales) {
        totalOmzet += Number(s.subtotal);
        totalLaba += Number(s.labaRugi);
        totalQty += Number(s.qty);
        trxSet.add(s.noTransaksi);
        if (s.outlet?.name) outletSet.add(s.outlet.name);
      }

      return {
        id: e.id,
        name: e.name,
        isHidden: e.isHidden,
        totalOmzet,
        totalLaba,
        totalQty,
        totalTransaksi: trxSet.size,
        outlets: Array.from(outletSet),
      };
    }).sort((a, b) => b.totalOmzet - a.totalOmzet);

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
