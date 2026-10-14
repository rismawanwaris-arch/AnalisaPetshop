import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, History } from "lucide-react";
import { formatNumber, formatDateTime } from "../lib/format.js";

export const ImportPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [salesFile, setSalesFile] = useState<File | null>(null);
  const [purchaseFile, setPurchaseFile] = useState<File | null>(null);
  const [masterFile, setMasterFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch Import Batches History
  const { data: batches, isLoading } = useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const res = await fetch("/api/imports");
      if (!res.ok) throw new Error("Gagal mengambil riwayat import");
      return res.json();
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
      return data;
    },
    onSuccess: (data) => {
      setStatusMsg({ type: "success", text: "File berhasil di-upload dan diproses!" });
      queryClient.invalidateQueries({ queryKey: ["imports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      setSalesFile(null);
      setPurchaseFile(null);
      setMasterFile(null);
    },
    onError: (err: any) => {
      setStatusMsg({ type: "error", text: err.message || "Gagal memproses file Excel" });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Upload className="w-5 h-5 text-emerald-600" />
          Pusat Upload & Sinkronisasi Excel
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Unggah file Excel POS penjualan, faktur pembelian vendor, atau katalog master barang baru
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* 3 Upload Panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Penjualan */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Data Penjualan</h3>
            <p className="text-xs text-slate-500 mt-1">
              File laporan penjualan POS (kolom No Transaksi, Tanggal, Item, Qty, Harga Jual, Laba Rugi, Pegawai).
            </p>
            <div className="mt-4">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setSalesFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
          </div>
          <button
            disabled={!salesFile || uploadMutation.isPending}
            onClick={() => salesFile && uploadMutation.mutate({ endpoint: "sales", file: salesFile })}
            className="mt-5 w-full py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {uploadMutation.isPending ? "Memproses..." : "Proses Data Penjualan"}
          </button>
        </div>

        {/* Upload Pembelian */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Data Pembelian</h3>
            <p className="text-xs text-slate-500 mt-1">
              File faktur order supplier (kolom No Faktur, Tanggal, Vendor, Qty, Satuan, Harga, Total Nota).
            </p>
            <div className="mt-4">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setPurchaseFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
          </div>
          <button
            disabled={!purchaseFile || uploadMutation.isPending}
            onClick={() => purchaseFile && uploadMutation.mutate({ endpoint: "purchases", file: purchaseFile })}
            className="mt-5 w-full py-2 bg-blue-600 text-white font-semibold text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploadMutation.isPending ? "Memproses..." : "Proses Data Pembelian"}
          </button>
        </div>

        {/* Upload Master Item */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Upload Master Item</h3>
            <p className="text-xs text-slate-500 mt-1">
              File katalog barang & harga zona (Kode Item, Barcode, Kategori, Harga Retail, HPP Rata2).
            </p>
            <div className="mt-4">
              <input
                type="file"
                accept=".xls,.xlsx"
                onChange={(e) => setMasterFile(e.target.files?.[0] || null)}
                className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
          </div>
          <button
            disabled={!masterFile || uploadMutation.isPending}
            onClick={() => masterFile && uploadMutation.mutate({ endpoint: "master-items", file: masterFile })}
            className="mt-5 w-full py-2 bg-purple-600 text-white font-semibold text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {uploadMutation.isPending ? "Memproses..." : "Update Master Item"}
          </button>
        </div>
      </div>

      {/* History of Import Batches */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
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
                <th className="py-2.5 px-4">Waktu Upload</th>
                <th className="py-2.5 px-4">Nama File</th>
                <th className="py-2.5 px-4">Jenis Data</th>
                <th className="py-2.5 px-4 text-right">Total Baris</th>
                <th className="py-2.5 px-4 text-right">Data Masuk</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches?.map((b: any) => (
                <tr key={b.id} className="hover:bg-slate-50/80">
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
