import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Store, Search, Calendar, ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";

export const OutletsPage: React.FC = () => {
  const navigate = useNavigate();
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  // Filters from screenshot
  const [searchOutlet, setSearchOutlet] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [keywordItem, setKeywordItem] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [omzetMin, setOmzetMin] = useState("");
  const [omzetMax, setOmzetMax] = useState("");

  // Sort State
  const [sortField, setSortField] = useState<"omzet" | "qty" | "laba" | "trx">("omzet");
  const [sortAsc, setSortAsc] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [
      "outlets-performance",
      fromDate,
      toDate,
      searchOutlet,
      filterItem,
      selectedCategory,
      keywordItem,
      selectedEmployeeId,
      omzetMin,
      omzetMax,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (searchOutlet) params.append("searchOutlet", searchOutlet);
      if (filterItem) params.append("searchItem", filterItem);
      if (selectedCategory) params.append("category", selectedCategory);
      if (keywordItem) params.append("keyword", keywordItem);
      if (selectedEmployeeId) params.append("employeeId", selectedEmployeeId);
      if (omzetMin) params.append("omzetMin", omzetMin);
      if (omzetMax) params.append("omzetMax", omzetMax);

      const res = await fetch(`/api/outlets?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil performa outlet");
      return res.json();
    },
  });

  const { outlets = [], totalOutlets = 0, categories = [], employees = [] } = data || {};

  // Client sort toggle
  const sortedOutlets = [...outlets].sort((a: any, b: any) => {
    let valA = a.totalOmzet;
    let valB = b.totalOmzet;
    if (sortField === "qty") {
      valA = a.totalQty;
      valB = b.totalQty;
    } else if (sortField === "laba") {
      valA = a.totalLaba;
      valB = b.totalLaba;
    } else if (sortField === "trx") {
      valA = a.totalTransaksi;
      valB = b.totalTransaksi;
    }
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleSort = (field: "omzet" | "qty" | "laba" | "trx") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const totals = sortedOutlets.reduce(
    (acc: any, o: any) => ({
      qty: acc.qty + (Number(o.totalQty) || 0),
      omzet: acc.omzet + (Number(o.totalOmzet) || 0),
      laba: acc.laba + (Number(o.totalLaba) || 0),
      trx: acc.trx + (Number(o.totalTransaksi) || 0),
    }),
    { qty: 0, omzet: 0, laba: 0, trx: 0 }
  );

  return (
    <div className="space-y-5">
      {/* Header & Breadcrumb matching screenshot */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <span>Cabang</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">Performa Outlet</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Performa Penjualan Outlet
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Matriks komparasi performa omzet, profit, dan volume penjualan per cabang outlet.
          </p>
        </div>

        {/* Filter Section matching screenshot exactly */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          {/* Row 1: Tanggal Mulai, Tanggal Selesai, Presets */}
          <div className="flex flex-wrap items-end gap-3 text-xs">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                type="button"
                onClick={() => setPreset("today")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPreset("last7")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => setPreset("last30")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPreset("all")}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-800 transition-colors shadow-2xs cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>

          {/* Row 2: Cari Outlet, Filter Item, Kategori, Merk/Kata Kunci, Karyawan, Omzet Min, Omzet Max */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 text-xs pt-1">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Cari Outlet
              </label>
              <input
                type="text"
                placeholder="Nama outlet..."
                value={searchOutlet}
                onChange={(e) => setSearchOutlet(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Filter Item
              </label>
              <input
                type="text"
                placeholder="Ketik nama atau kode item..."
                value={filterItem}
                onChange={(e) => setFilterItem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Kategori
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Semua kategori</option>
                {categories.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Merk / Kata Kunci Item
              </label>
              <input
                type="text"
                placeholder="cth: bolt / excel"
                value={keywordItem}
                onChange={(e) => setKeywordItem(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Karyawan
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Semua karyawan</option>
                {employees.map((emp: any) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Omzet Min (Rp)
              </label>
              <input
                type="number"
                placeholder="0"
                value={omzetMin}
                onChange={(e) => setOmzetMin(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Omzet Max (Rp)
              </label>
              <input
                type="number"
                placeholder="tak terbatas"
                value={omzetMax}
                onChange={(e) => setOmzetMax(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Subheader info text */}
      <div className="px-1 text-xs font-semibold text-slate-500">
        Menampilkan {totalOutlets} outlet • {fromDate} s/d {toDate}
      </div>

      {/* Main MATRIX OUTLET Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table topbar */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Matrix Outlet
          </h3>
          <span className="text-xs text-slate-400 font-medium">{sortedOutlets.length} baris</span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">Memuat matriks performa outlet...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Outlet</th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("qty")}
                  >
                    Qty Terjual {sortField === "qty" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="py-3 px-4 text-right bg-blue-50/60 text-blue-900 cursor-pointer hover:bg-blue-100/60 transition-colors font-black"
                    onClick={() => handleSort("omzet")}
                  >
                    Total Omzet {sortField === "omzet" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("laba")}
                  >
                    Total Laba {sortField === "laba" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort("trx")}
                  >
                    Jumlah Transaksi {sortField === "trx" && (sortAsc ? "▲" : "▼")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedOutlets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Tidak ada data outlet yang sesuai dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  sortedOutlets.map((o: any) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/outlets/${o.id}`)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                      title={`Klik untuk melihat rincian barang terjual di ${o.name}`}
                    >
                      {/* Outlet Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 group-hover:text-blue-600 text-xs flex items-center gap-2">
                        <span>{o.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-500 transition-transform group-hover:translate-x-0.5" />
                      </td>

                      {/* Qty Terjual */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatNumber(o.totalQty)} pcs
                      </td>

                      {/* Total Omzet (Highlighted blue column like in screenshot) */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 bg-blue-50/20 whitespace-nowrap text-sm">
                        {formatRupiah(o.totalOmzet)}
                      </td>

                      {/* Total Laba */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                        {formatRupiah(o.totalLaba)}
                      </td>

                      {/* Jumlah Transaksi */}
                      <td className="py-3.5 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                        {formatNumber(o.totalTransaksi)} struk
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {sortedOutlets.length > 0 && (
                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td className="py-3 px-4 text-slate-800">
                      TOTAL ({sortedOutlets.length} Outlet)
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 whitespace-nowrap">
                      {formatNumber(totals.qty)} pcs
                    </td>
                    <td className="py-3 px-4 text-right font-black text-blue-950 bg-blue-100/60 whitespace-nowrap text-sm">
                      {formatRupiah(totals.omzet)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                      {formatRupiah(totals.laba)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-700 whitespace-nowrap">
                      {formatNumber(totals.trx)} struk
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
