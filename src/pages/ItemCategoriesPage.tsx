import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Layers, Calendar, Filter } from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";

export const ItemCategoriesPage: React.FC = () => {
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();
  const [filterCategory, setFilterCategory] = useState("");
  const [searchItem, setSearchItem] = useState("");
  const [sortField, setSortField] = useState<"omzet" | "qty" | "laba">("omzet");
  const [sortAsc, setSortAsc] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["categories-items", fromDate, toDate, filterCategory, searchItem],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (filterCategory) params.append("category", filterCategory);
      if (searchItem) params.append("search", searchItem);

      const res = await fetch(`/api/categories?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data kategori item");
      return res.json();
    },
  });

  const { items = [], categories = [], totalItems = 0 } = data || {};

  // Client sort toggle
  const sortedItems = [...items].sort((a: any, b: any) => {
    const valA = a[sortField];
    const valB = b[sortField];
    return sortAsc ? valA - valB : valB - valA;
  });

  const handleSort = (field: "omzet" | "qty" | "laba") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title & Breadcrumb header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1">
            <span>Master Data</span>
            <span>/</span>
            <span className="text-slate-800 font-bold">Kategori Item</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Item Terlaris per Kategori
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Performa penjualan item dikelompokkan berdasarkan kategori produk.
          </p>
        </div>

        {/* Filter Toolbar matching screenshot */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          {/* Row 1: Tanggal Mulai, Tanggal Selesai, Preset buttons */}
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

          {/* Row 2: Filter Kategori & Cari Item */}
          <div className="flex flex-wrap items-end gap-3 text-xs pt-1">
            <div className="w-64">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Filter Kategori
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">Semua Kategori ({categories.length})</option>
                {categories.map((c: string) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-72">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Cari Item
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Nama atau kode SKU..."
                  value={searchItem}
                  onChange={(e) => setSearchItem(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8.5 pr-3 py-2 text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pb-0.5">
              <button
                type="button"
                onClick={() => {
                  setFilterCategory("");
                  setSearchItem("");
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-200 transition-colors cursor-pointer"
              >
                Tampilkan Semua Item
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Item count text */}
      <div className="px-1 text-xs font-semibold text-slate-500">
        {totalItems} item
      </div>

      {/* Main Table per Kategori matching screenshot */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table header bar */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Item per Kategori
          </h3>
          <span className="text-xs text-slate-400 font-medium">{sortedItems.length} baris</span>
        </div>

        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400">Menghitung ranking item per kategori...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Nama Item</th>
                  <th className="py-3 px-4">Kode SKU</th>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Tidak ada data penjualan pada periode dan kategori yang dipilih.
                    </td>
                  </tr>
                ) : (
                  sortedItems.map((it: any) => (
                    <tr key={it.code} className="hover:bg-slate-50/80 transition-colors">
                      {/* Pill Badge Kategori */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200/60">
                          {it.mappedCategory || it.itemGroup}
                        </span>
                      </td>

                      {/* Nama Item */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {it.name}
                      </td>

                      {/* Kode SKU */}
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {it.code}
                      </td>

                      {/* Qty Terjual */}
                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatNumber(it.qty)} pcs
                      </td>

                      {/* Total Omzet (Highlighted blue column like in screenshot) */}
                      <td className="py-3 px-4 text-right font-black text-slate-900 bg-blue-50/20 whitespace-nowrap">
                        {formatRupiah(it.omzet)}
                      </td>

                      {/* Total Laba */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                        {formatRupiah(it.laba)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
