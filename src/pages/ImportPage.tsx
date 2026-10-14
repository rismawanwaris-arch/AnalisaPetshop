import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, History, Trash2, Info, Loader2 } from "lucide-react";
import { formatNumber, formatDateTime } from "../lib/format.js";

export const ImportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [purchaseFile, setPurchaseFile] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Import Batches History with auto-refresh when processing
  const { data: batches, isLoading } = useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const res = await fetch("/api/imports");
      if (!res.ok) throw new Error("Gagal mengambil riwayat import");
      return res.json();
    },
    refetchInterval: (query) => {
      const list = query.state.data;
      if (Array.isArray(list) && list.some((b: any) => b.status === "PROCESSING")) {
        return 2000;
      }
      return false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ endpoint, file }: { endpoint: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/imports/${endpoint}`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah file");
      return { ...data, endpoint };
    },
    onSuccess: (data) => {
      let msg = "File berhasil di-upload dan diproses!";
      if (data.endpoint === "sales") {
        msg = `Sukses! Berhasil memproses ${data.rowCount} baris data (${data.insertedCount} baris baru masuk, ${data.duplicateCount} duplikat diabaikan).`;
      } else if (data.endpoint === "purchases") {
        msg = `Sukses! Berhasil memproses ${data.invoicesCount} faktur pembelian (${data.insertedInvoices} faktur baru, ${data.updatedInvoices} diperbarui).`;
      } else if (data.endpoint === "master-items") {
        msg = `Sukses! Berhasil memperbarui ${data.count} data barang master ke dalam katalog.`;
      }
      setStatusMsg({ type: "success", text: msg });

      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["master-items"] });
      queryClient.invalidateQueries({ queryKey: ["items"] });
      setSalesFile(null);
      setPurchaseFile(null);
      setMasterFile(null);
    },
    onError: (err: any) => {
      setStatusMsg({ type: "error", text: err.message || "Gagal memproses file Excel" });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/imports/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus batch");
      return data;
    },
    onSuccess: () => {
      setStatusMsg({ type: "success", text: "Batch import berhasil dihapus!" });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (err: any) => {
      setStatusMsg({ type: "error", text: err.message || "Gagal menghapus batch" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-600" />
          Pusat Upload & Sinkronisasi Excel
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Unggah file Excel POS penjualan, faktur pembelian vendor, atau katalog master barang. Sistem otomatis mengenali format tanggal dan angka secara cerdas.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMsg.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{statusMsg.text}</span>
          </div>
          <button
            onClick={() => setStatusMsg(null)}
            className="text-[11px] font-bold underline cursor-pointer hover:opacity-80"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 3 Upload Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Penjualan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Data Penjualan</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Export POS penjualan toko. Kolom utama: <span className="font-semibold text-slate-700">No Transaksi, Tanggal, Kode Item, Qty, Subtotal, Laba Rugi</span>.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>
          </div>
          <button
            disabled={!salesFile || uploadMutation.isPending}
            onClick={() => salesFile && uploadMutation.mutate({ endpoint: "sales", file: salesFile })}
            className="mt-5 w-full py-2.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses Data...</span>
              </>
            ) : (
              <span>Proses Data Penjualan</span>
            )}
          </button>
        </div>

        {/* Upload Pembelian */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 border border-blue-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Faktur Pembelian</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Faktur nota pembelian suplier. Kolom utama: <span className="font-semibold text-slate-700">No Faktur, Tanggal, Vendor, Kode Item, Qty, Total</span>.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setPurchaseFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>
          </div>
          <button
            disabled={!purchaseFile || uploadMutation.isPending}
            onClick={() => purchaseFile && uploadMutation.mutate({ endpoint: "purchases", file: purchaseFile })}
            className="mt-5 w-full py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses Data...</span>
              </>
            ) : (
              <span>Proses Data Pembelian</span>
            )}
          </button>
        </div>

        {/* Upload Master Item */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 border border-purple-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Master Item</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Katalog barang & harga. Kolom utama: <span className="font-semibold text-slate-700">Kode Item, Nama Item, Barcode, Kategori, Harga Retail, HPP</span>.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setMasterFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>
          </div>
          <button
            disabled={!masterFile || uploadMutation.isPending}
            onClick={() => masterFile && uploadMutation.mutate({ endpoint: "master-items", file: masterFile })}
            className="mt-5 w-full py-2.5 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses Data...</span>
              </>
            ) : (
              <span>Update Master Item</span>
            )}
          </button>
        </div>
      </div>

      {/* History of Import Batches */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-slate-400" />
            Riwayat Batch Import
          </h3>
          <span className="text-xs text-slate-400">{batches?.length || 0} Batch Terakhir</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 font-bold">Waktu Upload</th>
                <th className="py-2.5 px-4 font-bold">Nama File</th>
                <th className="py-2.5 px-4 font-bold">Jenis Data</th>
                <th className="py-2.5 px-4 text-right font-bold">Total Baris</th>
                <th className="py-2.5 px-4 text-right font-bold">Data Masuk</th>
                <th className="py-2.5 px-4 text-center font-bold">Status</th>
                <th className="py-2.5 px-4 text-center font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches?.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(b.uploadedAt)}</td>
                  <td className="py-2.5 px-4 font-medium text-slate-800">{b.filename}</td>
                  <td className="py-2.5 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {b.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right text-slate-600">{formatNumber(b.rowCount)}</td>
                  <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">{formatNumber(b.insertedCount)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        b.status === "DONE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : b.status === "FAILED"
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
                      }`}
                    >
                      {b.status === "PROCESSING" && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                      <span>{b.status === "PROCESSING" ? "Memproses..." : b.status}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      title="Hapus batch ini beserta transaksi terkait"
                      onClick={() => {
                        if (confirm(`Hapus batch "${b.filename}"? Seluruh data penjualan/pembelian terkait batch ini akan dihapus.`)) {
                          deleteBatchMutation.mutate(b.id);
                        }
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {(!batches || batches.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    Belum ada riwayat batch import file.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
