import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Share2,
  ExternalLink,
  Check,
  Search,
  Package,
} from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const PointsPage: React.FC = () => {
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);
  const [searchEmp, setSearchEmp] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  const { data, isLoading } = useQuery({
    queryKey: ["points", "leaderboard", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/points/leaderboard?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data poin");
      return res.json();
    },
  });

  const { leaderboard = [], rate = 0 } = data || {};

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/papan-poin");
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const filteredLeaderboard = leaderboard.filter((emp: any) =>
    emp.name?.toLowerCase().includes(searchEmp.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              Papan Peringkat & Poin Pegawai
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              Internal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Akumulasi poin kinerja penjualan staff dan estimasi insentif reward (Siklus 29 ke 28)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Share Public Link Button */}
          <button
            onClick={handleCopyPublicLink}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-xs"
            title="Salin link publik agar bisa diakses siapapun tanpa perlu akun"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4 text-amber-500" />}
            <span>{copied ? "Link Publik Disalin!" : "Salin Link Publik"}</span>
          </button>

          {/* Open Public Page */}
          <Link
            to="/papan-poin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Buka Tampilan Layar Publik (Kiosk / Staff View)"
          >
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Buka Layar Publik</span>
          </Link>

          <DateRangePicker
            fromDate={fromDate}
            toDate={toDate}
            onFromChange={setFromDate}
            onToChange={setToDate}
            onPreset={setPreset}
          />
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-3 py-2 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 shrink-0">
            Kurs: {formatRupiah(rate)} / Poin
          </div>
        </div>
      </div>

      {/* Public Share Info Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-amber-500/10 border border-emerald-500/20 dark:border-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white block">
              Menu Publik Aktif: Siapapun dapat melihat Papan Poin tanpa perlu login
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Bagikan link tautan <code className="bg-white/80 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-mono text-[10px]">/papan-poin</code> ke grup WhatsApp pegawai toko.
            </span>
          </div>
        </div>
        <button
          onClick={handleCopyPublicLink}
          className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
        >
          {copied ? "Berhasil Disalin" : "Salin Tautan WhatsApp"}
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama pegawai..."
            value={searchEmp}
            onChange={(e) => setSearchEmp(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Menampilkan {filteredLeaderboard.length} Pegawai
        </span>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Menghitung leaderboard poin...</div>
        ) : filteredLeaderboard.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Tidak ada pegawai yang cocok dengan filter / pencarian.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4 text-center w-16">Peringkat</th>
                  <th className="py-3 px-4">Nama Pegawai</th>
                  <th className="py-3 px-4 text-right">Barang Terjual</th>
                  <th className="py-3 px-4 text-right">Total Poin</th>
                  <th className="py-3 px-4 text-right">Estimasi Insentif</th>
                  <th className="py-3 px-4 text-center w-20">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {filteredLeaderboard.map((emp: any, idx: number) => {
                  const isExpanded = expandedEmpId === emp.employeeId;
                  return (
                    <React.Fragment key={emp.employeeId}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 text-center">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold inline-flex items-center justify-center text-xs">
                              🥇
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 font-bold inline-flex items-center justify-center text-xs">
                              🥈
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-bold inline-flex items-center justify-center text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500 font-semibold">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white text-sm">
                          {emp.name}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600 dark:text-slate-300">
                          {formatNumber(emp.totalQty)} pcs
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-300 font-bold px-2.5 py-0.5 rounded-full text-xs">
                            {formatNumber(emp.totalPoints)} Poin
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {formatRupiah(emp.insentif)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedEmpId(isExpanded ? null : emp.employeeId)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 dark:bg-slate-950/40">
                          <td colSpan={6} className="py-3 px-8">
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/90 p-3 space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-amber-500" />
                                Rincian Penjualan Barang Berpoin:
                              </span>
                              {emp.itemBreakdown?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {emp.itemBreakdown.map((it: any, i: number) => (
                                    <div
                                      key={i}
                                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-100 dark:border-slate-800/80 text-xs flex justify-between items-center"
                                    >
                                      <span className="truncate max-w-[180px] text-slate-700 dark:text-slate-300">
                                        {it.name}
                                      </span>
                                      <span className="font-semibold text-slate-900 dark:text-white shrink-0">
                                        {it.qty} pcs ({it.points} Poin)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-400 italic">
                                  Belum ada transaksi item yang memenuhi aturan poin.
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
    </div>
  );
};
