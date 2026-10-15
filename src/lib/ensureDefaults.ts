import { prisma } from "./prisma.js";
import { hashPassword } from "./password.js";
import { defaultItemPoints } from "./defaultItemPoints.js";

export async function ensureDefaults(branch: "BANDUNG" | "CIMAHI" = "BANDUNG") {
  // 1. PointSettings singleton
  await prisma.pointSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      periodStartDay: 1,
      pointTargetMonthly: 100,
      pointTargetWeekly: 25,
      pointTargetDaily: 5,
      pointRupiahRate: 100,
      hiddenMenuItems: [],
    },
  });

  // 2. Default Targets (DRYFOOD, WETFOOD, AKSESORIS)
  const defaultTargets = [
    { scope: "PERKONTER" as const, category: "DRYFOOD" as const, amount: 35000 },
    { scope: "PERKONTER" as const, category: "WETFOOD" as const, amount: 35000 },
    { scope: "PERKONTER" as const, category: "AKSESORIS" as const, amount: 35000 },
    { scope: "ALL" as const, category: "DRYFOOD" as const, amount: 1190000 },
    { scope: "ALL" as const, category: "WETFOOD" as const, amount: 1190000 },
    { scope: "ALL" as const, category: "AKSESORIS" as const, amount: 1400000 },
  ];

  // Remove obsolete target categories (PETSHOP, SP_VOUCHER)
  await prisma.target.deleteMany({
    where: {
      category: { in: ["PETSHOP", "SP_VOUCHER"] },
    },
  });

  for (const t of defaultTargets) {
    await prisma.target.upsert({
      where: {
        scope_category_branch: {
          scope: t.scope,
          category: t.category,
          branch,
        },
      },
      update: {},
      create: {
        scope: t.scope,
        category: t.category,
        branch,
        amount: t.amount,
      },
    });
  }

  // 3. Item Group Mappings (DRYFOOD, WETFOOD, AKSESORIS)
  const mappings = [
    { itemGroup: "CAT ADULT DRY", category: "DRYFOOD" },
    { itemGroup: "CAT KITTEN DRY", category: "DRYFOOD" },
    { itemGroup: "DOG ADULT DRY", category: "DRYFOOD" },
    { itemGroup: "MOTHER AND KITTEN", category: "DRYFOOD" },
    { itemGroup: "MAKANAN BASAH", category: "WETFOOD" },
    { itemGroup: "MAKANAN DOG", category: "WETFOOD" },
    { itemGroup: "SNACK KUCING", category: "WETFOOD" },
    { itemGroup: "AKSESORIS", category: "AKSESORIS" },
    { itemGroup: "PASIR", category: "AKSESORIS" },
    { itemGroup: "OBAT", category: "AKSESORIS" },
  ];

  for (const m of mappings) {
    await prisma.itemGroupMapping.upsert({
      where: { itemGroup: m.itemGroup },
      update: { category: m.category },
      create: { itemGroup: m.itemGroup, category: m.category, isDefault: true },
    });
    await prisma.pointGroupMapping.upsert({
      where: { itemGroup: m.itemGroup },
      update: { category: m.category },
      create: { itemGroup: m.itemGroup, category: m.category, isDefault: true },
    });
  }

  // 4. Default Accounts (Master & Admin levels)
  const masterPassword = process.env.MASTER_PASSWORD || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin";

  // Ensure 'master' user
  const existingMaster = await prisma.user.findUnique({ where: { username: "master" } });
  if (!existingMaster) {
    await prisma.user.create({
      data: {
        username: "master",
        displayName: "Master Admin",
        passwordHash: hashPassword(masterPassword),
        role: "master",
        isActive: true,
      },
    });
  }

  // Ensure 'admin' user
  const existingAdmin = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        username: "admin",
        displayName: "Staff Admin",
        passwordHash: hashPassword(adminPassword),
        role: "admin",
        isActive: true,
      },
    });
  } else if (existingAdmin.role === "master") {
    // If admin was previously set to master, adjust to admin level now that 'master' account exists
    await prisma.user.update({
      where: { username: "admin" },
      data: { role: "admin", displayName: "Staff Admin" },
    });
  }

  // 5. Default Item Points (288 items)
  const defaultStartDate = new Date("2026-01-01");
  const existingPoints = await prisma.itemPoint.findMany();
  const existingMap = new Map(existingPoints.map((p) => [p.pattern.toUpperCase(), p]));

  const toCreate: Array<{ pattern: string; points: number; startDate: Date; isDefault: boolean }> = [];
  const toUpdate: Array<{ id: number; points: number }> = [];

  for (const item of defaultItemPoints) {
    const found = existingMap.get(item.pattern.toUpperCase());
    if (!found) {
      toCreate.push({
        pattern: item.pattern,
        points: item.points,
        startDate: defaultStartDate,
        isDefault: true,
      });
    } else if (found.isDefault && found.points !== item.points) {
      toUpdate.push({
        id: found.id,
        points: item.points,
      });
    }
  }

  if (toCreate.length > 0) {
    await prisma.itemPoint.createMany({
      data: toCreate,
      skipDuplicates: true,
    });
  }

  for (const u of toUpdate) {
    await prisma.itemPoint.update({
      where: { id: u.id },
      data: { points: u.points },
    });
  }
}

