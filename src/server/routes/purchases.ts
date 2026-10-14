import { Router, Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";

const router = Router();

// GET /api/purchases/vendors - List vendor summary (Last order, total spend, count)
router.get("/vendors", async (req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: {
        invoices: {
          select: {
            id: true,
            noFaktur: true,
            tanggal: true,
            total: true,
            outlet: { select: { name: true } },
            items: {
              select: {
                itemCode: true,
                itemName: true,
                qty: true,
                harga: true,
                subtotalItem: true,
              },
            },
          },
          orderBy: { tanggal: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = vendors.map((v) => {
      const invoiceCount = v.invoices.length;
      const totalAmount = v.invoices.reduce((sum, inv) => sum + Number(inv.total), 0);
      const lastInvoice = v.invoices[0]; // first because ordered desc
      const lastOrderDate = lastInvoice ? lastInvoice.tanggal : null;

      // Collect unique categories/items supplied
      const itemNames = new Set<string>();
      let totalQty = 0;
      v.invoices.forEach((inv) => {
        inv.items.forEach((it) => {
          itemNames.add(it.itemName);
          totalQty += Number(it.qty);
        });
      });

      return {
        id: v.id,
        name: v.name,
        phone: v.phone,
        address: v.address,
        invoiceCount,
        totalAmount,
        totalQty,
        itemCount: itemNames.size,
        lastOrderDate,
        lastInvoiceNo: lastInvoice?.noFaktur || null,
      };
    });

    // Sort by lastOrderDate desc by default
    result.sort((a, b) => {
      if (!a.lastOrderDate) return 1;
      if (!b.lastOrderDate) return -1;
      return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchases/summary - KPI stat cards summary
router.get("/summary", async (req: Request, res: Response) => {
  try {
    const { vendorId, outletId, search, from, to } = req.query;

    const whereInvoice: any = {};
    if (vendorId) whereInvoice.vendorId = parseInt(String(vendorId));
    if (outletId) whereInvoice.outletId = parseInt(String(outletId));
    if (from || to) {
      whereInvoice.tanggal = {};
      if (from) whereInvoice.tanggal.gte = new Date(String(from));
      if (to) whereInvoice.tanggal.lte = new Date(String(to));
    }
    if (search) {
      const q = String(search).trim();
      whereInvoice.OR = [
        { noFaktur: { contains: q, mode: "insensitive" } },
        { vendor: { name: { contains: q, mode: "insensitive" } } },
        { items: { some: { itemName: { contains: q, mode: "insensitive" } } } },
      ];
    }

    const invoices = await prisma.purchaseInvoice.findMany({
      where: whereInvoice,
      select: {
        id: true,
        total: true,
        vendorId: true,
        items: {
          select: {
            itemCode: true,
            qty: true,
          },
        },
      },
    });

    let totalBelanja = 0;
    const vendorSet = new Set<number>();
    let totalKuantitas = 0;
    const itemSet = new Set<string>();

    for (const inv of invoices) {
      totalBelanja += Number(inv.total) || 0;
      if (inv.vendorId) vendorSet.add(inv.vendorId);
      for (const it of inv.items) {
        totalKuantitas += Number(it.qty) || 0;
        if (it.itemCode) itemSet.add(it.itemCode);
      }
    }

    res.json({
      totalBelanja,
      totalNota: invoices.length,
      suplierAktif: vendorSet.size,
      totalKuantitas,
      totalVarian: itemSet.size,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengambil ringkasan pembelian" });
  }
});

// GET /api/purchases/top-items - List items ordered by spend or qty
router.get("/top-items", async (req: Request, res: Response) => {
  try {
    const { from, to, vendorId, outletId, search, sortBy = "spend", limit = "100" } = req.query;

    const whereInvoice: any = {};
    if (vendorId) whereInvoice.vendorId = parseInt(String(vendorId));
    if (outletId) whereInvoice.outletId = parseInt(String(outletId));
    if (from || to) {
      whereInvoice.tanggal = {};
      if (from) whereInvoice.tanggal.gte = new Date(String(from));
      if (to) whereInvoice.tanggal.lte = new Date(String(to));
    }

    const whereItem: any = {
      invoice: whereInvoice,
    };

    if (search) {
      const q = String(search).trim();
      whereItem.OR = [
        { itemCode: { contains: q, mode: "insensitive" } },
        { itemName: { contains: q, mode: "insensitive" } },
        { invoice: { noFaktur: { contains: q, mode: "insensitive" } } },
      ];
    }

    const items = await prisma.purchaseItem.findMany({
      where: whereItem,
      select: {
        itemCode: true,
        itemName: true,
        qty: true,
        subtotalItem: true,
        invoice: {
          select: {
            vendor: {
              select: { name: true },
            },
          },
        },
      },
    });

    const map = new Map<string, {
      itemCode: string;
      itemName: string;
      totalQty: number;
      totalSpend: number;
      vendors: Map<string, number>;
    }>();

    for (const it of items) {
      const key = it.itemCode || it.itemName;
      let existing = map.get(key);
      if (!existing) {
        existing = {
          itemCode: it.itemCode || "-",
          itemName: it.itemName || "-",
          totalQty: 0,
          totalSpend: 0,
          vendors: new Map<string, number>(),
        };
        map.set(key, existing);
      }

      const qty = Number(it.qty) || 0;
      const subtotal = Number(it.subtotalItem) || 0;
      existing.totalQty += qty;
      existing.totalSpend += subtotal;

      const vName = it.invoice?.vendor?.name || "-";
      existing.vendors.set(vName, (existing.vendors.get(vName) || 0) + subtotal);
    }

    const result = Array.from(map.values()).map((r) => {
      let mainSupplier = "-";
      let maxSpend = -1;
      for (const [v, spend] of r.vendors.entries()) {
        if (spend > maxSpend) {
          maxSpend = spend;
          mainSupplier = v;
        }
      }

      const avgPrice = r.totalQty > 0 ? r.totalSpend / r.totalQty : 0;

      return {
        itemCode: r.itemCode,
        itemName: r.itemName,
        totalQty: r.totalQty,
        totalSpend: r.totalSpend,
        avgPrice: Math.round(avgPrice),
        supplierUtama: mainSupplier,
      };
    });

    if (sortBy === "qty") {
      result.sort((a, b) => b.totalQty - a.totalQty);
    } else {
      result.sort((a, b) => b.totalSpend - a.totalSpend);
    }

    const maxLimit = Math.min(500, Math.max(1, parseInt(String(limit)) || 100));
    const sliced = result.slice(0, maxLimit).map((item, idx) => ({
      rank: idx + 1,
      ...item,
    }));

    res.json(sliced);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal mengambil data item terbanyak dibeli" });
  }
});
router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const { vendorId, outletId, search, from, to } = req.query;

    const where: any = {};
    if (vendorId) where.vendorId = parseInt(String(vendorId));
    if (outletId) where.outletId = parseInt(String(outletId));
    if (from || to) {
      where.tanggal = {};
      if (from) where.tanggal.gte = new Date(String(from));
      if (to) where.tanggal.lte = new Date(String(to));
    }
    if (search) {
      where.OR = [
        { noFaktur: { contains: String(search), mode: "insensitive" } },
        { vendor: { name: { contains: String(search), mode: "insensitive" } } },
        { items: { some: { itemName: { contains: String(search), mode: "insensitive" } } } },
      ];
    }

    const invoices = await prisma.purchaseInvoice.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true } },
        outlet: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { tanggal: "desc" },
    });

    res.json(invoices);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/purchases/invoices/:id - Detail invoice with items
router.get("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await prisma.purchaseInvoice.findUnique({
      where: { id },
      include: {
        vendor: true,
        outlet: true,
        items: {
          include: {
            item: {
              select: {
                itemGroup: true,
                priceRetail: true,
                avgHpp: true,
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!invoice) return res.status(404).json({ error: "Faktur tidak ditemukan" });
    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
