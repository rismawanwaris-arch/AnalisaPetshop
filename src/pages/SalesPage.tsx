import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Search } from "lucide-react";
import { formatRupiah, formatNumber, formatDate } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const SalesPage: React.FC = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  const { data, isLoading } = useQuery({
    queryKey: ["sales", page, search, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.append("search", search);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data penjualan");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            Daftar Transaksi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar rinci seluruh baris transaksi penjualan POS kasir
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            onPreset={setPreset}
          />
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
              className="text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat transaksi...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">No. Transaksi</th>
                    <th className="py-3 px-4">Waktu</th>
                    <th className="py-3 px-4">Lokasi</th>
                    <th className="py-3 px-4">Nama Barang</th>
                    <th className="py-3 px-4 text-right">Qty</th>
                    <th className="py-3 px-4 text-right">Harga Jual</th>
                    <th className="py-3 px-4 text-right">Subtotal</th>
                    <th className="py-3 px-4 text-right">Laba</th>
                    <th className="py-3 px-4">Kasir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.rows?.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-800">
                        {s.noTransaksi}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(s.tanggal)} <span className="text-[10px] text-slate-400 block">{s.jamBuat}</span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-700 font-medium">
                        {s.outlet?.name}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-800 block">{s.item?.name}</span>
                        <span className="text-[10px] text-slate-400">{s.item?.code} • {s.item?.itemGroup}</span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                        {s.qty} {s.unit}
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">
                        {formatRupiah(s.hargaJual)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                        {formatRupiah(s.subtotal)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold text-emerald-600">
                        {formatRupiah(s.labaRugi)}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                        {s.employee?.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Total {formatNumber(data?.total)} baris transaksi (Halaman {data?.page} dari {data?.totalPages || 1})
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= (data?.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50"
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
