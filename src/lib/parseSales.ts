import * as xlsx from "xlsx";
import { hashString } from "./password.js";
import { parseCleanNumber, parseCleanDate, getField, extractRowsWithHeaders } from "./excelUtils.js";

export interface ParsedSaleRow {
  noTransaksi: string;
  tanggal: Date;
  jamBuat: string;
  cabang: string;
  customer: string;
  kodeItem: string;
  namaItem: string;
  itemGroup: string;
  qty: number;
  unit: string;
  hargaJual: number;
  diskon: number;
  subtotal: number;
  hpp: number;
  labaRugi: number;
  pegawai: string;
  rowHash: string;
}

export function parseSalesExcel(buffer: Buffer): { rows: ParsedSaleRow[]; errors: string[] } {
  const wb = xlsx.read(buffer, { type: "buffer" });
  const rawRows = extractRowsWithHeaders(wb, ["no transaksi", "kode item", "subtotal", "nama item"]);

  const rows: ParsedSaleRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((r, idx) => {
    const noTransaksi = String(getField(r, "No Transaksi", "No. Transaksi", "No_Transaksi", "NoTransaksi", "Transaksi") || "").trim();
    const kodeItem = String(getField(r, "Kode Item", "Kode", "Kode_Item", "KodeItem", "SKU") || "").trim();
    const namaItem = String(getField(r, "Nama Item", "Nama", "Nama_Item", "NamaItem", "Item") || "").trim();

    // Skip empty filler rows
    if (!noTransaksi && !kodeItem && !namaItem) {
      return;
    }

    if (!noTransaksi || !kodeItem) {
      if (namaItem) {
        errors.push(`Baris ${idx + 2}: Kolom No Transaksi atau Kode Item tidak terisi (${namaItem})`);
      }
      return;
    }

    const rawTanggal = getField(r, "Tanggal", "Tgl", "Date", "Tgl Transaksi");
    const tanggal = parseCleanDate(rawTanggal);

    const jamBuat = String(getField(r, "Jam Buat", "Jam", "Waktu", "Time") || "00:00:00").trim();
    const cabang = String(getField(r, "Cabang", "Outlet", "Store", "Branch") || "CABANG PADASUKA").trim();
    const customer = String(getField(r, "Customer", "Pelanggan", "Cust") || "CASH").trim();
    const itemGroup = String(getField(r, "Item Group", "ItemGroup", "Kategori", "Grup", "Kategori / Grup") || "").trim();

    const qty = parseCleanNumber(getField(r, "qty", "Qty", "Jumlah", "Kuantitas"), 1);
    const unit = String(getField(r, "unit", "Satuan", "Unit") || "PCS").trim();
    const hargaJual = parseCleanNumber(getField(r, "Harga Jual", "Harga", "Price", "Harga_Jual"), 0);
    const diskon = parseCleanNumber(getField(r, "Diskon", "Disc", "Discount"), 0);
    const subtotal = parseCleanNumber(getField(r, "Subtotal", "Total", "Omzet", "Nilai"), qty * hargaJual - diskon);
    const hpp = parseCleanNumber(getField(r, "HPP", "Harga Pokok", "Modal"), 0);
    const labaRugi = parseCleanNumber(getField(r, "Laba Rugi", "Laba", "Profit", "Margin"), subtotal - hpp);
    const pegawai = String(getField(r, "Pegawai", "Kasir", "Sales", "Karyawan", "Staff") || "Tidak Diketahui").trim();

    // Unique rowHash to deduplicate records accurately
    const hashData = `${noTransaksi}_${tanggal.toISOString().split("T")[0]}_${jamBuat}_${cabang}_${kodeItem}_${qty}_${subtotal}_${idx}`;
    const rowHash = hashString(hashData);

    rows.push({
      noTransaksi,
      tanggal,
      jamBuat,
      cabang,
      customer,
      kodeItem,
      namaItem,
      itemGroup,
      qty,
      unit,
      hargaJual,
      diskon,
      subtotal,
      hpp,
      labaRugi,
      pegawai,
      rowHash,
    });
  });

  return { rows, errors };
}
