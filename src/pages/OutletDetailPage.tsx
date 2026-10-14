import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Store,
  TrendingUp,
  Package,
  Receipt,
  Users,
  Search,
  DollarSign,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatRupiah, formatNumber, formatDate } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";

export const OutletDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  const [searchItem, setSearchItem] = useState("");
  const [sortField, setSortField] = useState<"omzet" | "qty" | "laba">("omzet");
  const [sortAsc, setSortAsc] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["outlet-detail", id, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/outlets/${id}?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil detail performa outlet");
      return res.json();
    },
    enabled: !!id,
  });

  const { outlet, summary, trends = [], items = [], employees = [] } = data || {};

  // Filter & Sort items on client side for fast interactivity
  const filteredItems = items
    .filter((it: any) => {
      if (!searchItem.trim()) return true;
      const q = searchItem.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
      );
    })
    .sort((a: any, b: any) => {
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
    <div className="space-y-6 pb-12">
      {/* Top Header & Navigation */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <Link to="/outlets" className="hover:text-emerald-600 transition-colors">
                Cabang / Performa Outlet
              </Link>
              <span>/</span>
              <span className="text-slate-800 font-bold">{outlet?.name || `Outlet #${id}`}</span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={() => navigate("/outlets")}
                className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
                title="Kembali ke Matrix Outlet"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Store className="w-5 h-5 text-emerald-600" />
                  {outlet?.name || "Memuat Outlet..."}
                </h2>
                <p className="text-xs text-slate-500">
                  Rincian barang terjual, tren penjualan harian, dan kontribusi kasir pada outlet ini.
                </p>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-end gap-2 text-xs">
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
            <div className="flex items-center gap-1 pb-0.5">
              <button
                type="button"
                onClick={() => setPreset("today")}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setPreset("last7")}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
              >
                Minggu Ini
              </button>
              <button
                type="button"
                onClick={() => setPreset("last30")}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setPreset("all")}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-800 cursor-pointer"
              >
                Semua
              </button>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
          Memuat rincian performa dan daftar barang terjual...
        </div>
      ) : (
        <>
          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Omzet</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900">
                {formatRupiah(summary?.totalOmzet)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Periode {fromDate} s/d {toDate}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Laba Bersih</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-black text-emerald-600">
                {formatRupiah(summary?.totalLaba)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Margin:{" "}
                <strong className="text-emerald-700">
                  {summary?.totalOmzet ? ((summary.totalLaba / summary.totalOmzet) * 100).toFixed(1) : 0}%
                </strong>
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Qty Barang Terjual</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900">
                {formatNumber(summary?.totalQty)} <span className="text-sm font-semibold text-slate-400">pcs</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {items.length} jenis produk berbeda terjual
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Transaksi</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2.5 text-2xl font-black text-slate-900">
                {formatNumber(summary?.totalTransaksi)} <span className="text-sm font-semibold text-slate-400">struk</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Dilayani oleh {employees.length} kasir/staff
              </span>
            </div>
          </div>

          {/* Daily Trend Chart for this Outlet */}
          {trends.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Grafik Fluktuasi Harian — {outlet?.name}
                  </h3>
                  <p className="text-xs text-slate-500">Tren omzet dan laba bersih per hari</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Omzet
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Laba
                  </span>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="outletOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="outletLaba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="tanggal" tickFormatter={(v) => formatDate(v)} fontSize={11} stroke="#94a3b8" />
                    <YAxis
                      tickFormatter={(v) => {
                        if (Math.abs(v) >= 1000000) return `${(v / 1000000).toFixed(1)}jt`;
                        if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(0)}rb`;
                        return v;
                      }}
                      fontSize={11}
                      stroke="#94a3b8"
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatRupiah(val),
                        name === "omzet" ? "Total Omzet" : "Total Laba",
                      ]}
                      labelFormatter={(l) => formatDate(l)}
                      contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }}
                    />
                    <Area type="monotone" dataKey="omzet" stroke="#3b82f6" fillOpacity={1} fill="url(#outletOmzet)" strokeWidth={2.5} />
                    <Area type="monotone" dataKey="laba" stroke="#10b981" fillOpacity={1} fill="url(#outletLaba)" strokeWidth={2.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Grid: Tabel Rincian Barang Terjual & Kontribusi Karyawan */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Tabel Rincian Barang Terjual (8 cols) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Rincian Barang yang Terjual di {outlet?.name}
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Menampilkan {filteredItems.length} dari {items.length} SKU terjual
                  </span>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama / kode SKU barang..."
                    value={searchItem}
                    onChange={(e) => setSearchItem(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-60"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-bold uppercase text-[11px] tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-3 text-center w-10">#</th>
                      <th className="py-3 px-3">Kode SKU</th>
                      <th className="py-3 px-4">Nama Item</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th
                        className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort("qty")}
                      >
                        Qty Terjual {sortField === "qty" && (sortAsc ? "▲" : "▼")}
                      </th>
                      <th
                        className="py-3 px-4 text-right bg-blue-50/60 text-blue-900 cursor-pointer hover:bg-blue-100/60 font-black"
                        onClick={() => handleSort("omzet")}
                      >
                        Total Omzet {sortField === "omzet" && (sortAsc ? "▲" : "▼")}
                      </th>
                      <th
                        className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100"
                        onClick={() => handleSort("laba")}
                      >
                        Total Laba {sortField === "laba" && (sortAsc ? "▲" : "▼")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          Tidak ada barang yang cocok dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((it: any, index: number) => (
                        <tr key={it.itemId} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-center font-bold text-slate-400">
                            {index + 1}
                          </td>
                          <td className="py-3 px-3 font-mono font-semibold text-slate-500 whitespace-nowrap">
                            {it.code}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {it.name}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                              {it.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold text-slate-700 whitespace-nowrap">
                            {formatNumber(it.qty)} pcs
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900 bg-blue-50/20 whitespace-nowrap">
                            {formatRupiah(it.omzet)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-700 whitespace-nowrap">
                            {formatRupiah(it.laba)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Kontribusi Karyawan Penjual di Outlet Ini (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden h-fit">
              <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Karyawan Penjual
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-medium">{employees.length} kasir</span>
              </div>

              <div className="divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada data kasir aktif.
                  </div>
                ) : (
                  employees.map((emp: any, idx: number) => (
                    <div key={emp.employeeId} className="p-4 hover:bg-slate-50/80 transition-colors flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{emp.name}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 pl-7">
                          {formatNumber(emp.transaksi)} struk • {formatNumber(emp.qty)} pcs
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-black text-slate-900 text-xs block">
                          {formatRupiah(emp.omzet)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          Laba: {formatRupiah(emp.laba)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
