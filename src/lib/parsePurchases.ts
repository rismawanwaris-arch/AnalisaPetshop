import * as xlsx from "xlsx";
import { hashString } from "./password.js";
import { parseCleanNumber, parseCleanDate, getField, extractRowsWithHeaders } from "./excelUtils.js";

export interface ParsedPurchaseItem {
  noDetail?: number;
  itemCode: string;
  itemName: string;
  qty: number;
  satuan: string;
  disc?: string;
  tax?: string;
  harga: number;
  subtotalItem: number;
  rowHash: string;
  legacyHash?: string;
}

export interface ParsedPurchaseInvoice {
  mataUang: string;
  noFaktur: string;
  tanggal: Date;
  fakturRef?: string;
  cabang: string;
  vendor: string;
  subtotal: number;
  pajak: number;
  diskon: number;
  lainLain: number;
  total: number;
  items: ParsedPurchaseItem[];
}

export function parsePurchaseExcel(buffer: Buffer): { invoices: ParsedPurchaseInvoice[]; errors: string[] } {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const rawRows = extractRowsWithHeaders(wb, ["no faktur", "vendor", "kode item", "nama item"]);

  const invoiceMap = new Map<string, ParsedPurchaseInvoice>();
  const invoiceItemCounter = new Map<string, number>();
  const errors: string[] = [];

  rawRows.forEach((r, idx) => {
    const noFaktur = String(getField(r, "No Faktur", "No. Faktur", "No_Faktur", "NoFaktur", "Faktur") || "").trim();
    const vendor = String(getField(r, "Vendor", "Supplier", "Pemasok", "Nama Vendor") || "").trim();
    const itemCode = String(getField(r, "Kode Item", "Kode", "Kode_Item", "KodeItem", "SKU") || "").trim();
    const itemName = String(getField(r, "Nama Item", "Nama", "Nama_Item", "NamaItem", "Item") || "").trim();

    // Skip empty filler rows
    if (!noFaktur && !vendor && !itemCode && !itemName) {
      return;
    }

    if (!noFaktur || !vendor) {
      if (itemCode || itemName) {
        errors.push(`Baris ${idx + 2}: Kolom No Faktur atau Vendor tidak terisi (${itemName || itemCode})`);
      }
      return;
    }

    const rawTanggal = getField(r, "Tanggal", "Tgl", "Date", "Tgl Faktur");
    const tanggal = parseCleanDate(rawTanggal);
    const cabang = String(getField(r, "Cabang", "Gudang", "Outlet", "Branch") || "CABANG PADASUKA").trim();
    const mataUang = String(getField(r, "Mata Uang", "Currency") || "Rupiah").trim();
    const subtotal = parseCleanNumber(getField(r, "Subtotal", "Sub Total"), 0);
    const pajak = parseCleanNumber(getField(r, "Pajak", "PPN", "Tax"), 0);
    const diskon = parseCleanNumber(getField(r, "Diskon", "Disc"), 0);
    const lainLain = parseCleanNumber(getField(r, "Lain Lain", "Biaya Lain", "Ongkir"), 0);
    const total = parseCleanNumber(getField(r, "Total", "Grand Total"), subtotal + pajak - diskon + lainLain);
    const fakturRef = String(getField(r, "Faktur Ref", "No Ref", "Ref") || "").trim() || undefined;

    const invItemKey = `${noFaktur}_${itemCode}`;
    const itemSeq = (invoiceItemCounter.get(invItemKey) || 0) + 1;
    invoiceItemCounter.set(invItemKey, itemSeq);

    const explicitDetail = getField(r, "No Detail", "No. Detail", "No");
    const noDetail = explicitDetail !== undefined ? parseCleanNumber(explicitDetail, itemSeq) : itemSeq;

    const qty = parseCleanNumber(getField(r, "Qty", "qty", "Jumlah", "Kuantitas"), 1);
    const satuan = String(getField(r, "Satuan", "unit", "Satuan Dasar") || "PCS").trim();
    const disc = String(getField(r, "Disc", "Diskon Item") || "").trim() || undefined;
    const tax = String(getField(r, "Tax", "Pajak Item") || "").trim() || undefined;
    const harga = parseCleanNumber(getField(r, "Harga", "Harga Beli", "Price"), 0);
    const subtotalItem = parseCleanNumber(getField(r, "Subtotal Item", "Subtotal_Item", "Total Item"), qty * harga);

    // 1. Deterministic rowHash
    const rowHash = hashString(`${noFaktur}_${itemCode}_${noDetail}_${qty}_${harga}`);
    // 2. Legacy rowHash for backward compatibility
    const legacyHash = hashString(`${noFaktur}_${itemCode}_${parseCleanNumber(explicitDetail, idx + 1)}_${qty}_${harga}_${idx}`);

    if (!invoiceMap.has(noFaktur)) {
      invoiceMap.set(noFaktur, {
        mataUang,
        noFaktur,
        tanggal,
        fakturRef,
        cabang,
        vendor,
        subtotal,
        pajak,
        diskon,
        lainLain,
        total,
        items: [],
      });
    }

    const invoice = invoiceMap.get(noFaktur)!;
    if (itemCode || itemName) {
      invoice.items.push({
        noDetail,
        itemCode: itemCode || "NO_CODE",
        itemName: itemName || itemCode,
        qty,
        satuan,
        disc,
        tax,
        harga,
        subtotalItem,
        rowHash,
        legacyHash,
      });
    }
  });

  return { invoices: Array.from(invoiceMap.values()), errors };
}
