import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, ShoppingBag } from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const EmployeesPage: React.FC = () => {
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees", fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      const res = await fetch(`/api/employees?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data pegawai");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            Pegawai & Staff
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar kinerja transaksi, kontribusi penjualan, dan laba per staff kasir
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat data pegawai...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nama Pegawai / Kasir</th>
                  <th className="py-3 px-4">Lokasi Bertugas</th>
                  <th className="py-3 px-4 text-right">Total Transaksi</th>
                  <th className="py-3 px-4 text-right">Volume Terjual</th>
                  <th className="py-3 px-4 text-right">Total Omzet</th>
                  <th className="py-3 px-4 text-right">Laba Dihasilkan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employees?.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {e.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {e.outlets.join(", ") || "-"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-700">
                      {formatNumber(e.totalTransaksi)} trx
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-600">
                      {formatNumber(e.totalQty)} pcs
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                      {formatRupiah(e.totalOmzet)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                      {formatRupiah(e.totalLaba)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
