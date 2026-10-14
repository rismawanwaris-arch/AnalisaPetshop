import * as xlsx from "xlsx";
import { excelDateToDate } from "./parseMasterItems.js";
import { hashString } from "./password.js";

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
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const invoiceMap = new Map<string, ParsedPurchaseInvoice>();
  const errors: string[] = [];

  rawRows.forEach((r, idx) => {
    const noFaktur = String(r["No Faktur"] || r["No. Faktur"] || "").trim();
    const vendor = String(r["Vendor"] || r["Supplier"] || "").trim();
    const itemCode = String(r["Kode Item"] || r["Kode"] || "").trim();
    const itemName = String(r["Nama Item"] || r["Nama"] || "").trim();

    if (!noFaktur || !vendor) {
      if (itemCode) errors.push(`Baris ${idx + 2}: Kolom No Faktur atau Vendor kosong`);
      return;
    }

    const rawTanggal = r["Tanggal"];
    const tanggal = excelDateToDate(rawTanggal);
    const cabang = String(r["Cabang"] || "GUDANG PADASUKA").trim();
    const mataUang = String(r["Mata Uang"] || "Rupiah").trim();
    const subtotal = parseFloat(r["Subtotal"] || 0);
    const pajak = parseFloat(r["Pajak"] || 0);
    const diskon = parseFloat(r["Diskon"] || 0);
    const lainLain = parseFloat(r["Lain Lain"] || 0);
    const total = parseFloat(r["Total"] || 0);
    const fakturRef = String(r["Faktur Ref"] || "").trim() || undefined;

    const noDetail = parseInt(r["No Detail"]) || undefined;
    const qty = parseFloat(r["Qty"] || 1);
    const satuan = String(r["Satuan"] || "PCS").trim();
    const disc = String(r["Disc"] || "").trim() || undefined;
    const tax = String(r["Tax"] || "").trim() || undefined;
    const harga = parseFloat(r["Harga"] || 0);
    const subtotalItem = parseFloat(r["Subtotal Item"] || qty * harga);

    const rowHash = hashString(`${noFaktur}_${itemCode}_${noDetail}_${qty}_${harga}_${idx}`);

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
        itemCode,
        itemName,
        qty,
        satuan,
        disc,
        tax,
        harga,
        subtotalItem,
        rowHash,
      });
    }
  });

  return { invoices: Array.from(invoiceMap.values()), errors };
}
