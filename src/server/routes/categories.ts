import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/categories - Item list by category with aggregation and ranking
router.get("/", async (req: Request, res: Response) => {
  try {
    const { from, to, category, search } = req.query;

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

    if (category) {
      where.item.itemGroup = { contains: String(category), mode: "insensitive" };
    }

    if (search) {
      where.OR = [
        { item: { name: { contains: String(search), mode: "insensitive" } } },
        { item: { code: { contains: String(search), mode: "insensitive" } } },
      ];
    }

    // Fetch mappings for label
    const mappings = await prisma.itemGroupMapping.findMany();
    const mappingMap = new Map(mappings.map((m) => [m.itemGroup.toUpperCase(), m.category]));

    const sales = await prisma.sale.findMany({
      where,
      select: {
        qty: true,
        subtotal: true,
        labaRugi: true,
        item: {
          select: {
            code: true,
            name: true,
            itemGroup: true,
          },
        },
      },
    });

    const itemMap = new Map<string, {
      code: string;
      name: string;
      itemGroup: string;
      mappedCategory: string;
      qty: number;
      omzet: number;
      laba: number;
    }>();

    const categorySet = new Set<string>();

    for (const s of sales) {
      const code = s.item.code;
      const group = (s.item.itemGroup || "LAINNYA").trim();
      const mapped = mappingMap.get(group.toUpperCase()) || group;

      categorySet.add(group);

      if (!itemMap.has(code)) {
        itemMap.set(code, {
          code,
          name: s.item.name,
          itemGroup: group,
          mappedCategory: mapped,
          qty: 0,
          omzet: 0,
          laba: 0,
        });
      }

      const it = itemMap.get(code)!;
      it.qty += Number(s.qty);
      it.omzet += Number(s.subtotal);
      it.laba += Number(s.labaRugi);
    }

    const items = Array.from(itemMap.values()).sort((a, b) => b.omzet - a.omzet);

    res.json({
      totalItems: items.length,
      categories: Array.from(categorySet).sort(),
      items,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
