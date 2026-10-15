import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  Crown,
  Medal,
  ChevronDown,
  ChevronUp,
  Search,
  Share2,
  RefreshCw,
  Sun,
  Moon,
  LogIn,
  Check,
  TrendingUp,
  Package,
  Sparkles,
} from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { useTheme } from "../context/ThemeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const PublicPointsPage: React.FC = () => {
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);
  const [searchEmp, setSearchEmp] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);

  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();
  const { resolvedTheme, toggleTheme } = useTheme();

  // Fetch leaderboard data
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["public-points", "leaderboard", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/points/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data papan poin");
      return res.json();
    },
    refetchInterval: autoRefresh ? 30000 : false, // 30s auto-refresh if enabled
  });

  const { leaderboard = [], rate = 0 } = data || {};

  // Copy public link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/papan-poin");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Filter leaderboard by search query
  const filteredLeaderboard = leaderboard.filter((emp: any) =>
    emp.name?.toLowerCase().includes(searchEmp.toLowerCase())
  );

  // Top 3 employees for podium
  const top1 = leaderboard[0];
  const top2 = leaderboard[1];
  const top3 = leaderboard[2];

  // Total points and sold items sum
  const totalAllPoints = leaderboard.reduce((acc: number, e: any) => acc + (Number(e.totalPoints) || 0), 0);
  const totalAllQty = leaderboard.reduce((acc: number, e: any) => acc + (Number(e.totalQty) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* 1. Public Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-xl shadow-md shadow-amber-500/20 text-white font-bold">
              🐾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-base tracking-tight text-slate-900 dark:text-white">
                  Analisa Petshop
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Publik
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Papan Peringkat & Insentif Kinerja Penjualan Staf
              </p>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Ganti Tema"
            >
              {resolvedTheme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Copy Link Button */}
            <button
              onClick={handleCopyLink}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? "Tautan Disalin!" : "Bagikan"}</span>
            </button>

            {/* Login Link for Admins */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login Admin</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-6 sm:p-8 text-white shadow-xl shadow-amber-900/10">
          <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute left-1/3 bottom-0 w-80 h-40 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-amber-200 text-xs font-bold backdrop-blur-xs border border-white/10">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Papan Poin Penjualan Pegawai (Terbuka Untuk Umum)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Leaderboard & Poin Insentif
              </h1>
              <p className="text-xs sm:text-sm text-amber-100 max-w-xl">
                Pantau perolehan poin penjualan harian dan bulanan seluruh staf secara transparan dan real-time.
              </p>
            </div>

            {/* Summary Highlights */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-left">
                <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider block">
                  Kurs Insentif
                </span>
                <span className="text-lg font-black text-white">{formatRupiah(rate)}</span>
                <span className="text-[10px] text-amber-200 block">per 1 Poin</span>
              </div>
              <div className="px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-left">
                <span className="text-[10px] uppercase font-bold text-amber-200 tracking-wider block">
                  Total Poin Akumulasi
                </span>
                <span className="text-lg font-black text-white">{formatNumber(totalAllPoints)}</span>
                <span className="text-[10px] text-amber-200 block">dari {formatNumber(totalAllQty)} pcs barang</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Top 3 Podium Cards */}
        {leaderboard && leaderboard.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Juara 2 (Silver) */}
            {top2 && (
              <div className="order-2 md:order-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full blur-xl -translate-y-6 translate-x-6 pointer-events-none"></div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-2xl font-black shadow-inner">
                    🥈
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Peringkat 2</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {top2.name}
                    </h3>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Perolehan Poin</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-200">{formatNumber(top2.totalPoints)} Poin</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimasi Reward</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(top2.insentif)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Juara 1 (Gold) */}
            {top1 && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-2 border-amber-400 dark:border-amber-500/50 rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden transition-all hover:shadow-lg md:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-300/30 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 dark:bg-amber-500 text-amber-950 flex items-center justify-center text-3xl font-black shadow-lg shadow-amber-500/30">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Juara 1 Penjualan</span>
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate max-w-[180px]">
                      {top1.name}
                    </h3>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Total Poin</span>
                    <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{formatNumber(top1.totalPoints)} Poin</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">Estimasi Insentif</span>
                    <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(top1.insentif)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Juara 3 (Bronze) */}
            {top3 && (
              <div className="order-3 md:order-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all hover:shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 dark:bg-amber-950/20 rounded-full blur-xl -translate-y-6 translate-x-6 pointer-events-none"></div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center text-2xl font-black shadow-inner">
                    🥉
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Peringkat 3</span>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white truncate max-w-[160px]">
                      {top3.name}
                    </h3>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Perolehan Poin</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-200">{formatNumber(top3.totalPoints)} Poin</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Estimasi Reward</span>
                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{formatRupiah(top3.insentif)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. Controls & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Date Range Picker (29 ke 28 cycle) */}
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onFromChange={setFromDate}
              onToChange={setToDate}
              onPreset={setPreset}
            />

            {/* Search & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Staff */}
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai..."
                  value={searchEmp}
                  onChange={(e) => setSearchEmp(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                title="Muat Ulang Data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-emerald-500" : "text-slate-400"}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Auto Refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                  autoRefresh
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                }`}
                title="Refresh otomatis setiap 30 detik untuk tampilan layar monitor/TV"
              >
                <span>Live Mode {autoRefresh ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. Leaderboard Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {isLoading ? (
            <div className="p-16 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto mb-2" />
              <span>Menghitung perolehan poin penjualan staf...</span>
            </div>
          ) : filteredLeaderboard.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400">
              Tidak ada data poin pegawai yang cocok dengan filter / pencarian.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3.5 px-4 text-center w-16">Peringkat</th>
                    <th className="py-3.5 px-4">Nama Pegawai</th>
                    <th className="py-3.5 px-4 text-right">Barang Terjual</th>
                    <th className="py-3.5 px-4 text-right">Total Poin</th>
                    <th className="py-3.5 px-4 text-right">Estimasi Insentif</th>
                    <th className="py-3.5 px-4 text-center w-20">Rincian Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredLeaderboard.map((emp: any, idx: number) => {
                    const isExpanded = expandedEmpId === emp.employeeId;
                    return (
                      <React.Fragment key={emp.employeeId}>
                        <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          {/* Rank Column */}
                          <td className="py-3.5 px-4 text-center">
                            {idx === 0 ? (
                              <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-black inline-flex items-center justify-center text-sm shadow-xs">
                                🥇
                              </span>
                            ) : idx === 1 ? (
                              <span className="w-7 h-7 rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-black inline-flex items-center justify-center text-sm shadow-xs">
                                🥈
                              </span>
                            ) : idx === 2 ? (
                              <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400 font-black inline-flex items-center justify-center text-sm shadow-xs">
                                🥉
                              </span>
                            ) : (
                              <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold inline-flex items-center justify-center text-xs">
                                {idx + 1}
                              </span>
                            )}
                          </td>

                          {/* Employee Name */}
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white text-sm">
                            {emp.name}
                          </td>

                          {/* Items Sold */}
                          <td className="py-3.5 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                            {formatNumber(emp.totalQty)}{" "}
                            <span className="text-[10px] text-slate-400">pcs</span>
                          </td>

                          {/* Total Points */}
                          <td className="py-3.5 px-4 text-right">
                            <span className="bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 font-black px-2.5 py-1 rounded-full text-xs inline-block">
                              {formatNumber(emp.totalPoints)} Poin
                            </span>
                          </td>

                          {/* Incentive Estimation */}
                          <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatRupiah(emp.insentif)}
                          </td>

                          {/* Expand Details Button */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              onClick={() => setExpandedEmpId(isExpanded ? null : emp.employeeId)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? "Tutup" : "Lihat"}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Item Breakdown */}
                        {isExpanded && (
                          <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                            <td colSpan={6} className="py-4 px-6 sm:px-12">
                              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900/90 p-4 space-y-3 shadow-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <Package className="w-3.5 h-3.5 text-amber-500" />
                                    Rincian Penjualan Barang Berpoin: {emp.name}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {emp.itemBreakdown?.length || 0} Macam Produk
                                  </span>
                                </div>

                                {emp.itemBreakdown?.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {emp.itemBreakdown.map((it: any, i: number) => (
                                      <div
                                        key={i}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 text-xs flex justify-between items-center"
                                      >
                                        <div className="truncate mr-2">
                                          <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                                            {it.name}
                                          </span>
                                          <span className="text-[10px] text-slate-400 block">
                                            Terjual: {formatNumber(it.qty)} pcs
                                          </span>
                                        </div>
                                        <span className="font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-lg shrink-0">
                                          +{formatNumber(it.points)} Poin
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 italic">
                                    Belum ada transaksi item yang memenuhi aturan perolehan poin.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* 6. Footer */}
      <footer className="mt-12 py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        <p>Sistem Analisis Penjualan & Papan Poin Petshop &copy; {new Date().getFullYear()} • Akses Publik</p>
      </footer>
    </div>
  );
};
