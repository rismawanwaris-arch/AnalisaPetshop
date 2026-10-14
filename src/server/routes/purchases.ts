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

// GET /api/purchases/invoices - List invoices with filtering
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
