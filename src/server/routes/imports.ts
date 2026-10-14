import { Router, Request, Response } from "express";
import multer from "multer";
import { prisma } from "../../lib/prisma.js";
import { parseSalesExcel } from "../../lib/parseSales.js";
import { parsePurchaseExcel } from "../../lib/parsePurchases.js";
import { parseMasterItemsExcel } from "../../lib/parseMasterItems.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const router = Router();

// POST /api/imports/sales - Upload sales Excel (High Performance Batch Insert)
router.post("/sales", upload.single("file"), async (req: Request, res: Response) => {
  let batchId: number | null = null;
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const filename = req.file.originalname;
    const { rows, errors } = parseSalesExcel(req.file.buffer);

    if (rows.length === 0) {
      return res.status(400).json({
        error: "Tidak ada baris data penjualan yang dapat dibaca. Pastikan kolom 'No Transaksi' dan 'Kode Item' ada di dalam file Excel.",
        details: errors,
      });
    }

    // Determine period from rows
    const validTimestamps = rows.map((r) => r.tanggal.getTime()).filter((t) => !isNaN(t));
    const periodStart = validTimestamps.length > 0 ? new Date(Math.min(...validTimestamps)) : null;
    const periodEnd = validTimestamps.length > 0 ? new Date(Math.max(...validTimestamps)) : null;

    // 1. Create ImportBatch record
    const batch = await prisma.importBatch.create({
      data: {
        filename,
        status: "PROCESSING",
        rowCount: rows.length,
        type: "SALES",
        periodStart,
        periodEnd,
      },
    });
    batchId = batch.id;

    // 2. Pre-process Outlets in bulk
    const outletMap = new Map<string, number>();
    const existingOutlets = await prisma.outlet.findMany();
    existingOutlets.forEach((o) => outletMap.set(o.name, o.id));

    const uniqueOutletNames = [...new Set(rows.map((r) => r.cabang).filter(Boolean))];
    for (const name of uniqueOutletNames) {
      if (!outletMap.has(name)) {
        const newOutlet = await prisma.outlet.upsert({
          where: { name },
          update: {},
          create: { name, branch: "BANDUNG" },
        });
        outletMap.set(name, newOutlet.id);
      }
    }

    // 3. Pre-process Employees in bulk
    const employeeMap = new Map<string, number>();
    const existingEmployees = await prisma.employee.findMany();
    existingEmployees.forEach((e) => employeeMap.set(e.name, e.id));

    const uniqueEmpNames = [...new Set(rows.map((r) => r.pegawai).filter(Boolean))];
    for (const name of uniqueEmpNames) {
      if (!employeeMap.has(name)) {
        const newEmp = await prisma.employee.upsert({
          where: { name },
          update: {},
          create: { name },
        });
        employeeMap.set(name, newEmp.id);
      }
    }

    // 4. Pre-process Items in bulk
    const itemMap = new Map<string, number>();
    const existingItems = await prisma.item.findMany({ where: { branch: "BANDUNG" } });
    existingItems.forEach((i) => itemMap.set(i.code, i.id));

    const itemMetaMap = new Map<string, { code: string; name: string; itemGroup?: string }>();
    for (const r of rows) {
      if (r.kodeItem && !itemMap.has(r.kodeItem) && !itemMetaMap.has(r.kodeItem)) {
        itemMetaMap.set(r.kodeItem, { code: r.kodeItem, name: r.namaItem, itemGroup: r.itemGroup });
      }
    }

    for (const it of itemMetaMap.values()) {
      const newItem = await prisma.item.upsert({
        where: { code_branch: { code: it.code, branch: "BANDUNG" } },
        update: {
          name: it.name,
          itemGroup: it.itemGroup || undefined,
        },
        create: {
          code: it.code,
          name: it.name,
          itemGroup: it.itemGroup,
          branch: "BANDUNG",
          isFromSalesImport: true,
        },
      });
      itemMap.set(it.code, newItem.id);
    }

    // 5. Deduplicate against existing rowHashes in bulk (both deterministic & legacy hashes)
    const allDeterministicHashes = rows.map((r) => r.rowHash);
    const allLegacyHashes = rows.map((r) => r.legacyHash).filter(Boolean) as string[];
    const allLookupHashes = Array.from(new Set([...allDeterministicHashes, ...allLegacyHashes]));

    const existingSales = await prisma.sale.findMany({
      where: { rowHash: { in: allLookupHashes } },
      select: { rowHash: true },
    });
    const existingHashSet = new Set(existingSales.map((s) => s.rowHash));

    // Fallback outlet & employee
    const defaultOutletId = outletMap.values().next().value || 1;
    const defaultEmpId = employeeMap.values().next().value || 1;

    // Prepare rows for bulk insert
    const salesToInsert: any[] = [];
    let duplicateCount = 0;

    for (const r of rows) {
      if (existingHashSet.has(r.rowHash) || (r.legacyHash && existingHashSet.has(r.legacyHash))) {
        duplicateCount++;
        continue;
      }

      const outletId = outletMap.get(r.cabang) || defaultOutletId;
      const employeeId = employeeMap.get(r.pegawai) || defaultEmpId;
      const itemId = itemMap.get(r.kodeItem);

      if (!itemId) {
        continue;
      }

      salesToInsert.push({
        noTransaksi: r.noTransaksi,
        tanggal: r.tanggal,
        jamBuat: r.jamBuat,
        customer: r.customer,
        qty: Math.round(r.qty),
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
      });
    }

    // 6. Fast Chunked Insert (500 rows per batch)
    let insertedCount = 0;
    const CHUNK_SIZE = 500;
    for (let i = 0; i < salesToInsert.length; i += CHUNK_SIZE) {
      const chunk = salesToInsert.slice(i, i + CHUNK_SIZE);
      await prisma.sale.createMany({
        data: chunk,
        skipDuplicates: true,
      });
      insertedCount += chunk.length;
    }

    // 7. Update Batch Status
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
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    if (batchId) {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: { status: "FAILED", errorMessage: err.message },
      }).catch(() => {});
    }
    res.status(500).json({ error: err.message || "Gagal memproses data penjualan" });
  }
});

