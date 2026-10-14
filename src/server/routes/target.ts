import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/target/report - Daily target report (9 columns)
router.get("/report", async (req: Request, res: Response) => {
  try {
    const { from, to, branch = "BANDUNG" } = req.query;

    const fromDate = from ? new Date(String(from)) : new Date();
    const toDate = to ? new Date(String(to)) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const dayCount = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

    // 1. Fetch Targets
    const targets = await prisma.target.findMany({
      where: { branch: String(branch) as any },
    });

    const targetMap: Record<string, Record<string, number>> = {
      perkonter: { PETSHOP: 35000, AKSESORIS: 35000, SP_VOUCHER: 100000 },
      all: { PETSHOP: 1190000, AKSESORIS: 1400000, SP_VOUCHER: 4000000 },
    };

    targets.forEach((t) => {
      const scopeKey = t.scope.toLowerCase();
      if (targetMap[scopeKey]) {
        targetMap[scopeKey][t.category] = Number(t.amount);
      }
    });

    // 2. Fetch Group Mappings
    const mappings = await prisma.itemGroupMapping.findMany();
    const groupCategoryMap = new Map(mappings.map((m) => [m.itemGroup.toUpperCase(), m.category]));

    // 3. Fetch Sales in Date Range (excluding Non-Aktif & Hidden items)
    const sales = await prisma.sale.findMany({
      where: {
        tanggal: { gte: fromDate, lte: toDate },
        outlet: { branch: String(branch) as any, isHidden: false },
        item: { status: { not: "Non-Aktif" }, isHidden: false },
      },
      include: {
        outlet: { select: { id: true, name: true } },
        item: { select: { itemGroup: true } },
      },
    });

    // 4. Aggregate by Outlet and Category
    const outletRowMap = new Map<number, {
      outletId: number;
      outlet: string;
      petshop: { sales: number; qtyOrTrx: number };
      aksesoris: { sales: number; qtyOrTrx: number };
      spVoucher: { sales: number; qtyOrTrx: number };
      totalSales: number;
      totalQtyTrx: number;
    }>();

    const unmappedSet = new Set<string>();

    for (const s of sales) {
      if (!outletRowMap.has(s.outletId)) {
        outletRowMap.set(s.outletId, {
          outletId: s.outletId,
          outlet: s.outlet.name,
          petshop: { sales: 0, qtyOrTrx: 0 },
          aksesoris: { sales: 0, qtyOrTrx: 0 },
          spVoucher: { sales: 0, qtyOrTrx: 0 },
          totalSales: 0,
          totalQtyTrx: 0,
        });
      }

      const row = outletRowMap.get(s.outletId)!;
      const groupName = (s.item.itemGroup || "").trim().toUpperCase();
      const cat = groupCategoryMap.get(groupName);

      const laba = Number(s.labaRugi);
      const qty = Number(s.qty);

      if (cat === "PETSHOP") {
        row.petshop.sales += laba;
        row.petshop.qtyOrTrx += qty;
      } else if (cat === "AKSESORIS") {
        row.aksesoris.sales += laba;
        row.aksesoris.qtyOrTrx += qty;
      } else if (cat === "SP_VOUCHER") {
        row.spVoucher.sales += laba;
        row.spVoucher.qtyOrTrx += qty;
      } else {
        if (groupName) unmappedSet.add(groupName);
      }

      row.totalSales += laba;
      row.totalQtyTrx += qty;
    }

    const rows = Array.from(outletRowMap.values()).sort((a, b) => b.totalSales - a.totalSales);

    res.json({
      rows,
      unmappedItemGroups: Array.from(unmappedSet),
      targets: {
        perkonter: {
          PETSHOP: targetMap.perkonter.PETSHOP * dayCount,
          AKSESORIS: targetMap.perkonter.AKSESORIS * dayCount,
          SP_VOUCHER: targetMap.perkonter.SP_VOUCHER * dayCount,
        },
        all: {
          PETSHOP: targetMap.all.PETSHOP * dayCount,
          AKSESORIS: targetMap.all.AKSESORIS * dayCount,
          SP_VOUCHER: targetMap.all.SP_VOUCHER * dayCount,
        },
      },
      dailyTargets: targetMap,
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
      dayCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/target - Get target configurations
router.get("/", async (req: Request, res: Response) => {
  try {
    const { branch = "BANDUNG" } = req.query;
    const targets = await prisma.target.findMany({
      where: { branch: String(branch) as any },
    });
    res.json(targets);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/target - Update target configurations
router.put("/", async (req: Request, res: Response) => {
  try {
    const { targets, branch = "BANDUNG" } = req.body;
    if (!Array.isArray(targets)) return res.status(400).json({ error: "Format target tidak valid" });

    for (const t of targets) {
      await prisma.target.upsert({
        where: {
          scope_category_branch: {
            scope: t.scope,
            category: t.category,
            branch: branch as any,
          },
        },
        update: { amount: t.amount },
        create: {
          scope: t.scope,
          category: t.category,
          branch: branch as any,
          amount: t.amount,
        },
      });
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
