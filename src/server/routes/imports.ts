import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { parseSalesExcel } from "../../lib/parseSales.js";
import { parsePurchaseExcel } from "../../lib/parsePurchases.js";
import { parseMasterItemsExcel } from "../../lib/parseMasterItems.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });
const router = Router();

// POST /api/imports/sales - Upload sales Excel
router.post("/sales", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const filename = req.file.originalname;
    const { rows, errors } = parseSalesExcel(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({ error: "Tidak ada baris data yang valid ditemukan", details: errors });
    }

    // 1. Create ImportBatch
    const batch = await prisma.importBatch.create({
      data: {
        filename,
        status: "PROCESSING",
        rowCount: rows.length,
        type: "SALES",
      },
    });

    // 2. Cache Outlets, Items, Employees
    const outletMap = new Map<string, number>();
    const itemMap = new Map<string, number>();
    const employeeMap = new Map<string, number>();

    // Preload
    const existingOutlets = await prisma.outlet.findMany();
    existingOutlets.forEach((o) => outletMap.set(o.name, o.id));

    const existingEmployees = await prisma.employee.findMany();
    existingEmployees.forEach((e) => employeeMap.set(e.name, e.id));

    const existingItems = await prisma.item.findMany();
    existingItems.forEach((i) => itemMap.set(i.code, i.id));

    let insertedCount = 0;
    let duplicateCount = 0;

    for (const r of rows) {
      // Ensure Outlet
      if (!outletMap.has(r.cabang)) {
        const newOutlet = await prisma.outlet.upsert({
          where: { name: r.cabang },
          update: {},
          create: { name: r.cabang, branch: "BANDUNG" },
        });
        outletMap.set(r.cabang, newOutlet.id);
      }
      const outletId = outletMap.get(r.cabang)!;

      // Ensure Employee
      if (!employeeMap.has(r.pegawai)) {
        const newEmp = await prisma.employee.upsert({
          where: { name: r.pegawai },
          update: {},
          create: { name: r.pegawai },
        });
        employeeMap.set(r.pegawai, newEmp.id);
      }
      const employeeId = employeeMap.get(r.pegawai)!;

      // Ensure Item
      if (!itemMap.has(r.kodeItem)) {
        const newItem = await prisma.item.upsert({
          where: { code_branch: { code: r.kodeItem, branch: "BANDUNG" } },
          update: {
            name: r.namaItem,
            itemGroup: r.itemGroup || undefined,
          },
          create: {
            code: r.kodeItem,
            name: r.namaItem,
            itemGroup: r.itemGroup,
            branch: "BANDUNG",
            isFromSalesImport: true,
          },
        });
        itemMap.set(r.kodeItem, newItem.id);
      }
      const itemId = itemMap.get(r.kodeItem)!;

      // Check duplicate
      const exists = await prisma.sale.findUnique({
        where: { rowHash: r.rowHash },
      });

      if (exists) {
        duplicateCount++;
        continue;
      }

      await prisma.sale.create({
        data: {
          noTransaksi: r.noTransaksi,
          tanggal: r.tanggal,
          jamBuat: r.jamBuat,
          customer: r.customer,
          qty: r.qty,
          unit: r.unit,
          hargaJual: r.hargaJual,
          diskon: r.diskon,
          subtotal: r.subtotal,
          hpp: r.hpp,
          labaRugi: r.labaRugi,
          rowHash: r.rowHash,
          outletId,
          itemId,
          employeeId,
          importId: batch.id,
        },
      });
      insertedCount++;
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "DONE",
        insertedCount,
        duplicateCount,
      },
    });

    res.json({
      success: true,
      batchId: batch.id,
      rowCount: rows.length,
      insertedCount,
      duplicateCount,
      errors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/imports/purchases - Upload purchases Excel
router.post("/purchases", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const filename = req.file.originalname;
    const { invoices, errors } = parsePurchaseExcel(req.file.buffer);

    if (invoices.length === 0) {
      return res.status(400).json({ error: "Tidak ada faktur pembelian yang valid", details: errors });
    }

    const batch = await prisma.importBatch.create({
      data: {
        filename,
        status: "PROCESSING",
        rowCount: invoices.length,
        type: "PURCHASES",
      },
    });

    let insertedInvoices = 0;
    let updatedInvoices = 0;

    for (const inv of invoices) {
      // Ensure Vendor
      const vendor = await prisma.vendor.upsert({
        where: { name: inv.vendor },
        update: {},
        create: { name: inv.vendor },
      });

      // Ensure Outlet
      const outlet = await prisma.outlet.upsert({
        where: { name: inv.cabang },
        update: {},
        create: { name: inv.cabang, branch: "BANDUNG" },
      });

      // Upsert Purchase Invoice
      const existingInv = await prisma.purchaseInvoice.findUnique({
        where: { noFaktur: inv.noFaktur },
      });

      let invoiceRecordId: number;
      if (existingInv) {
        await prisma.purchaseInvoice.update({
          where: { id: existingInv.id },
          data: {
            tanggal: inv.tanggal,
            subtotal: inv.subtotal,
            pajak: inv.pajak,
            diskon: inv.diskon,
            lainLain: inv.lainLain,
            total: inv.total,
            vendorId: vendor.id,
            outletId: outlet.id,
          },
        });
        invoiceRecordId = existingInv.id;
        updatedInvoices++;
      } else {
        const created = await prisma.purchaseInvoice.create({
          data: {
            noFaktur: inv.noFaktur,
            fakturRef: inv.fakturRef,
            tanggal: inv.tanggal,
            vendorId: vendor.id,
            outletId: outlet.id,
            mataUang: inv.mataUang,
            subtotal: inv.subtotal,
            pajak: inv.pajak,
            diskon: inv.diskon,
            lainLain: inv.lainLain,
            total: inv.total,
            importId: batch.id,
          },
        });
        invoiceRecordId = created.id;
        insertedInvoices++;
      }

      // Upsert items
      for (const it of inv.items) {
        // Link to Item if code matches
        const itemRecord = await prisma.item.findFirst({
          where: { code: it.itemCode },
        });

        await prisma.purchaseItem.upsert({
          where: { rowHash: it.rowHash },
          update: {
            qty: it.qty,
            harga: it.harga,
            subtotalItem: it.subtotalItem,
          },
          create: {
            invoiceId: invoiceRecordId,
            noDetail: it.noDetail,
            itemCode: it.itemCode,
            itemName: it.itemName,
            itemId: itemRecord?.id || null,
            qty: it.qty,
            satuan: it.satuan,
            disc: it.disc,
            tax: it.tax,
            harga: it.harga,
            subtotalItem: it.subtotalItem,
            rowHash: it.rowHash,
          },
        });

        // Update last purchase price on Item if matched
        if (itemRecord) {
          await prisma.item.update({
            where: { id: itemRecord.id },
            data: {
              lastPurchasePrice: it.harga,
            },
          });
        }
      }
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "DONE",
        insertedCount: insertedInvoices,
        duplicateCount: updatedInvoices,
      },
    });

    res.json({
      success: true,
      batchId: batch.id,
      invoicesCount: invoices.length,
      insertedInvoices,
      updatedInvoices,
      errors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/imports/master-items - Upload master items catalog
router.post("/master-items", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const items = parseMasterItemsExcel(req.file.buffer);
    if (items.length === 0) return res.status(400).json({ error: "Tidak ada data item yang valid" });

    let upsertCount = 0;
    for (const it of items) {
      await prisma.item.upsert({
        where: { code_branch: { code: it.code, branch: "BANDUNG" } },
        update: {
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
        create: {
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
      upsertCount++;
    }

    res.json({ success: true, count: upsertCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/imports - Get history of batch imports
router.get("/", async (req: Request, res: Response) => {
  try {
    const batches = await prisma.importBatch.findMany({
      orderBy: { uploadedAt: "desc" },
      take: 50,
    });
    res.json(batches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
