import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  Store,
  ArrowUpRight,
  Filter,
  Layers,
  Sparkles,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { formatRupiah, formatNumber, formatDate } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const DashboardPage: React.FC = () => {
  const [outletFilter, setOutletFilter] = useState<string>("");
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", outletFilter, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (outletFilter) params.append("outletId", outletFilter);
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data dashboard");
      return res.json();
    },
  });

  // Query chart metrics configuration from settings
  const { data: chartConfigData } = useQuery({
    queryKey: ["dashboard-chart-metrics"],
    queryFn: async () => {
      const res = await fetch("/api/settings/chart-metrics");
      if (!res.ok) return { dashboardChartMetrics: ["laba"] };
      return res.json();
    },
  });

  // Local metric toggle state (defaulting to saved settings)
  const activeMetrics: string[] = chartConfigData?.dashboardChartMetrics || ["laba"];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const { summary, trends, topItems, outletPerformance } = data || {};

  return (
    <div className="space-y-6">
      {/* Page Header & Filter inside page */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            Executive Summary
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Dashboard Performa Bisnis
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Analisis penjualan komprehensif Cabang & Gudang Padasuka
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* In-page Date Range Picker */}
          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            onPreset={setPreset}
          />

          {/* Location Filter */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={outletFilter}
              onChange={(e) => setOutletFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="">Semua Lokasi</option>
              {outletPerformance?.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Omzet */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Omzet</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {formatRupiah(summary?.totalOmzet)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>HPP Penjualan</span>
            <span className="font-semibold text-slate-700">{formatRupiah(summary?.totalHpp)}</span>
          </div>
        </div>

        {/* Laba */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Laba Kotor</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-blue-600 tracking-tight">
            {formatRupiah(summary?.totalLaba)}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>Margin Keuntungan</span>
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              {summary?.totalOmzet ? ((summary.totalLaba / summary.totalOmzet) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Barang Terjual</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {formatNumber(summary?.totalQty)} <span className="text-sm font-normal text-slate-400">Pcs</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>Frekuensi Transaksi</span>
            <span className="font-semibold text-slate-700">{formatNumber(summary?.totalTransaksi)} nota</span>
          </div>
        </div>

        {/* Pegawai */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Staff & Kasir</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {summary?.activeEmployees || 0} <span className="text-sm font-normal text-slate-400">Orang</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
            <span>Lokasi Aktif</span>
            <span className="font-semibold text-slate-700">{summary?.activeOutlets || 0} Lokasi</span>
          </div>
        </div>
      </div>

      {/* Main Trend Chart: Dynamic based on settings */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Grafik Fluktuasi Penjualan Harian
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan data tren: {activeMetrics.map((m) => m === "laba" ? "Laba Bersih" : m === "omzet" ? "Total Omzet" : "Volume (Qty)").join(", ")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs font-semibold">
            {activeMetrics.includes("laba") && (
              <span className="flex items-center gap-1.5 text-slate-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Laba Bersih
              </span>
            )}
            {activeMetrics.includes("omzet") && (
              <span className="flex items-center gap-1.5 text-slate-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Omzet Penjualan
              </span>
            )}
            {activeMetrics.includes("qty") && (
              <span className="flex items-center gap-1.5 text-slate-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200/60">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block"></span> Volume Terjual (Qty)
              </span>
            )}
            <a
              href="/settings"
              className="text-[11px] font-bold text-slate-400 hover:text-emerald-600 transition-colors ml-1 underline"
            >
              Ubah di Pengaturan
            </a>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLaba" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorOmzet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorQty" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="tanggal" tickFormatter={(v) => formatDate(v)} textAnchor="end" fontSize={11} stroke="#94a3b8" />
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
                formatter={(val: any, name: any) => {
                  if (name === "laba") return [formatRupiah(val), "Laba Bersih"];
                  if (name === "omzet") return [formatRupiah(val), "Total Omzet"];
                  if (name === "qty") return [`${formatNumber(val)} pcs`, "Volume (Qty)"];
                  return [val, name];
                }}
                labelFormatter={(l) => formatDate(l)}
                contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              />
              {activeMetrics.includes("omzet") && (
                <Area type="monotone" dataKey="omzet" stroke="#3b82f6" fillOpacity={1} fill="url(#colorOmzet)" strokeWidth={2.5} />
              )}
              {activeMetrics.includes("laba") && (
                <Area type="monotone" dataKey="laba" stroke="#10b981" fillOpacity={1} fill="url(#colorLaba)" strokeWidth={3} />
              )}
              {activeMetrics.includes("qty") && (
                <Area type="monotone" dataKey="qty" stroke="#a855f7" fillOpacity={1} fill="url(#colorQty)" strokeWidth={2.5} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Top 10 SKU & Outlet Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Top 10 SKU */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Top 10 Barang Terlaris</h3>
              <p className="text-xs text-slate-500">Peringkat kontribusi omzet tertinggi</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nama Produk</th>
                  <th className="py-2.5 px-3 text-right">Qty</th>
                  <th className="py-2.5 px-3 text-right">Omzet</th>
                  <th className="py-2.5 px-3 text-right">Laba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topItems?.map((it: any) => (
                  <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{it.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{it.code} • {it.group}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700">{formatNumber(it.qty)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatRupiah(it.omzet)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-600">{formatRupiah(it.laba)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outlet Breakdown */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight mb-1">
              Perbandingan Penjualan Lokasi
            </h3>
            <p className="text-xs text-slate-500 mb-4">Porsi penjualan antara toko retail vs gudang</p>

            <div className="space-y-4">
              {outletPerformance?.map((o: any) => {
                const pct = summary?.totalOmzet ? ((o.omzet / summary.totalOmzet) * 100).toFixed(1) : 0;
                return (
                  <div key={o.id} className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm text-slate-800">{o.name}</span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {pct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Omzet</span>
                        <span className="font-bold text-slate-800">{formatRupiah(o.omzet)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Laba</span>
                        <span className="font-bold text-blue-600">{formatRupiah(o.laba)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Volume</span>
                        <span className="font-semibold text-slate-700">{formatNumber(o.qty)} pcs</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
