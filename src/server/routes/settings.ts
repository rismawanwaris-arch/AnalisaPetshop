import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { hashPassword } from "../../lib/password.js";
import { requireAuth, requireMaster } from "../middleware.js";

const router = Router();

// ================= PREFERENSI TAMPILAN (BISA DIAKSES OLEH SEMUA USER TERAUTENTIKASI) =================
router.get("/menu-visibility", async (req: Request, res: Response) => {
  try {
    const s = await prisma.pointSettings.findUnique({ where: { id: 1 } });
    res.json({ hiddenMenuItems: s?.hiddenMenuItems || [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/chart-metrics", async (req: Request, res: Response) => {
  try {
    const s = await prisma.pointSettings.findUnique({ where: { id: 1 } });
    res.json({ dashboardChartMetrics: s?.dashboardChartMetrics || ["laba"] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= SEMUA ENDPOINT PENGATURAN LAINNYA WAJIB LEVEL MASTER =================
router.use(requireAuth);
router.use(requireMaster);

// GET /api/settings - Full settings data for all collapsible panels
router.get("/", async (req: Request, res: Response) => {
  try {
    const [
      users,
      roles,
      sessions,
      settings,
      targets,
      outlets,
      employees,
      itemGroupMappings,
      pointGroupMappings,
      itemPoints,
      itemExclusions,
      groupDefaults,
      excludedEmployees,
    ] = await Promise.all([
      prisma.user.findMany({
        select: { id: true, username: true, displayName: true, role: true, isActive: true, roleId: true, customRole: true, createdAt: true },
        orderBy: { username: "asc" },
      }),
      prisma.customRole.findMany({ include: { users: { select: { id: true, username: true } } }, orderBy: { name: "asc" } }),
      prisma.session.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.pointSettings.findUnique({ where: { id: 1 } }),
      prisma.target.findMany({ orderBy: [{ branch: "asc" }, { scope: "asc" }, { category: "asc" }] }),
      prisma.outlet.findMany({ orderBy: { name: "asc" } }),
      prisma.employee.findMany({ include: { excluded: true }, orderBy: { name: "asc" } }),
      prisma.itemGroupMapping.findMany({ orderBy: { itemGroup: "asc" } }),
      prisma.pointGroupMapping.findMany({ orderBy: { itemGroup: "asc" } }),
      prisma.itemPoint.findMany({ orderBy: { pattern: "asc" } }),
      prisma.itemPointExclusion.findMany({ orderBy: { pattern: "asc" } }),
      prisma.itemGroupPointDefault.findMany({ orderBy: { itemGroup: "asc" } }),
      prisma.pointsExclusion.findMany({ include: { employee: true } }),
    ]);

    res.json({
      users,
      roles,
      sessions,
      settings,
      targets,
      outlets,
      employees,
      itemGroupMappings,
      pointGroupMappings,
      itemPoints,
      itemExclusions,
      groupDefaults,
      excludedEmployees,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= AKUN & SESI =================
router.post("/users", async (req: Request, res: Response) => {
  try {
    const { username, displayName, password, role = "admin", roleId } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username dan password wajib diisi" });

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash: hashPassword(password),
        role,
        roleId: roleId ? parseInt(roleId) : null,
      },
    });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { displayName, password, role, roleId, isActive } = req.body;
    const data: any = {};
    if (displayName !== undefined) data.displayName = displayName;
    if (role !== undefined) data.role = role;
    if (roleId !== undefined) data.roleId = roleId ? parseInt(roleId) : null;
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (password) data.passwordHash = hashPassword(password);

    const user = await prisma.user.update({ where: { id }, data });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.session.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= CUSTOM ROLES =================
router.post("/roles", async (req: Request, res: Response) => {
  try {
    const { name, permissions = [] } = req.body;
    const role = await prisma.customRole.create({ data: { name, permissions } });
    res.json(role);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/roles/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, permissions } = req.body;
    const role = await prisma.customRole.update({ where: { id }, data: { name, permissions } });
    res.json(role);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/roles/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.customRole.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= NOMINAL TARGET =================
router.put("/targets", async (req: Request, res: Response) => {
  try {
    const { targets } = req.body;
    if (!Array.isArray(targets)) return res.status(400).json({ error: "Invalid format" });

    for (const t of targets) {
      await prisma.target.upsert({
        where: {
          scope_category_branch: {
            scope: t.scope,
            category: t.category,
            branch: t.branch || "BANDUNG",
          },
        },
        update: { amount: t.amount },
        create: {
          scope: t.scope,
          category: t.category,
          branch: t.branch || "BANDUNG",
          amount: t.amount,
        },
      });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= ITEM GROUP MAPPINGS =================
router.post("/mappings/item-group", async (req: Request, res: Response) => {
  try {
    const { itemGroup, category } = req.body;
    const m = await prisma.itemGroupMapping.upsert({
      where: { itemGroup },
      update: { category },
      create: { itemGroup, category },
    });
    res.json(m);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/mappings/item-group/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.itemGroupMapping.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= POINT GROUP MAPPINGS =================
router.post("/mappings/point-group", async (req: Request, res: Response) => {
  try {
    const { itemGroup, category } = req.body;
    const m = await prisma.pointGroupMapping.upsert({
      where: { itemGroup },
      update: { category },
      create: { itemGroup, category },
    });
    res.json(m);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/mappings/point-group/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.pointGroupMapping.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= POIN SETTINGS =================
router.put("/point-settings", async (req: Request, res: Response) => {
  try {
    const { periodStartDay, pointTargetMonthly, pointTargetWeekly, pointTargetDaily, pointRupiahRate } = req.body;
    const updated = await prisma.pointSettings.upsert({
      where: { id: 1 },
      update: {
        periodStartDay: parseInt(periodStartDay) || 1,
        pointTargetMonthly: parseInt(pointTargetMonthly) || 0,
        pointTargetWeekly: parseInt(pointTargetWeekly) || 0,
        pointTargetDaily: parseInt(pointTargetDaily) || 0,
        pointRupiahRate: parseInt(pointRupiahRate) || 100,
      },
      create: {
        id: 1,
        periodStartDay: parseInt(periodStartDay) || 1,
        pointTargetMonthly: parseInt(pointTargetMonthly) || 0,
        pointTargetWeekly: parseInt(pointTargetWeekly) || 0,
        pointTargetDaily: parseInt(pointTargetDaily) || 0,
        pointRupiahRate: parseInt(pointRupiahRate) || 100,
      },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= POIN PER ITEM =================
router.post("/item-points", async (req: Request, res: Response) => {
  try {
    const { pattern, points, startDate } = req.body;
    const date = startDate ? new Date(startDate) : new Date();
    const created = await prisma.itemPoint.upsert({
      where: { pattern_startDate: { pattern, startDate: date } },
      update: { points: parseInt(points) },
      create: { pattern, points: parseInt(points), startDate: date },
    });
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/item-points/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.itemPoint.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= POIN EXCLUSIONS =================
router.post("/item-exclusions", async (req: Request, res: Response) => {
  try {
    const { pattern } = req.body;
    const created = await prisma.itemPointExclusion.create({ data: { pattern } });
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/item-exclusions/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.itemPointExclusion.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= GROUP POINT DEFAULTS =================
router.post("/group-defaults", async (req: Request, res: Response) => {
  try {
    const { itemGroup, points } = req.body;
    const created = await prisma.itemGroupPointDefault.upsert({
      where: { itemGroup },
      update: { points: parseInt(points) },
      create: { itemGroup, points: parseInt(points) },
    });
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/group-defaults/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.itemGroupPointDefault.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PEGAWAI DIKECUALIKAN =================
router.post("/excluded-employees", async (req: Request, res: Response) => {
  try {
    const { employeeId, reason } = req.body;
    const created = await prisma.pointsExclusion.create({
      data: { employeeId: parseInt(employeeId), reason },
    });
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/excluded-employees/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.pointsExclusion.delete({ where: { id } });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= VISIBILITAS OUTLET / PEGAWAI =================
router.put("/outlets/:id/branch", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { branch } = req.body;
    const updated = await prisma.outlet.update({
      where: { id },
      data: { branch },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/outlets/:id/visibility", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isHidden } = req.body;
    const updated = await prisma.outlet.update({
      where: { id },
      data: { isHidden: Boolean(isHidden) },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/employees/:id/visibility", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { isHidden } = req.body;
    const updated = await prisma.employee.update({
      where: { id },
      data: { isHidden: Boolean(isHidden) },
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= VISIBILITAS MENU SIDEBAR =================
router.put("/menu-visibility", async (req: Request, res: Response) => {
  try {
    const { hiddenMenuItems } = req.body;
    if (!Array.isArray(hiddenMenuItems)) {
      return res.status(400).json({ error: "hiddenMenuItems must be an array" });
    }
    const updated = await prisma.pointSettings.upsert({
      where: { id: 1 },
      update: { hiddenMenuItems },
      create: { id: 1, hiddenMenuItems },
    });
    res.json({ hiddenMenuItems: updated.hiddenMenuItems });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= PENGATURAN GRAFIK DASHBOARD =================
router.put("/chart-metrics", async (req: Request, res: Response) => {
  try {
    const { dashboardChartMetrics } = req.body;
    if (!Array.isArray(dashboardChartMetrics) || dashboardChartMetrics.length === 0) {
      return res.status(400).json({ error: "Minimal pilih 1 metrik untuk grafik" });
    }
    const updated = await prisma.pointSettings.upsert({
      where: { id: 1 },
      update: { dashboardChartMetrics },
      create: { id: 1, dashboardChartMetrics },
    });
    res.json({ dashboardChartMetrics: updated.dashboardChartMetrics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================= BACKUP & RESTORE =================
router.get("/backup/data", async (req: Request, res: Response) => {
  try {
    const [outlets, employees, items, batches, sales, vendors, invoices, purchaseItems] = await Promise.all([
      prisma.outlet.findMany(),
      prisma.employee.findMany(),
      prisma.item.findMany(),
      prisma.importBatch.findMany(),
      prisma.sale.findMany(),
      prisma.vendor.findMany(),
      prisma.purchaseInvoice.findMany(),
      prisma.purchaseItem.findMany(),
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      type: "DATA",
      outlets,
      employees,
      items,
      batches,
      sales,
      vendors,
      invoices,
      purchaseItems,
    };

    res.setHeader("Content-Disposition", `attachment; filename=backup-data-${Date.now()}.json`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/backup/settings", async (req: Request, res: Response) => {
  try {
    const [targets, itemGroupMappings, pointGroupMappings, itemPoints, exclusions, defaults, settings, roles] = await Promise.all([
      prisma.target.findMany(),
      prisma.itemGroupMapping.findMany(),
      prisma.pointGroupMapping.findMany(),
      prisma.itemPoint.findMany(),
      prisma.itemPointExclusion.findMany(),
      prisma.itemGroupPointDefault.findMany(),
      prisma.pointSettings.findUnique({ where: { id: 1 } }),
      prisma.customRole.findMany(),
    ]);

    const backup = {
      timestamp: new Date().toISOString(),
      type: "SETTINGS",
      targets,
      itemGroupMappings,
      pointGroupMappings,
      itemPoints,
      exclusions,
      defaults,
      settings,
      roles,
    };

    res.setHeader("Content-Disposition", `attachment; filename=backup-settings-${Date.now()}.json`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(backup, null, 2));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
