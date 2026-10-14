import fs from "fs";
import path from "path";
import { prisma } from "../lib/prisma.js";
import { ensureDefaults } from "../lib/ensureDefaults.js";
import { parseMasterItemsExcel } from "../lib/parseMasterItems.js";
import { parsePurchaseExcel } from "../lib/parsePurchases.js";
import { parseSalesExcel } from "../lib/parseSales.js";

async function main() {
  console.log("--- Memulai Seeding & Import Data Awal ---");
  await ensureDefaults("BANDUNG");

  // 1. Import Master Items (petshop.xls)
  const masterPath = path.resolve("./petshop.xls");
  if (fs.existsSync(masterPath)) {
    console.log("Importing petshop.xls...");
    const buf = fs.readFileSync(masterPath);
    const items = parseMasterItemsExcel(buf);
    let count = 0;
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
      count++;
    }
    console.log(`Berhasil import ${count} master items.`);
  }

  // 2. Import Data Pembelian (data pembelian petshop.xls)
  const purchasePath = path.resolve("./data pembelian petshop.xls");
  if (fs.existsSync(purchasePath)) {
    console.log("Importing data pembelian petshop.xls...");
    const buf = fs.readFileSync(purchasePath);
    const { invoices } = parsePurchaseExcel(buf);

    const batch = await prisma.importBatch.create({
      data: {
        filename: "data pembelian petshop.xls",
        status: "DONE",
        rowCount: invoices.length,
        insertedCount: invoices.length,
        type: "PURCHASES",
      },
    });

    for (const inv of invoices) {
      const vendor = await prisma.vendor.upsert({
        where: { name: inv.vendor },
        update: {},
        create: { name: inv.vendor },
      });

      const outlet = await prisma.outlet.upsert({
        where: { name: inv.cabang },
        update: {},
        create: { name: inv.cabang, branch: "BANDUNG" },
      });

      const invoiceRecord = await prisma.purchaseInvoice.upsert({
        where: { noFaktur: inv.noFaktur },
        update: {
          tanggal: inv.tanggal,
          subtotal: inv.subtotal,
          pajak: inv.pajak,
          diskon: inv.diskon,
          total: inv.total,
          vendorId: vendor.id,
          outletId: outlet.id,
        },
        create: {
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

      for (const it of inv.items) {
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
            invoiceId: invoiceRecord.id,
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

        if (itemRecord) {
          await prisma.item.update({
            where: { id: itemRecord.id },
            data: { lastPurchasePrice: it.harga },
          });
        }
      }
    }
    console.log(`Berhasil import ${invoices.length} faktur pembelian.`);
  }

  // 3. Import Data Penjualan (data penjualan petshop.xls)
  const salesPath = path.resolve("./data penjualan petshop.xls");
  if (fs.existsSync(salesPath)) {
    console.log("Importing data penjualan petshop.xls...");
    const buf = fs.readFileSync(salesPath);
    const { rows } = parseSalesExcel(buf);

    const batch = await prisma.importBatch.create({
      data: {
        filename: "data penjualan petshop.xls",
        status: "PROCESSING",
        rowCount: rows.length,
        type: "SALES",
      },
    });

    const outletMap = new Map<string, number>();
    const itemMap = new Map<string, number>();
    const employeeMap = new Map<string, number>();

    const existingOutlets = await prisma.outlet.findMany();
    existingOutlets.forEach((o) => outletMap.set(o.name, o.id));

    const existingEmployees = await prisma.employee.findMany();
    existingEmployees.forEach((e) => employeeMap.set(e.name, e.id));

    const existingItems = await prisma.item.findMany();
    existingItems.forEach((i) => itemMap.set(i.code, i.id));

    let inserted = 0;
    for (const r of rows) {
      if (!outletMap.has(r.cabang)) {
        const o = await prisma.outlet.upsert({
          where: { name: r.cabang },
          update: {},
          create: { name: r.cabang, branch: "BANDUNG" },
        });
        outletMap.set(r.cabang, o.id);
      }
      const outletId = outletMap.get(r.cabang)!;

      if (!employeeMap.has(r.pegawai)) {
        const e = await prisma.employee.upsert({
          where: { name: r.pegawai },
          update: {},
          create: { name: r.pegawai },
        });
        employeeMap.set(r.pegawai, e.id);
      }
      const employeeId = employeeMap.get(r.pegawai)!;

      if (!itemMap.has(r.kodeItem)) {
        const it = await prisma.item.upsert({
          where: { code_branch: { code: r.kodeItem, branch: "BANDUNG" } },
          update: { name: r.namaItem, itemGroup: r.itemGroup || undefined },
          create: {
            code: r.kodeItem,
            name: r.namaItem,
            itemGroup: r.itemGroup,
            branch: "BANDUNG",
            isFromSalesImport: true,
          },
        });
        itemMap.set(r.kodeItem, it.id);
      }
      const itemId = itemMap.get(r.kodeItem)!;

      await prisma.sale.upsert({
        where: { rowHash: r.rowHash },
        update: {},
        create: {
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
      inserted++;
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: { status: "DONE", insertedCount: inserted },
    });
    console.log(`Berhasil import ${inserted} baris penjualan.`);
  }

  console.log("--- Seeding selesai ---");
}

main().catch((e) => {
  console.error("Error during seed:", e);
  process.exit(1);
});
