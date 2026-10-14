import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Shield, Clock } from "lucide-react";
import { formatDateTime } from "../lib/format.js";

export const ActivityLogPage: React.FC = () => {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["activity-log", page],
    queryFn: async () => {
      const res = await fetch(`/api/activity-log?page=${page}&limit=50`);
      if (!res.ok) throw new Error("Gagal mengambil log aktivitas");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" />
          Log Aktivitas Sistem
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Audit jejak digital aktivitas sistem, import, perubahan target, dan otentikasi
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat log aktivitas...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Keterangan / Detail</th>
                  <th className="py-3 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Belum ada catatan aktivitas baru.
                    </td>
                  </tr>
                ) : (
                  data?.logs?.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {l.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">{l.action}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{l.detail || "-"}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{l.ip || "127.0.0.1"}</td>
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
