import React from "react";
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
} from "lucide-react";

export interface PreviewData {
  type: "SALES" | "PURCHASES" | "MASTER_ITEMS";
  filename: string;
  fileSize?: number;
  totalRows: number;
  totalItems?: number;
  newCount: number;
  duplicateCount: number;
  uniqueTransactions?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  sampleRows: any[];
  errors?: string[];
}

interface ImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: PreviewData | null;
  isLoadingConfirm: boolean;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  previewData,
  isLoadingConfirm,
}) => {
  if (!isOpen || !previewData) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatNumber = (num?: number) => {
    return (num || 0).toLocaleString("id-ID");
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const isAllDuplicate = previewData.newCount === 0 && previewData.duplicateCount > 0;
  const hasMixed = previewData.newCount > 0 && previewData.duplicateCount > 0;
  const isAllNew = previewData.duplicateCount === 0;

  const typeLabels = {
    SALES: { title: "Data Penjualan POS", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    PURCHASES: { title: "Faktur Pembelian Vendor", color: "text-blue-700 bg-blue-50 border-blue-200" },
    MASTER_ITEMS: { title: "Katalog Master Barang", color: "text-purple-700 bg-purple-50 border-purple-200" },
  };

  const currentType = typeLabels[previewData.type] || typeLabels.SALES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  Pratinjau & Verifikasi Proteksi Data
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentType.color}`}>
                  {currentType.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 truncate max-w-md sm:max-w-lg">
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-semibold text-slate-700">{previewData.filename}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoadingConfirm}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 block">Total Data File</span>
              <span className="text-base sm:text-lg font-bold text-slate-800 mt-0.5 block">
                {formatNumber(previewData.totalRows)}
                <span className="text-xs font-normal text-slate-400 ml-1">
                  {previewData.type === "PURCHASES" ? "faktur" : "baris"}
                </span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Data Baru
              </span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-800 mt-0.5 block">
                {formatNumber(previewData.newCount)}
                <span className="text-xs font-normal text-emerald-600/80 ml-1">siap masuk</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80">
              <span className="text-[11px] font-bold text-amber-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" /> Data Duplikat
              </span>
              <span className="text-base sm:text-lg font-extrabold text-amber-800 mt-0.5 block">
                {formatNumber(previewData.duplicateCount)}
                <span className="text-xs font-normal text-amber-600/80 ml-1">akan di-skip</span>
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Rentang Periode
              </span>
              <span className="text-xs font-bold text-slate-700 mt-1 block truncate">
                {previewData.periodStart ? `${formatDate(previewData.periodStart)} - ${formatDate(previewData.periodEnd)}` : "Semua Data"}
              </span>
            </div>
          </div>

          {/* Alert Status Banner */}
          {isAllDuplicate && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">Peringatan: Seluruh data (100%) sudah ada di sistem!</h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  Semua {formatNumber(previewData.duplicateCount)} data di file ini sudah pernah di-upload sebelumnya. 
                  Sistem proteksi akan <strong>melewati seluruh data tersebut</strong> sehingga tidak akan terjadi pencatatan transaksi ganda.
                </p>
              </div>
            </div>
          )}

          {hasMixed && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">Proteksi Duplikasi Aktif</h4>
                <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">
                  Ditemukan <strong>{formatNumber(previewData.duplicateCount)} data lama</strong> dan{" "}
                  <strong>{formatNumber(previewData.newCount)} data baru</strong>. Data lama otomatis diabaikan, dan hanya data baru yang akan dimasukkan ke database.
                </p>
              </div>
            </div>
          )}

          {isAllNew && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs">Semua Data Siap Dimasukkan (100% Baru)</h4>
                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                  Seluruh {formatNumber(previewData.newCount)} data di file ini belum pernah ada di database dan siap di-upload.
                </p>
              </div>
            </div>
          )}

          {/* Sample Rows Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Sampel Data ({previewData.sampleRows.length} baris pertama)
              </h4>
              <span className="text-[11px] text-slate-400">Pratinjau status per baris</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden overflow-x-auto max-h-60">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="py-2 px-3 font-bold text-center">Status</th>
                    {previewData.type === "SALES" && (
                      <>
                        <th className="py-2 px-3 font-bold">No Transaksi</th>
                        <th className="py-2 px-3 font-bold">Tanggal</th>
                        <th className="py-2 px-3 font-bold">Nama Item</th>
                        <th className="py-2 px-3 text-right font-bold">Qty</th>
                        <th className="py-2 px-3 text-right font-bold">Subtotal</th>
                      </>
                    )}
                    {previewData.type === "PURCHASES" && (
                      <>
                        <th className="py-2 px-3 font-bold">No Faktur</th>
                        <th className="py-2 px-3 font-bold">Tanggal</th>
                        <th className="py-2 px-3 font-bold">Vendor / Pemasok</th>
                        <th className="py-2 px-3 text-center font-bold">Item</th>
                        <th className="py-2 px-3 text-right font-bold">Grand Total</th>
                      </>
                    )}
                    {previewData.type === "MASTER_ITEMS" && (
                      <>
                        <th className="py-2 px-3 font-bold">Kode</th>
                        <th className="py-2 px-3 font-bold">Nama Barang</th>
                        <th className="py-2 px-3 font-bold">Kategori / Grup</th>
                        <th className="py-2 px-3 text-right font-bold">Harga Beli</th>
                        <th className="py-2 px-3 text-right font-bold">Harga Jual</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewData.sampleRows.map((r: any, idx: number) => (
                    <tr
                      key={idx}
                      className={r.isDuplicate ? "bg-amber-50/40 hover:bg-amber-50/70" : "hover:bg-slate-50"}
                    >
                      <td className="py-2 px-3 text-center whitespace-nowrap">
                        {r.isDuplicate ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Duplikat (Skip)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Baru
                          </span>
                        )}
                      </td>

                      {previewData.type === "SALES" && (
                        <>
                          <td className="py-2 px-3 font-medium text-slate-800">{r.noTransaksi}</td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                          <td className="py-2 px-3 text-slate-700 max-w-xs truncate" title={r.namaItem}>
                            {r.namaItem}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">{formatNumber(r.qty)}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {formatCurrency(r.subtotal)}
                          </td>
                        </>
                      )}

                      {previewData.type === "PURCHASES" && (
                        <>
                          <td className="py-2 px-3 font-medium text-slate-800">{r.noFaktur}</td>
                          <td className="py-2 px-3 text-slate-500 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                          <td className="py-2 px-3 text-slate-700">{r.vendor}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{r.itemCount}</td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {formatCurrency(r.total)}
                          </td>
                        </>
                      )}

                      {previewData.type === "MASTER_ITEMS" && (
                        <>
                          <td className="py-2 px-3 font-mono font-medium text-slate-800">{r.code}</td>
                          <td className="py-2 px-3 text-slate-700">{r.name}</td>
                          <td className="py-2 px-3 text-slate-500">{r.itemGroup || "-"}</td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {formatCurrency(r.lastPurchasePrice)}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-slate-800">
                            {formatCurrency(r.priceRetail)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoadingConfirm}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
          >
            Batal & Pilih File Lain
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoadingConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
              isAllDuplicate
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {isLoadingConfirm ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyimpan ke Database...</span>
              </>
            ) : (
              <>
                <span>
                  {isAllDuplicate
                    ? "Tetap Proses (0 Data Baru Masuk)"
                    : `Konfirmasi & Simpan (${formatNumber(previewData.newCount)} Data Baru)`}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
