import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/points/leaderboard - Calculate employee points
router.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const { from, to, category } = req.query;

    const fromDate = from ? new Date(String(from)) : new Date();
    const toDate = to ? new Date(String(to)) : new Date();
    fromDate.setHours(0, 0, 0, 0);
    toDate.setHours(23, 59, 59, 999);

    // 1. Fetch exclusions, point rules & active employees
    const [exclusions, itemPoints, groupDefaults, excludedEmployees, settings, allEmployees] = await Promise.all([
      prisma.itemPointExclusion.findMany(),
      prisma.itemPoint.findMany({ orderBy: [{ pattern: "desc" }] }),
      prisma.itemGroupPointDefault.findMany(),
      prisma.pointsExclusion.findMany({ select: { employeeId: true } }),
      prisma.pointSettings.findUnique({ where: { id: 1 } }),
      prisma.employee.findMany({ where: { isHidden: false } }),
    ]);

    const excludedEmpSet = new Set(excludedEmployees.map((e) => e.employeeId));
    const excludedPatterns = exclusions.map((e) => e.pattern.trim().toLowerCase());
    const groupDefaultMap = new Map(groupDefaults.map((g) => [g.itemGroup.toUpperCase(), g.points]));

    // Pre-sort point rules: longest pattern first, then newest startDate first
    const sortedRules = itemPoints
      .map((ip) => ({
        ...ip,
        patternLower: ip.pattern.trim().toLowerCase(),
      }))
      .sort(
        (a, b) =>
          b.patternLower.length - a.patternLower.length ||
          b.startDate.getTime() - a.startDate.getTime()
      );

    // 2. Fetch sales (select only required fields for memory efficiency)
    const sales = await prisma.sale.findMany({
      where: {
        tanggal: { gte: fromDate, lte: toDate },
        employee: {
          isHidden: false,
        },
        item: {
          status: { not: "Non-Aktif" },
          isHidden: false,
        },
      },
      select: {
        qty: true,
        tanggal: true,
        isRetur: true,
        employeeId: true,
        employee: { select: { name: true } },
        item: { select: { code: true, name: true, itemGroup: true } },
      },
    });

    const empPointMap = new Map<number, {
      employeeId: number;
      name: string;
      totalPoints: number;
      totalQty: number;
      items: Map<string, { name: string; qty: number; points: number }>;
    }>();

    // Initialize all active employees with 0 points
    for (const emp of allEmployees) {
      if (!excludedEmpSet.has(emp.id)) {
        empPointMap.set(emp.id, {
          employeeId: emp.id,
          name: emp.name,
          totalPoints: 0,
          totalQty: 0,
          items: new Map(),
        });
      }
    }

    for (const s of sales) {
      if (excludedEmpSet.has(s.employeeId)) continue;

      const itemNameLower = s.item.name.trim().toLowerCase();
      const itemCodeLower = s.item.code.trim().toLowerCase();
      const isExcluded = excludedPatterns.some(
        (p) => itemNameLower.includes(p) || itemCodeLower === p
      );
      if (isExcluded) continue;

      // Calculate points: 1) Exact match first, 2) Longest substring match second
      let pointsPerUnit = 0;
      const exactRule = sortedRules.find(
        (ip) =>
          (itemCodeLower === ip.patternLower || itemNameLower === ip.patternLower) &&
          ip.startDate <= s.tanggal
      );
      const matchedRule =
        exactRule ||
        sortedRules.find(
          (ip) => itemNameLower.includes(ip.patternLower) && ip.startDate <= s.tanggal
        );

      if (matchedRule) {
        pointsPerUnit = matchedRule.points;
      } else if (s.item.itemGroup) {
        pointsPerUnit = groupDefaultMap.get(s.item.itemGroup.toUpperCase()) || 0;
      }

      // If no point rule configured for this item, it earns 0 points
      if (pointsPerUnit <= 0) continue;

      const rawQty = Number(s.qty);
      const effectiveQty = s.isRetur && rawQty > 0 ? -rawQty : rawQty;
      const earnedPoints = pointsPerUnit * effectiveQty;

      if (!empPointMap.has(s.employeeId)) {
        empPointMap.set(s.employeeId, {
          employeeId: s.employeeId,
          name: s.employee.name,
          totalPoints: 0,
          totalQty: 0,
          items: new Map(),
        });
      }

      const emp = empPointMap.get(s.employeeId)!;
      emp.totalPoints += earnedPoints;
      emp.totalQty += effectiveQty;

      if (!emp.items.has(s.item.name)) {
        emp.items.set(s.item.name, { name: s.item.name, qty: 0, points: 0 });
      }
      const it = emp.items.get(s.item.name)!;
      it.qty += effectiveQty;
      it.points += earnedPoints;
    }

    const rate = settings?.pointRupiahRate || 100;
    const leaderboard = Array.from(empPointMap.values())
      .filter((e) => e.totalPoints > 0 || e.totalQty > 0)
      .map((e) => ({
        employeeId: e.employeeId,
        name: e.name,
        totalPoints: e.totalPoints,
        totalQty: e.totalQty,
        insentif: e.totalPoints * rate,
        itemBreakdown: Array.from(e.items.values()),
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints || b.totalQty - a.totalQty);

    res.json({
      leaderboard,
      rate,
      from: fromDate.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
