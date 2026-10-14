import * as xlsx from "xlsx";
import { hashString } from "./password.js";

export interface ParsedMasterItem {
  code: string;
  barcode?: string;
  name: string;
  itemGroup?: string;
  unitBase?: string;
  unitPurchase?: string;
  lastPurchasePrice?: number;
  avgHpp?: number;
  priceRetail?: number;
  priceAgent?: number;
  priceOnline?: number;
  priceRepack?: number;
  priceBranch?: number;
  marginRetail?: number;
  status?: string;
}

export function parseMasterItemsExcel(buffer: Buffer): ParsedMasterItem[] {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const results: ParsedMasterItem[] = [];

  for (const r of rows) {
    const code = String(r["Kode Item"] || r["Kode"] || "").trim();
    const name = String(r["Nama Item"] || r["Nama"] || "").trim();
    if (!code || !name) continue;

    results.push({
      code,
      barcode: String(r["Barcode"] || "").trim() || undefined,
      name,
      itemGroup: String(r["Kategori / Grup"] || r["Item Group"] || r["Kategori"] || "").trim() || undefined,
      unitBase: String(r["Satuan Dasar"] || "PCS").trim(),
      unitPurchase: String(r["Satuan Beli"] || "PCS").trim(),
      lastPurchasePrice: parseFloat(r["Harga Beli Terakhir"]) || 0,
      avgHpp: parseFloat(r["HPP Rata-rata"] || r["HPP"]) || 0,
      priceRetail: parseFloat(r["Harga Retail (0)"] || r["Konter Zona C (Cuan)"]) || 0,
      priceAgent: parseFloat(r["Harga Agen (1)"] || r["Agen"]) || 0,
      priceOnline: parseFloat(r["Harga Online (2)"] || r["Konter Cabang"]) || 0,
      priceRepack: parseFloat(r["Harga Repack (3)"] || r["Konter Zona A (Portal)"]) || 0,
      priceBranch: parseFloat(r["Harga Outlet Cabang (5)"] || r["Konter Zona B (Biasa)"]) || 0,
      marginRetail: parseFloat(r["Margin Retail"] || r["Margin Zona C"]) || 0,
      status: String(r["Status"] || "Aktif").trim(),
    });
  }

  return results;
}

export function excelDateToDate(excelDate: number | string): Date {
  if (typeof excelDate === "string") {
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) return parsed;
    const num = parseFloat(excelDate);
    if (!isNaN(num)) return excelDateToDate(num);
    return new Date();
  }
  // Excel base date: 1899-12-30
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  return date;
}
