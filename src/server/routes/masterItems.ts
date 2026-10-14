import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/master-items - Query master items with search & filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { search, group, status, page = "1", limit = "50" } = req.query;

    const pageNum = Math.max(1, parseInt(String(page)) || 1);
    const take = Math.min(200, Math.max(10, parseInt(String(limit)) || 50));
    const skip = (pageNum - 1) * take;

    const where: any = {};
    if (status) where.status = String(status);
    if (group) where.itemGroup = String(group);
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { code: { contains: String(search), mode: "insensitive" } },
        { barcode: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [total, items, groups] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take,
      }),
      prisma.item.findMany({
        select: { itemGroup: true },
        distinct: ["itemGroup"],
      }),
    ]);

    const groupList = groups.map((g) => g.itemGroup).filter(Boolean);

    res.json({
      total,
      page: pageNum,
      totalPages: Math.ceil(total / take),
      items,
      groups: groupList,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/master-items - Create new master item
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      code,
      name,
      barcode,
      itemGroup,
      unitBase = "PCS",
      unitPurchase = "PCS",
      lastPurchasePrice = 0,
      avgHpp = 0,
      priceRetail = 0,
      priceAgent = 0,
      priceOnline = 0,
      priceRepack = 0,
      priceBranch = 0,
      status = "Aktif",
    } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: "Kode dan Nama Barang wajib diisi" });
    }

    const marginRetail = (parseFloat(priceRetail) || 0) - (parseFloat(avgHpp) || parseFloat(lastPurchasePrice) || 0);

    const newItem = await prisma.item.create({
      data: {
        code: String(code).trim(),
        name: String(name).trim(),
        barcode: barcode ? String(barcode).trim() : null,
        itemGroup: itemGroup ? String(itemGroup).trim() : null,
        unitBase: String(unitBase).trim(),
        unitPurchase: String(unitPurchase).trim(),
        lastPurchasePrice: parseFloat(lastPurchasePrice) || 0,
        avgHpp: parseFloat(avgHpp) || 0,
        priceRetail: parseFloat(priceRetail) || 0,
        priceAgent: parseFloat(priceAgent) || 0,
        priceOnline: parseFloat(priceOnline) || 0,
        priceRepack: parseFloat(priceRepack) || 0,
        priceBranch: parseFloat(priceBranch) || 0,
        marginRetail,
        status: String(status).trim(),
        branch: "BANDUNG",
      },
    });

    res.json(newItem);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Kode barang sudah terdaftar untuk cabang ini" });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/master-items/:id - Update master item
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const {
      code,
      name,
      barcode,
      itemGroup,
      unitBase,
      unitPurchase,
      lastPurchasePrice,
      avgHpp,
      priceRetail,
      priceAgent,
      priceOnline,
      priceRepack,
      priceBranch,
      status,
    } = req.body;

    const existing = await prisma.item.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Item tidak ditemukan" });

    const newRetail = priceRetail !== undefined ? parseFloat(priceRetail) : Number(existing.priceRetail || 0);
    const newHpp = avgHpp !== undefined ? parseFloat(avgHpp) : Number(existing.avgHpp || 0);
    const marginRetail = newRetail - newHpp;

    const updated = await prisma.item.update({
      where: { id },
      data: {
        code: code !== undefined ? String(code).trim() : undefined,
        name: name !== undefined ? String(name).trim() : undefined,
        barcode: barcode !== undefined ? (barcode ? String(barcode).trim() : null) : undefined,
        itemGroup: itemGroup !== undefined ? (itemGroup ? String(itemGroup).trim() : null) : undefined,
        unitBase: unitBase !== undefined ? String(unitBase).trim() : undefined,
        unitPurchase: unitPurchase !== undefined ? String(unitPurchase).trim() : undefined,
        lastPurchasePrice: lastPurchasePrice !== undefined ? parseFloat(lastPurchasePrice) : undefined,
        avgHpp: avgHpp !== undefined ? parseFloat(avgHpp) : undefined,
        priceRetail: priceRetail !== undefined ? parseFloat(priceRetail) : undefined,
        priceAgent: priceAgent !== undefined ? parseFloat(priceAgent) : undefined,
        priceOnline: priceOnline !== undefined ? parseFloat(priceOnline) : undefined,
        priceRepack: priceRepack !== undefined ? parseFloat(priceRepack) : undefined,
        priceBranch: priceBranch !== undefined ? parseFloat(priceBranch) : undefined,
        marginRetail,
        status: status !== undefined ? String(status).trim() : undefined,
      },
    });

    res.json(updated);
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(400).json({ error: "Kode barang sudah terdaftar untuk cabang ini" });
    }
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/master-items/:id - Delete master item
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // Disconnect purchase items referencing this item
    await prisma.purchaseItem.updateMany({
      where: { itemId: id },
      data: { itemId: null },
    });

    // Check if sales exist
    const salesCount = await prisma.sale.count({ where: { itemId: id } });
    if (salesCount > 0) {
      // Instead of hard deleting, mark non-active and hidden so sales integrity is preserved
      await prisma.item.update({
        where: { id },
        data: { status: "Non-Aktif", isHidden: true },
      });
      return res.json({ success: true, message: "Item memiliki riwayat penjualan, status diubah menjadi Non-Aktif" });
    }

    await prisma.item.delete({ where: { id } });
    res.json({ success: true, message: "Item berhasil dihapus permanen" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
