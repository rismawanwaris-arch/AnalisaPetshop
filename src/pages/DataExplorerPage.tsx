import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Database, FileText, ChevronRight } from "lucide-react";
import { formatRupiah, formatNumber, formatDate } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const DataExplorerPage: React.FC = () => {
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["data-explorer", page, search, typeFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.append("search", search);
      if (typeFilter) params.append("type", typeFilter);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/data-explorer?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data explorer");
      return res.json();
    },
  });

  const { rows, total, totalPages, summary } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-emerald-600" />
            Analisa Data
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit mendalam baris mentah penjualan dan retur dari file import POS
          </p>
        </div>

        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onFromChange={setFromDate}
          onToChange={setToDate}
          onPreset={setPreset}
        />
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Baris Data</span>
          <span className="text-lg font-black text-slate-900 mt-1 block">{formatNumber(total)} Baris</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Nilai Subtotal</span>
          <span className="text-lg font-black text-slate-900 mt-1 block">{formatRupiah(summary?.totalOmzet)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Laba Rugi</span>
          <span className="text-lg font-black text-emerald-600 mt-1 block">{formatRupiah(summary?.totalLaba)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-rata Nilai Trx</span>
          <span className="text-lg font-black text-blue-600 mt-1 block">{formatRupiah(summary?.avgOmzet)}</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 font-semibold"
          >
            <option value="">Semua Jenis Transaksi</option>
            <option value="SALE">Penjualan Normal</option>
            <option value="RETUR">Retur Penjualan</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari transaksi, item, kasir..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Mengeksplorasi data...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Tanggal & Jam</th>
                    <th className="py-3 px-4">No. Transaksi</th>
                    <th className="py-3 px-4">Outlet</th>
                    <th className="py-3 px-4">Produk</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Nilai Transaksi</th>
                    <th className="py-3 px-4 text-right">Laba</th>
                    <th className="py-3 px-4">Kasir</th>
                    <th className="py-3 px-3 text-center">Tipe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows?.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(r.tanggal)} <span className="text-[10px] text-slate-400 block">{r.jamBuat}</span>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{r.noTransaksi}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-700">{r.outlet?.name}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-bold text-slate-800 block">{r.item?.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{r.item?.code}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700">{r.qty}</td>
                      <td className="py-2.5 px-4 text-right font-black text-slate-900">{formatRupiah(r.subtotal)}</td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-600">{formatRupiah(r.labaRugi)}</td>
                      <td className="py-2.5 px-4 text-slate-600">{r.employee?.name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.isRetur ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {r.isRetur ? "RETUR" : "SALE"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Halaman {page} dari {totalPages || 1} ({formatNumber(total)} total data)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= (totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
