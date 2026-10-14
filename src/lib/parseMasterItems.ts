import * as xlsx from "xlsx";
import { parseCleanNumber, parseCleanDate, getField, extractRowsWithHeaders } from "./excelUtils.js";

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
  const rawRows = extractRowsWithHeaders(wb, ["kode item", "nama item"]);

  const results: ParsedMasterItem[] = [];

  for (const r of rawRows) {
    const code = String(getField(r, "Kode Item", "Kode", "Kode_Item", "KodeItem", "SKU") || "").trim();
    const name = String(getField(r, "Nama Item", "Nama", "Nama_Item", "NamaItem", "Item") || "").trim();

    if (!code || !name) continue;

    const barcode = String(getField(r, "Barcode", "Bar Code", "UPC") || "").trim() || undefined;
    const itemGroup = String(getField(r, "Kategori / Grup", "Item Group", "Kategori", "Grup", "Kategori/Grup") || "").trim() || undefined;
    const unitBase = String(getField(r, "Satuan Dasar", "Satuan", "Unit") || "PCS").trim();
    const unitPurchase = String(getField(r, "Satuan Beli", "Satuan_Beli") || unitBase).trim();

    const lastPurchasePrice = parseCleanNumber(getField(r, "Harga Beli Terakhir", "Harga Beli", "Last Purchase"), 0);
    const avgHpp = parseCleanNumber(getField(r, "HPP Rata-rata", "HPP", "Modal"), lastPurchasePrice);
    const priceRetail = parseCleanNumber(getField(r, "Harga Retail (0)", "Konter Zona C (Cuan)", "Retail", "Harga Jual", "Harga Retail"), 0);
    const priceAgent = parseCleanNumber(getField(r, "Harga Agen (1)", "Agen", "Harga Agen"), 0);
    const priceOnline = parseCleanNumber(getField(r, "Harga Online (2)", "Konter Cabang", "Online"), 0);
    const priceRepack = parseCleanNumber(getField(r, "Harga Repack (3)", "Konter Zona A (Portal)", "Repack"), 0);
    const priceBranch = parseCleanNumber(getField(r, "Harga Outlet Cabang (5)", "Konter Zona B (Biasa)", "Cabang"), 0);

    const marginRetail = parseCleanNumber(
      getField(r, "Margin Retail", "Margin Zona C", "Margin"),
      priceRetail > 0 && avgHpp > 0 ? priceRetail - avgHpp : 0
    );

    const status = String(getField(r, "Status", "Status Item") || "Aktif").trim();

    results.push({
      code,
      barcode,
      name,
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
      marginRetail,
      status,
    });
  }

  return results;
}

// Keep export for backwards compatibility
export { parseCleanDate as excelDateToDate };
