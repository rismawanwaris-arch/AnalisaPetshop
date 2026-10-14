import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/outlets - Performance overview & comprehensive filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      from,
      to,
      searchOutlet,
      searchItem,
      category,
      keyword,
      employeeId,
      omzetMin,
      omzetMax,
    } = req.query;

    const salesWhere: any = {
      item: {
        status: { not: "Non-Aktif" },
        isHidden: false,
      },
    };

    if (from || to) {
      salesWhere.tanggal = {};
      if (from) salesWhere.tanggal.gte = new Date(String(from));
      if (to) salesWhere.tanggal.lte = new Date(String(to));
    }

    if (category) {
      salesWhere.item.itemGroup = { contains: String(category), mode: "insensitive" };
    }

    if (searchItem || keyword) {
      const q = String(searchItem || keyword).trim();
      salesWhere.OR = [
        { item: { name: { contains: q, mode: "insensitive" } } },
        { item: { code: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (employeeId) {
      salesWhere.employeeId = parseInt(String(employeeId));
    }

    const outletWhere: any = { isHidden: false };
    if (searchOutlet) {
      outletWhere.name = { contains: String(searchOutlet).trim(), mode: "insensitive" };
    }

    const [outlets, allCategories, allEmployees] = await Promise.all([
      prisma.outlet.findMany({
        where: outletWhere,
        include: {
          sales: {
            where: salesWhere,
            select: {
              noTransaksi: true,
              qty: true,
              subtotal: true,
              labaRugi: true,
              tanggal: true,
              employeeId: true,
            },
          },
        },
      }),
      prisma.item.findMany({
        select: { itemGroup: true },
        distinct: ["itemGroup"],
      }),
      prisma.employee.findMany({
        where: { isHidden: false },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    let result = outlets.map((o) => {
      let totalOmzet = 0;
      let totalLaba = 0;
      let totalQty = 0;
      const trxSet = new Set<string>();

      for (const s of o.sales) {
        totalOmzet += Number(s.subtotal);
        totalLaba += Number(s.labaRugi);
        totalQty += Number(s.qty);
        trxSet.add(s.noTransaksi);
      }

      return {
        id: o.id,
        name: o.name,
        branch: o.branch,
        totalOmzet,
        totalLaba,
        totalQty,
        totalTransaksi: trxSet.size,
      };
    });

    // Omzet Min / Max filters
    if (omzetMin) {
      const min = parseFloat(String(omzetMin));
      if (!isNaN(min) && min > 0) result = result.filter((o) => o.totalOmzet >= min);
    }
    if (omzetMax) {
      const max = parseFloat(String(omzetMax));
      if (!isNaN(max) && max > 0) result = result.filter((o) => o.totalOmzet <= max);
    }

    // Default sort by totalOmzet desc
    result.sort((a, b) => b.totalOmzet - a.totalOmzet);

    const categoriesList = allCategories.map((c) => c.itemGroup).filter(Boolean);

    res.json({
      outlets: result,
      totalOutlets: result.length,
      categories: categoriesList,
      employees: allEmployees,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outlets/:id - Detailed performance for a single outlet (items sold, daily trend, employees)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const outletId = parseInt(req.params.id);
    const { from, to, searchItem, category, keyword, employeeId } = req.query;

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });

    if (!outlet) {
      return res.status(404).json({ error: "Outlet tidak ditemukan" });
    }

    const salesWhere: any = {
      outletId,
      item: {
        status: { not: "Non-Aktif" },
        isHidden: false,
      },
    };

    if (from || to) {
      salesWhere.tanggal = {};
      if (from) salesWhere.tanggal.gte = new Date(String(from));
      if (to) salesWhere.tanggal.lte = new Date(String(to));
    }

    if (category) {
      salesWhere.item.itemGroup = { contains: String(category), mode: "insensitive" };
    }

    if (searchItem || keyword) {
      const q = String(searchItem || keyword).trim();
      salesWhere.OR = [
        { item: { name: { contains: q, mode: "insensitive" } } },
        { item: { code: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (employeeId) {
      salesWhere.employeeId = parseInt(String(employeeId));
    }

    const sales = await prisma.sale.findMany({
      where: salesWhere,
      include: {
        item: { select: { id: true, code: true, name: true, itemGroup: true, unitBase: true } },
        employee: { select: { id: true, name: true, isHidden: true } },
      },
    });

    let totalOmzet = 0;
    let totalLaba = 0;
    let totalQty = 0;
    const trxSet = new Set<string>();

    const itemMap = new Map<
      number,
      {
        itemId: number;
        code: string;
        name: string;
        category: string;
        unit: string;
        qty: number;
        omzet: number;
        laba: number;
      }
    >();

    const dailyMap = new Map<string, { tanggal: string; omzet: number; laba: number; qty: number }>();

    const empMap = new Map<
      number,
      {
        employeeId: number;
        name: string;
        qty: number;
        omzet: number;
        laba: number;
        trxSet: Set<string>;
      }
    >();

    for (const s of sales) {
      const omzet = Number(s.subtotal);
      const laba = Number(s.labaRugi);
      const qty = Number(s.qty);
      const dateStr = s.tanggal.toISOString().split("T")[0];

      totalOmzet += omzet;
      totalLaba += laba;
      totalQty += qty;
      trxSet.add(s.noTransaksi);

      // Item aggregation
      if (!itemMap.has(s.itemId)) {
        itemMap.set(s.itemId, {
          itemId: s.itemId,
          code: s.item.code,
          name: s.item.name,
          category: s.item.itemGroup || "UMUM",
          unit: s.unit || s.item.unitBase || "PCS",
          qty: 0,
          omzet: 0,
          laba: 0,
        });
      }
      const it = itemMap.get(s.itemId)!;
      it.qty += qty;
      it.omzet += omzet;
      it.laba += laba;

      // Daily trend aggregation
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { tanggal: dateStr, omzet: 0, laba: 0, qty: 0 });
      }
      const d = dailyMap.get(dateStr)!;
      d.omzet += omzet;
      d.laba += laba;
      d.qty += qty;

      // Employee aggregation (skip hidden employees)
      if (!s.employee?.isHidden) {
        if (!empMap.has(s.employeeId)) {
          empMap.set(s.employeeId, {
            employeeId: s.employeeId,
            name: s.employee?.name || "Kasir #" + s.employeeId,
            qty: 0,
            omzet: 0,
            laba: 0,
            trxSet: new Set(),
          });
        }
        const emp = empMap.get(s.employeeId)!;
        emp.qty += qty;
        emp.omzet += omzet;
        emp.laba += laba;
        emp.trxSet.add(s.noTransaksi);
      }
    }

    const items = Array.from(itemMap.values()).sort((a, b) => b.omzet - a.omzet);
    const trends = Array.from(dailyMap.values()).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    const employees = Array.from(empMap.values())
      .map((e) => ({
        employeeId: e.employeeId,
        name: e.name,
        qty: e.qty,
        omzet: e.omzet,
        laba: e.laba,
        transaksi: e.trxSet.size,
      }))
      .sort((a, b) => b.omzet - a.omzet);

    res.json({
      outlet: {
        id: outlet.id,
        name: outlet.name,
        branch: outlet.branch,
      },
      summary: {
        totalOmzet,
        totalLaba,
        totalQty,
        totalTransaksi: trxSet.size,
      },
      trends,
      items,
      employees,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
