import React from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, AlertCircle } from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const TargetReportPage: React.FC = () => {
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  const { data, isLoading } = useQuery({
    queryKey: ["targetReport", fromDate, toDate],
    queryFn: async () => {
      const res = await fetch(`/api/target/report?from=${fromDate}&to=${toDate}&branch=BANDUNG`);
      if (!res.ok) throw new Error("Gagal mengambil laporan target");
      return res.json();
    },
  });

  const { rows, targets, unmappedItemGroups, dayCount } = data || {};

  const totals = rows?.reduce(
    (acc: any, r: any) => ({
      dryfoodSales: acc.dryfoodSales + (r.dryfood?.sales || 0),
      dryfoodQty: acc.dryfoodQty + (r.dryfood?.qtyOrTrx || 0),
      wetfoodSales: acc.wetfoodSales + (r.wetfood?.sales || 0),
      wetfoodQty: acc.wetfoodQty + (r.wetfood?.qtyOrTrx || 0),
      aksesorisSales: acc.aksesorisSales + (r.aksesoris?.sales || 0),
      aksesorisQty: acc.aksesorisQty + (r.aksesoris?.qtyOrTrx || 0),
      totalSales: acc.totalSales + (r.totalSales || 0),
      totalQty: acc.totalQty + (r.totalQtyTrx || 0),
    }),
    {
      dryfoodSales: 0,
      dryfoodQty: 0,
      wetfoodSales: 0,
      wetfoodQty: 0,
      aksesorisSales: 0,
      aksesorisQty: 0,
      totalSales: 0,
      totalQty: 0,
    }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            Laporan Target Sales Harian
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluasi capaian laba dan kuantitas penjualan Dryfood, Wetfood, & Aksesoris per lokasi
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

      {/* Target Comparison Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">Target Dryfood ({dayCount} Hari)</span>
          <div className="mt-2 text-xl font-bold text-slate-900">{formatRupiah(targets?.all?.DRYFOOD)}</div>
          <span className="text-[11px] text-slate-400">Target per konter: {formatRupiah(targets?.perkonter?.DRYFOOD)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider block">Target Wetfood ({dayCount} Hari)</span>
          <div className="mt-2 text-xl font-bold text-slate-900">{formatRupiah(targets?.all?.WETFOOD)}</div>
          <span className="text-[11px] text-slate-400">Target per konter: {formatRupiah(targets?.perkonter?.WETFOOD)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider block">Target Aksesoris ({dayCount} Hari)</span>
          <div className="mt-2 text-xl font-bold text-amber-600">{formatRupiah(targets?.all?.AKSESORIS)}</div>
          <span className="text-[11px] text-slate-400">Target per konter: {formatRupiah(targets?.perkonter?.AKSESORIS)}</span>
        </div>
      </div>

      {/* Warning for unmapped groups */}
      {unmappedItemGroups && unmappedItemGroups.length > 0 && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Ada kategori produk yang belum dipetakan: <strong>{unmappedItemGroups.join(", ")}</strong>. Silakan petakan ke DRYFOOD, WETFOOD, atau AKSESORIS di Pengaturan.
          </span>
        </div>
      )}

      {/* 9-Column Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Menghitung laporan target...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-4">Nama Outlet</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/50 text-emerald-800 font-bold">Dryfood (Laba)</th>
                  <th className="py-3 px-3 text-right bg-emerald-50/50 text-emerald-800 font-bold">Dryfood (Pcs)</th>
                  <th className="py-3 px-3 text-right bg-blue-50/50 text-blue-800 font-bold">Wetfood (Laba)</th>
                  <th className="py-3 px-3 text-right bg-blue-50/50 text-blue-800 font-bold">Wetfood (Pcs)</th>
                  <th className="py-3 px-3 text-right bg-amber-50/50 text-amber-800 font-bold">Aksesoris (Laba)</th>
                  <th className="py-3 px-3 text-right bg-amber-50/50 text-amber-800 font-bold">Aksesoris (Pcs)</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-900 bg-slate-100/60">Total Laba</th>
                  <th className="py-3 px-3 text-right font-bold text-slate-900 bg-slate-100/60">Total Pcs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows?.map((r: any, idx: number) => (
                  <tr key={r.outletId} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">{r.outlet}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-emerald-700 bg-emerald-50/20">
                      {formatRupiah(r.dryfood?.sales || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 bg-emerald-50/20">
                      {formatNumber(r.dryfood?.qtyOrTrx || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-blue-700 bg-blue-50/20">
                      {formatRupiah(r.wetfood?.sales || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 bg-blue-50/20">
                      {formatNumber(r.wetfood?.qtyOrTrx || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-amber-700 bg-amber-50/20">
                      {formatRupiah(r.aksesoris?.sales || 0)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 bg-amber-50/20">
                      {formatNumber(r.aksesoris?.qtyOrTrx || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900 bg-slate-50/50">
                      {formatRupiah(r.totalSales)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-700 bg-slate-50/50">
                      {formatNumber(r.totalQtyTrx)}
                    </td>
                  </tr>
                ))}
              </tbody>
              {rows && rows.length > 0 && (
                <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300">
                  <tr>
                    <td className="py-3 px-3 text-slate-500" colSpan={2}>
                      TOTAL ({rows.length} Konter)
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800">
                      {formatRupiah(totals?.dryfoodSales || 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-800">
                      {formatNumber(totals?.dryfoodQty || 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-800">
                      {formatRupiah(totals?.wetfoodSales || 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-blue-800">
                      {formatNumber(totals?.wetfoodQty || 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-800">
                      {formatRupiah(totals?.aksesorisSales || 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-800">
                      {formatNumber(totals?.aksesorisQty || 0)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-900 bg-slate-200/50">
                      {formatRupiah(totals?.totalSales || 0)}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-900 bg-slate-200/50">
                      {formatNumber(totals?.totalQty || 0)}
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
