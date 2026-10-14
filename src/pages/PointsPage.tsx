import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ChevronDown, ChevronUp } from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const PointsPage: React.FC = () => {
  const [expandedEmpId, setExpandedEmpId] = useState<number | null>(null);
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

  const { leaderboard, rate } = data || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Papan Peringkat & Poin Pegawai
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Akumulasi poin kinerja penjualan staff dan estimasi insentif reward
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
          <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold text-amber-800">
            Kurs: {formatRupiah(rate)} per Poin
          </div>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Menghitung leaderboard poin...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 text-center w-16">Peringkat</th>
                  <th className="py-3 px-4">Nama Pegawai</th>
                  <th className="py-3 px-4 text-right">Barang Terjual</th>
                  <th className="py-3 px-4 text-right">Total Poin</th>
                  <th className="py-3 px-4 text-right">Estimasi Insentif</th>
                  <th className="py-3 px-4 text-center">Rincian</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaderboard?.map((emp: any, idx: number) => {
                  const isExpanded = expandedEmpId === emp.employeeId;
                  return (
                    <React.Fragment key={emp.employeeId}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 text-center">
                          {idx === 0 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold inline-flex items-center justify-center text-xs">
                              🥇
                            </span>
                          ) : idx === 1 ? (
                            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold inline-flex items-center justify-center text-xs">
                              🥈
                            </span>
                          ) : idx === 2 ? (
                            <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-800 font-bold inline-flex items-center justify-center text-xs">
                              🥉
                            </span>
                          ) : (
                            <span className="text-slate-400 font-semibold">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 text-sm">
                          {emp.name}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-600">
                          {formatNumber(emp.totalQty)} pcs
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="bg-amber-100 text-amber-900 font-bold px-2.5 py-0.5 rounded-full text-xs">
                            {formatNumber(emp.totalPoints)} Poin
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                          {formatRupiah(emp.insentif)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setExpandedEmpId(isExpanded ? null : emp.employeeId)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Item Breakdown */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70">
                          <td colSpan={6} className="py-3 px-8">
                            <div className="border border-slate-200 rounded-lg bg-white p-3 space-y-2">
                              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                Rincian Penjualan Barang Berpoin:
                              </span>
                              {emp.itemBreakdown?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {emp.itemBreakdown.map((it: any, i: number) => (
                                    <div key={i} className="p-2 rounded-md bg-slate-50 text-xs flex justify-between items-center">
                                      <span className="truncate max-w-[180px] text-slate-700">{it.name}</span>
                                      <span className="font-semibold text-slate-900 shrink-0">
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
