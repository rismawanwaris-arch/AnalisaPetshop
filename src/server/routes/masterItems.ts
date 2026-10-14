import { Router, Request, Response } from "express";
import multer from "multer";
import * as xlsx from "xlsx";
import { prisma } from "../../lib/prisma.js";
import { parseMasterItemsExcel } from "../../lib/parseMasterItems.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

const router = Router();

// GET /api/master-items/template - Download Excel template for Master Items
router.get("/template", async (req: Request, res: Response) => {
  try {
    const wb = xlsx.utils.book_new();
    const sampleData = [
      {
        "Kode Item": "RC-FIT-32-400G",
        "Nama Item": "ROYAL CANIN FIT 32 400G",
        "Barcode": "3182550702157",
        "Kategori / Grup": "CAT ADULT DRY",
        "Satuan Dasar": "PCS",
        "Satuan Beli": "PCS",
        "Harga Beli Terakhir": 65000,
        "HPP Rata-rata": 65000,
        "Harga Retail (0)": 78000,
        "Harga Agen (1)": 72000,
        "Harga Online (2)": 79000,
        "Harga Repack (3)": 0,
        "Harga Outlet Cabang (5)": 70000,
        "Status": "Aktif",
      },
      {
        "Kode Item": "WHK-POUCH-JR-85G",
        "Nama Item": "WHISKAS POUCH JUNIOR TUNA 85G",
        "Barcode": "93420625",
        "Kategori / Grup": "MAKANAN BASAH",
        "Satuan Dasar": "PCS",
        "Satuan Beli": "DUS",
        "Harga Beli Terakhir": 6500,
        "HPP Rata-rata": 6500,
        "Harga Retail (0)": 8500,
        "Harga Agen (1)": 7500,
        "Harga Online (2)": 9000,
        "Harga Repack (3)": 0,
        "Harga Outlet Cabang (5)": 7000,
        "Status": "Aktif",
      },
      {
        "Kode Item": "PASIR-BENTONITE-25L",
        "Nama Item": "PASIR KUCING GUMPAL WANGI 25L",
        "Barcode": "8997201830012",
        "Kategori / Grup": "PASIR",
        "Satuan Dasar": "SAK",
        "Satuan Beli": "SAK",
        "Harga Beli Terakhir": 95000,
        "HPP Rata-rata": 95000,
        "Harga Retail (0)": 125000,
        "Harga Agen (1)": 110000,
        "Harga Online (2)": 130000,
        "Harga Repack (3)": 0,
        "Harga Outlet Cabang (5)": 105000,
        "Status": "Aktif",
      },
    ];

    const ws = xlsx.utils.json_to_sheet(sampleData);
    xlsx.utils.book_append_sheet(wb, ws, "Master Barang");
    const buf = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", 'attachment; filename="template_master_item.xlsx"');
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal membuat template master item" });
  }
});

// POST /api/master-items/upload - Upload Excel to upsert Master Items with ActivityLog
router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const items = parseMasterItemsExcel(req.file.buffer);
    if (items.length === 0) {
      return res.status(400).json({
        error: "Tidak ada baris data barang yang valid. Pastikan file memiliki kolom 'Kode Item' dan 'Nama Item'.",
      });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const it of items) {
      const existing = await prisma.item.findUnique({
        where: { code_branch: { code: it.code, branch: "BANDUNG" } },
        select: { id: true },
      });

      if (existing) {
        await prisma.item.update({
          where: { id: existing.id },
          data: {
            name: it.name,
            barcode: it.barcode,
            itemGroup: it.itemGroup,
            unitBase: it.unitBase,
            unitPurchase: it.unitPurchase,
            lastPurchasePrice: it.lastPurchasePrice,
            avgHpp: it.avgHpp,
            priceRetail: it.priceRetail,
            priceAgent: it.priceAgent,
            priceOnline: it.priceOnline,
            priceRepack: it.priceRepack,
            priceBranch: it.priceBranch,
            marginRetail: it.marginRetail,
            status: it.status,
            isFromSalesImport: false,
          },
        });
        updatedCount++;
      } else {
        await prisma.item.create({
          data: {
            code: it.code,
            name: it.name,
            barcode: it.barcode,
            itemGroup: it.itemGroup,
            unitBase: it.unitBase,
            unitPurchase: it.unitPurchase,
            lastPurchasePrice: it.lastPurchasePrice,
            avgHpp: it.avgHpp,
            priceRetail: it.priceRetail,
            priceAgent: it.priceAgent,
            priceOnline: it.priceOnline,
            priceRepack: it.priceRepack,
            priceBranch: it.priceBranch,
            marginRetail: it.marginRetail,
            status: it.status,
            branch: "BANDUNG",
            isFromSalesImport: false,
          },
        });
        createdCount++;
      }
    }

    // Record ActivityLog
    const userActor = req.user ? `${req.user.role}:${req.user.username}` : "SYSTEM";
    await prisma.activityLog.create({
      data: {
        role: userActor,
        action: "MASTER_ITEMS_EXCEL_SYNC",
        detail: `Impor/Update Master Item: ${items.length} barang disinkronkan (${createdCount} baru, ${updatedCount} diperbarui) dari file "${req.file.originalname}"`,
        ip: (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || null,
      },
    });

    res.json({
      success: true,
      count: items.length,
      created: createdCount,
      updated: updatedCount,
      message: `Berhasil memproses ${items.length} barang (${createdCount} baru, ${updatedCount} diperbarui).`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengimpor file Excel master item" });
  }
});

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