// POST /api/imports/purchases - Upload purchases Excel
router.post("/purchases", upload.single("file"), async (req: Request, res: Response) => {
  let batchId: number | null = null;
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const filename = req.file.originalname;
    const { invoices, errors } = parsePurchaseExcel(req.file.buffer);

    if (invoices.length === 0) {
      return res.status(400).json({
        error: "Tidak ada faktur pembelian yang valid. Pastikan kolom 'No Faktur' dan 'Vendor' terisi.",
        details: errors,
      });
    }

    // Determine period
    const validTimestamps = invoices.map((inv) => inv.tanggal.getTime()).filter((t) => !isNaN(t));
    const periodStart = validTimestamps.length > 0 ? new Date(Math.min(...validTimestamps)) : null;
    const periodEnd = validTimestamps.length > 0 ? new Date(Math.max(...validTimestamps)) : null;

    const batch = await prisma.importBatch.create({
      data: {
        filename,
        status: "PROCESSING",
        rowCount: invoices.length,
        type: "PURCHASES",
        periodStart,
        periodEnd,
      },
    });
    batchId = batch.id;

    // Cache Vendors & Outlets
    const vendorMap = new Map<string, number>();
    const existingVendors = await prisma.vendor.findMany();
    existingVendors.forEach((v) => vendorMap.set(v.name, v.id));

    const outletMap = new Map<string, number>();
    const existingOutlets = await prisma.outlet.findMany();
    existingOutlets.forEach((o) => outletMap.set(o.name, o.id));

    let insertedInvoices = 0;
    let updatedInvoices = 0;

    for (const inv of invoices) {
      // Ensure Vendor
      if (!vendorMap.has(inv.vendor)) {
        const v = await prisma.vendor.upsert({
          where: { name: inv.vendor },
          update: {},
          create: { name: inv.vendor },
        });
        vendorMap.set(inv.vendor, v.id);
      }
      const vendorId = vendorMap.get(inv.vendor)!;

      // Ensure Outlet
      if (!outletMap.has(inv.cabang)) {
        const o = await prisma.outlet.upsert({
          where: { name: inv.cabang },
          update: {},
          create: { name: inv.cabang, branch: "BANDUNG" },
        });
        outletMap.set(inv.cabang, o.id);
      }
      const outletId = outletMap.get(inv.cabang)!;

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
            vendorId,
            outletId,
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
            vendorId,
            outletId,
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

      // Upsert Purchase Items
      for (const it of inv.items) {
        const itemRecord = await prisma.item.findFirst({
          where: { code: it.itemCode, branch: "BANDUNG" },
        });

        const existingPurchaseItem = await prisma.purchaseItem.findFirst({
          where: {
            OR: [
              { rowHash: it.rowHash },
              ...(it.legacyHash ? [{ rowHash: it.legacyHash }] : []),
            ],
          },
        });

        if (existingPurchaseItem) {
          await prisma.purchaseItem.update({
            where: { id: existingPurchaseItem.id },
            data: {
              rowHash: it.rowHash,
              invoiceId: invoiceRecordId,
              noDetail: it.noDetail,
              qty: it.qty,
              harga: it.harga,
              subtotalItem: it.subtotalItem,
              itemId: itemRecord?.id || existingPurchaseItem.itemId,
            },
          });
        } else {
          await prisma.purchaseItem.create({
            data: {
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
        }

        if (itemRecord && it.harga > 0) {
          await prisma.item.update({
            where: { id: itemRecord.id },
            data: { lastPurchasePrice: it.harga },
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
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    if (batchId) {
      await prisma.importBatch.update({
        where: { id: batchId },
        data: { status: "FAILED", errorMessage: err.message },
      }).catch(() => {});
    }
    res.status(500).json({ error: err.message || "Gagal memproses data pembelian" });
  }
});

// POST /api/imports/master-items - Upload master items catalog
router.post("/master-items", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: "File Excel wajib diunggah" });

    const items = parseMasterItemsExcel(req.file.buffer);
    if (items.length === 0) {
      return res.status(400).json({
        error: "Tidak ada baris data barang yang valid. Pastikan terdapat kolom 'Kode Item' dan 'Nama Item'.",
      });
    }

    let upsertCount = 0;
    const CHUNK_SIZE = 50;

    for (let i = 0; i < items.length; i += CHUNK_SIZE) {
      const chunk = items.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map((it) =>
          prisma.item.upsert({
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
          })
        )
      );
      upsertCount += chunk.length;
    }

    res.json({ success: true, count: upsertCount, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Gagal memproses master item" });
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

// DELETE /api/imports/:id - Delete an import batch and cascade sales/purchases
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.sale.deleteMany({ where: { importId: id } });
    await prisma.purchaseInvoice.deleteMany({ where: { importId: id } });
    await prisma.importBatch.delete({ where: { id } });
    res.json({ success: true, message: "Batch import berhasil dihapus" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
