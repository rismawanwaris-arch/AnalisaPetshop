import { prisma } from "./prisma.js";
import { hashPassword } from "./password.js";

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

  // 2. Default Targets (Petshop, Aksesoris, SP_VOUCHER)
  const defaultTargets = [
    { scope: "PERKONTER" as const, category: "PETSHOP" as const, amount: 35000 },
    { scope: "PERKONTER" as const, category: "AKSESORIS" as const, amount: 35000 },
    { scope: "PERKONTER" as const, category: "SP_VOUCHER" as const, amount: 100000 },
    { scope: "ALL" as const, category: "PETSHOP" as const, amount: 1190000 },
    { scope: "ALL" as const, category: "AKSESORIS" as const, amount: 1400000 },
    { scope: "ALL" as const, category: "SP_VOUCHER" as const, amount: 4000000 },
  ];

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

  // 3. Item Group Mappings
  const mappings = [
    { itemGroup: "CAT ADULT DRY", category: "PETSHOP" as const },
    { itemGroup: "CAT KITTEN DRY", category: "PETSHOP" as const },
    { itemGroup: "MAKANAN BASAH", category: "PETSHOP" as const },
    { itemGroup: "DOG ADULT DRY", category: "PETSHOP" as const },
    { itemGroup: "MAKANAN DOG", category: "PETSHOP" as const },
    { itemGroup: "MOTHER AND KITTEN", category: "PETSHOP" as const },
    { itemGroup: "PASIR", category: "PETSHOP" as const },
    { itemGroup: "OBAT", category: "PETSHOP" as const },
    { itemGroup: "SNACK KUCING", category: "PETSHOP" as const },
    { itemGroup: "AKSESORIS", category: "AKSESORIS" as const },
    { itemGroup: "SP/VOUCHER", category: "SP_VOUCHER" as const },
  ];

  for (const m of mappings) {
    await prisma.itemGroupMapping.upsert({
      where: { itemGroup: m.itemGroup },
      update: {},
      create: { itemGroup: m.itemGroup, category: m.category, isDefault: true },
    });
    await prisma.pointGroupMapping.upsert({
      where: { itemGroup: m.itemGroup },
      update: {},
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
}

