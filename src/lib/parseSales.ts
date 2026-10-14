import * as xlsx from "xlsx";
import { excelDateToDate } from "./parseMasterItems.js";
import { hashString } from "./password.js";

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
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = xlsx.utils.sheet_to_json(sheet, { defval: "" });

  const rows: ParsedSaleRow[] = [];
  const errors: string[] = [];

  rawRows.forEach((r, idx) => {
    const noTransaksi = String(r["No Transaksi"] || r["No. Transaksi"] || "").trim();
    const kodeItem = String(r["Kode Item"] || r["Kode"] || "").trim();
    const namaItem = String(r["Nama Item"] || r["Nama"] || "").trim();

    if (!noTransaksi || !kodeItem) {
      if (namaItem) {
        errors.push(`Baris ${idx + 2}: Kolom No Transaksi atau Kode Item kosong`);
      }
      return;
    }

    const rawTanggal = r["Tanggal"];
    const tanggal = excelDateToDate(rawTanggal);
    const jamBuat = String(r["Jam Buat"] || "00:00:00").trim();
    const cabang = String(r["Cabang"] || "CABANG PADASUKA").trim();
    const customer = String(r["Customer"] || "CASH").trim();
    const itemGroup = String(r["Item Group"] || "").trim();
    const qty = parseFloat(r["qty"] || r["Qty"] || 1);
    const unit = String(r["unit"] || r["Satuan"] || "PCS").trim();
    const hargaJual = parseFloat(r["Harga Jual"] || 0);
    const diskon = parseFloat(r["Diskon"] || 0);
    const subtotal = parseFloat(r["Subtotal"] || 0);
    const hpp = parseFloat(r["HPP"] || 0);
    const labaRugi = parseFloat(r["Laba Rugi"] || 0);
    const pegawai = String(r["Pegawai"] || "Tidak Diketahui").trim();

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
