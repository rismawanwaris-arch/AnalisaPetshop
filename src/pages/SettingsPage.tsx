import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Users,
  Shield,
  Eye,
  Database,
  Target,
  MapPin,
  Layers,
  Award,
  Sliders,
  UserX,
  FileSpreadsheet,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  BarChart3,
} from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({
    targets: true,
    mappings: true,
    pointSettings: false,
    users: false,
    roles: false,
    outlets: true,
    menuVisibility: false,
    chartSettings: false,
    itemPoints: false,
    exclusions: false,
    backup: false,
  });

  const togglePanel = (key: string) => {
    setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const { data, isLoading } = useQuery({
    queryKey: ["settings-full"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Gagal mengambil data pengaturan");
      return res.json();
    },
  });

  // State forms
  const [newUsername, setNewUsername] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("admin");

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCat, setNewGroupCat] = useState("PETSHOP");

  const [newPointPattern, setNewPointPattern] = useState("");
  const [newPointValue, setNewPointValue] = useState("5");

  const [newExclusionPattern, setNewExclusionPattern] = useState("");

  // Targets state
  const [targetForm, setTargetForm] = useState<any[]>([]);

  // Initialize targets when data loads
  React.useEffect(() => {
    if (data?.targets) {
      setTargetForm(data.targets);
    }
  }, [data]);

  const updateTargetMutation = useMutation({
    mutationFn: async (targets: any[]) => {
      const res = await fetch("/api/settings/targets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targets }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-full"] });
      alert("Nominal target berhasil diperbarui!");
    },
  });

  const updatePointSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const res = await fetch("/api/settings/point-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-full"] });
      alert("Parameter poin berhasil diperbarui!");
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600" />
            Pengaturan Sistem & Master Panel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola target 3 lini bisnis, hak akses pengguna, pemetaan kategori, aturan poin, dan pencadangan data
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400">Memuat panel pengaturan...</div>
      ) : (
        <div className="space-y-4">
          {/* 1. NOMINAL TARGET (BANDUNG) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("targets")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Target className="w-4 h-4 text-emerald-600" />
                Nominal Target Harian (2 Scope × 3 Lini Bisnis)
              </div>
              {openPanels.targets ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.targets && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <p className="text-xs text-slate-500">
                  Target laba harian untuk ambang lolos per konter (PERKONTER) dan target total seluruh cabang (ALL).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {targetForm?.map((t, idx) => (
                    <div key={t.id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{t.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.scope === "ALL" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"}`}>
                          {t.scope}
                        </span>
                      </div>
                      <input
                        type="number"
                        value={t.amount}
                        onChange={(e) => {
                          const updated = [...targetForm];
                          updated[idx].amount = parseFloat(e.target.value) || 0;
                          setTargetForm(updated);
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <span className="text-[10px] text-slate-400 block">{formatRupiah(t.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => updateTargetMutation.mutate(targetForm)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Simpan Perubahan Target
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. PEMETAAN KATEGORI ITEM GROUP (CUSTOM KATEGORI) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("mappings")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Layers className="w-4 h-4 text-blue-600" />
                Pemetaan Kategori Grup Barang (Bebas Custom Kategori)
              </div>
              {openPanels.mappings ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.mappings && (
              <div className="p-5 border-t border-slate-100 space-y-5">
                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/60 text-xs text-blue-900 space-y-1">
                  <span className="font-bold block">💡 Cara Kerja Pemetaan Kategori:</span>
                  <p className="text-blue-800 leading-relaxed">
                    Anda bisa mengelompokkan kategori barang dari Excel POS (contoh: <i>CAT ADULT DRY</i>, <i>MAKANAN BASAH</i>, <i>AKSESORIS</i>) ke dalam nama kategori kustom Anda sendiri (contoh: <b>Dryfood</b>, <b>Wetfood</b>, <b>Aksesoris</b>, <b>Pasir</b>, dll).
                  </p>
                </div>

                {/* Add or edit mapping */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Tambah / Ubah Pemetaan Kategori Baru:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-5">
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Nama Grup dari Excel POS:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: CAT ADULT DRY atau MAKANAN BASAH"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Dipetakan Ke Kategori (Bisa Ketik Bebas):
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Dryfood, Wetfood, Aksesoris..."
                        value={newGroupCat}
                        onChange={(e) => setNewGroupCat(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-900 font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-3 flex items-end">
                      <button
                        onClick={async () => {
                          if (!newGroupName.trim() || !newGroupCat.trim()) {
                            alert("Harap isi nama grup POS dan kategori tujuan!");
                            return;
                          }
                          await fetch("/api/settings/mappings/item-group", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              itemGroup: newGroupName.trim().toUpperCase(),
                              category: newGroupCat.trim().toUpperCase(),
                            }),
                          });
                          setNewGroupName("");
                          queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                          queryClient.invalidateQueries({ queryKey: ["categories"] });
                          queryClient.invalidateQueries({ queryKey: ["targetReport"] });
                        }}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        Simpan Pemetaan
                      </button>
                    </div>
                  </div>

                  {/* Suggestion tags */}
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                    <span>Preset Cepat:</span>
                    {["DRYFOOD", "WETFOOD", "AKSESORIS", "PASIR", "OBAT", "SNACK"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setNewGroupCat(tag)}
                        className="px-2 py-0.5 rounded-md bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mapping list */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1 text-xs font-bold text-slate-700 uppercase tracking-wider">
                    <span>Daftar Pemetaan Aktif ({data?.itemGroupMappings?.length || 0})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    {data?.itemGroupMappings?.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 flex items-center justify-between hover:bg-slate-100/70 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-900 block truncate">{m.itemGroup}</span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[10px] text-slate-400 font-medium">Kategori:</span>
                            <span className="text-[10px] font-black text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                              {m.category}
                            </span>
                          </div>
                        </div>
                        <button
                          title="Hapus pemetaan"
                          onClick={async () => {
                            if (confirm(`Hapus pemetaan untuk "${m.itemGroup}"?`)) {
                              await fetch(`/api/settings/mappings/item-group/${m.id}`, { method: "DELETE" });
                              queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                              queryClient.invalidateQueries({ queryKey: ["categories"] });
                              queryClient.invalidateQueries({ queryKey: ["targetReport"] });
                            }
                          }}
                          className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. SIKLUS PERIODE & TARGET POIN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("pointSettings")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Sliders className="w-4 h-4 text-amber-500" />
                Siklus Periode & Target Poin Pegawai
              </div>
              {openPanels.pointSettings ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.pointSettings && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="font-bold text-slate-700 block">Kurs Rupiah / Poin</label>
                    <input
                      type="number"
                      defaultValue={data?.settings?.pointRupiahRate || 100}
                      id="rateInput"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="font-bold text-slate-700 block">Target Harian (Poin)</label>
                    <input
                      type="number"
                      defaultValue={data?.settings?.pointTargetDaily || 5}
                      id="dailyInput"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="font-bold text-slate-700 block">Target Mingguan (Poin)</label>
                    <input
                      type="number"
                      defaultValue={data?.settings?.pointTargetWeekly || 25}
                      id="weeklyInput"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <label className="font-bold text-slate-700 block">Target Bulanan (Poin)</label>
                    <input
                      type="number"
                      defaultValue={data?.settings?.pointTargetMonthly || 100}
                      id="monthlyInput"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      const pointRupiahRate = (document.getElementById("rateInput") as HTMLInputElement).value;
                      const pointTargetDaily = (document.getElementById("dailyInput") as HTMLInputElement).value;
                      const pointTargetWeekly = (document.getElementById("weeklyInput") as HTMLInputElement).value;
                      const pointTargetMonthly = (document.getElementById("monthlyInput") as HTMLInputElement).value;
                      updatePointSettingsMutation.mutate({
                        pointRupiahRate,
                        pointTargetDaily,
                        pointTargetWeekly,
                        pointTargetMonthly,
                        periodStartDay: 1,
                      });
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Simpan Parameter Poin
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. POIN PER ITEM & DIKECUALIKAN */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("itemPoints")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Award className="w-4 h-4 text-purple-600" />
                Aturan Poin per Item & Produk Dikecualikan
              </div>
              {openPanels.itemPoints ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.itemPoints && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <p className="text-xs text-slate-500">
                  Aturan poin khusus berdasarkan pola nama item (substring). Pola terpanjang menang.
                </p>

                {/* Add Item Point */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <input
                    type="text"
                    placeholder="Pola Nama Item (contoh: BOLT 800)"
                    value={newPointPattern}
                    onChange={(e) => setNewPointPattern(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                  <input
                    type="number"
                    placeholder="Poin"
                    value={newPointValue}
                    onChange={(e) => setNewPointValue(e.target.value)}
                    className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-center font-bold"
                  />
                  <button
                    onClick={async () => {
                      if (!newPointPattern) return;
                      await fetch("/api/settings/item-points", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ pattern: newPointPattern, points: newPointValue }),
                      });
                      setNewPointPattern("");
                      queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                    }}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Tambah Aturan Poin
                  </button>
                </div>

                {/* List rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {data?.itemPoints?.map((ip: any) => (
                    <div key={ip.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 block">{ip.pattern}</span>
                        <span className="text-[10px] text-purple-600 font-bold">{ip.points} Poin / pcs</span>
                      </div>
                      <button
                        onClick={async () => {
                          if (confirm(`Hapus aturan poin ${ip.pattern}?`)) {
                            await fetch(`/api/settings/item-points/${ip.id}`, { method: "DELETE" });
                            queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                          }
                        }}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. AKUN PENGGUNA & SESI */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("users")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Users className="w-4 h-4 text-emerald-600" />
                Akun Pengguna & Sesi Aktif
              </div>
              {openPanels.users ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.users && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                {/* Create user */}
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <input
                    type="text"
                    placeholder="Username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                  <input
                    type="text"
                    placeholder="Nama Lengkap"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-bold"
                  >
                    <option value="admin">Admin</option>
                    <option value="master">Master</option>
                  </select>
                  <button
                    onClick={async () => {
                      if (!newUsername || !newPassword) return;
                      await fetch("/api/settings/users", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ username: newUsername, displayName: newDisplayName, password: newPassword, role: newRole }),
                      });
                      setNewUsername("");
                      setNewDisplayName("");
                      setNewPassword("");
                      queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Tambah User
                  </button>
                </div>

                {/* Users List */}
                <div className="space-y-2 text-xs">
                  {data?.users?.map((u: any) => (
                    <div key={u.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-800 text-sm block">{u.displayName || u.username}</span>
                        <span className="text-[11px] text-slate-400">@{u.username} • Role: {u.role}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                          {u.isActive ? "Aktif" : "Non-Aktif"}
                        </span>
                        {u.role !== "master" && (
                          <button
                            onClick={async () => {
                              if (confirm(`Hapus akun @${u.username}?`)) {
                                await fetch(`/api/settings/users/${u.id}`, { method: "DELETE" });
                                queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 6. VISIBILITAS OUTLET & PEGAWAI */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("outlets")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <MapPin className="w-4 h-4 text-teal-600" />
                Visibilitas Lokasi Cabang / Outlet & Pegawai
              </div>
              {openPanels.outlets ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.outlets && (
              <div className="p-5 border-t border-slate-100 space-y-6">
                {/* Outlet Visibility */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Visibilitas Cabang / Outlet:</span>
                      <p className="text-[11px] text-slate-400">
                        Atur apakah cabang/outlet ditampilkan atau disembunyikan dari dashboard dan dimensi analisis.
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{data?.outlets?.length || 0} outlet</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {data?.outlets?.map((o: any) => (
                      <div
                        key={o.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between transition-colors ${
                          o.isHidden
                            ? "bg-slate-100/70 border-slate-200 opacity-75"
                            : "bg-white border-slate-200 shadow-2xs"
                        }`}
                      >
                        <div>
                          <span className={`font-bold block text-sm ${o.isHidden ? "text-slate-500 line-through" : "text-slate-900"}`}>
                            {o.name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Wilayah:</span>
                            <select
                              value={o.branch}
                              onChange={async (e) => {
                                await fetch(`/api/settings/outlets/${o.id}/branch`, {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ branch: e.target.value }),
                                });
                                queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                                queryClient.invalidateQueries({ queryKey: ["outlets-performance"] });
                              }}
                              className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 cursor-pointer"
                            >
                              <option value="BANDUNG">BANDUNG</option>
                              <option value="CIMAHI">CIMAHI</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={async () => {
                              await fetch(`/api/settings/outlets/${o.id}/visibility`, {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ isHidden: !o.isHidden }),
                              });
                              queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                              queryClient.invalidateQueries({ queryKey: ["outlets-performance"] });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                              o.isHidden
                                ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/60"
                            }`}
                          >
                            {o.isHidden ? "Disembunyikan" : "Tampil"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employee Visibility */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block text-xs">Visibilitas Pegawai & Staff:</span>
                      <p className="text-[11px] text-slate-400">
                        Atur apakah nama kasir/pegawai ditampilkan dalam laporan kinerja dan leaderboard poin.
                      </p>
                    </div>
                    <span className="text-xs text-slate-400 font-semibold">{data?.employees?.length || 0} pegawai</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    {data?.employees?.map((emp: any) => (
                      <div
                        key={emp.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                          emp.isHidden
                            ? "bg-slate-100/70 border-slate-200 opacity-75"
                            : "bg-white border-slate-200 shadow-2xs"
                        }`}
                      >
                        <div>
                          <span className={`font-bold block ${emp.isHidden ? "text-slate-500 line-through" : "text-slate-900"}`}>
                            {emp.name}
                          </span>
                          <span className="text-[10px] text-slate-400">ID: #{emp.id}</span>
                        </div>

                        <button
                          onClick={async () => {
                            await fetch(`/api/settings/employees/${emp.id}/visibility`, {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ isHidden: !emp.isHidden }),
                            });
                            queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                            queryClient.invalidateQueries({ queryKey: ["employees"] });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                            emp.isHidden
                              ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300/60"
                          }`}
                        >
                          {emp.isHidden ? "Disembunyikan" : "Tampil"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 7. VISIBILITAS MENU SIDEBAR */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("menuVisibility")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Eye className="w-4 h-4 text-blue-600" />
                Visibilitas Menu Sidebar
              </div>
              {openPanels.menuVisibility ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.menuVisibility && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Pilih menu navigasi sidebar yang ingin ditampilkan atau disembunyikan. Menu Pengaturan selalu aktif untuk Master.
                  </p>
                  <button
                    onClick={async () => {
                      if (confirm("Reset seluruh menu agar kembali tampil?")) {
                        await fetch("/api/settings/menu-visibility", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ hiddenMenuItems: [] }),
                        });
                        queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                        queryClient.invalidateQueries({ queryKey: ["menu-visibility"] });
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                  >
                    Tampilkan Semua Menu
                  </button>
                </div>

                {/* Sidebar menu list toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {[
                    { name: "Dashboard", href: "/", section: "Cabang Bandung" },
                    { name: "Target Harian", href: "/target", section: "Cabang Bandung" },
                    { name: "Monitoring Pembelian", href: "/purchases", section: "Cabang Bandung" },
                    { name: "Poin Penjualan", href: "/points", section: "Cabang Bandung" },
                    { name: "Kategori Item", href: "/items/categories", section: "Dimensi Analisis" },
                    { name: "Performa Outlet", href: "/outlets", section: "Dimensi Analisis" },
                    { name: "Pegawai & Staff", href: "/employees", section: "Dimensi Analisis" },
                    { name: "Daftar Transaksi", href: "/transactions", section: "Dimensi Analisis" },
                    { name: "Master Item", href: "/items", section: "Manajemen Data & Sistem" },
                    { name: "Import & Batch", href: "/import", section: "Manajemen Data & Sistem" },
                    { name: "Analisa Data", href: "/analisa-data", section: "Manajemen Data & Sistem" },
                    { name: "Log Aktivitas", href: "/log", section: "Manajemen Data & Sistem" },
                  ].map((m) => {
                    const isHidden = (data?.settings?.hiddenMenuItems || []).includes(m.href);
                    return (
                      <div
                        key={m.href}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-colors ${
                          isHidden ? "bg-slate-100/70 border-slate-200 opacity-75" : "bg-white border-slate-200 shadow-2xs"
                        }`}
                      >
                        <div>
                          <span className={`font-bold block ${isHidden ? "text-slate-500 line-through" : "text-slate-900"}`}>
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Bagian: {m.section}</span>
                        </div>

                        <button
                          onClick={async () => {
                            const current = data?.settings?.hiddenMenuItems || [];
                            const updated = isHidden
                              ? current.filter((h: string) => h !== m.href)
                              : [...current, m.href];

                            await fetch("/api/settings/menu-visibility", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ hiddenMenuItems: updated }),
                            });
                            queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                            queryClient.invalidateQueries({ queryKey: ["menu-visibility"] });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            isHidden
                              ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
                              : "bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-300/60"
                          }`}
                        >
                          {isHidden ? "Disembunyikan" : "Tampil"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 8. PENGATURAN METRIK GRAFIK DASHBOARD */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("chartSettings")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Pilihan Metrik Grafik Dashboard
              </div>
              {openPanels.chartSettings ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.chartSettings && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <div>
                  <p className="text-xs text-slate-500">
                    Pilih data metrik yang ingin ditampilkan pada grafik tren utama di halaman Dashboard. Anda dapat mencentang satu atau beberapa metrik sekaligus:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                  {[
                    {
                      id: "laba",
                      title: "Laba Rugi (Profit)",
                      desc: "Grafik fluktuasi laba bersih dari penjualan harian.",
                      color: "text-emerald-700 bg-emerald-50 border-emerald-200",
                      badgeColor: "bg-emerald-500",
                    },
                    {
                      id: "omzet",
                      title: "Total Omzet (Revenue)",
                      desc: "Grafik total omzet/penjualan kotor harian.",
                      color: "text-blue-700 bg-blue-50 border-blue-200",
                      badgeColor: "bg-blue-500",
                    },
                    {
                      id: "qty",
                      title: "Volume Penjualan (Qty)",
                      desc: "Grafik jumlah barang terjual (pcs) harian.",
                      color: "text-purple-700 bg-purple-50 border-purple-200",
                      badgeColor: "bg-purple-500",
                    },
                  ].map((metric) => {
                    const currentMetrics: string[] = data?.settings?.dashboardChartMetrics || ["laba"];
                    const isSelected = currentMetrics.includes(metric.id);

                    return (
                      <div
                        key={metric.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                          isSelected
                            ? "bg-white border-slate-300 shadow-xs ring-1 ring-emerald-500/30"
                            : "bg-slate-50/70 border-slate-200 opacity-70"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${metric.badgeColor}`}></span>
                              {metric.title}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${metric.color}`}>
                              {isSelected ? "Aktif" : "Nonaktif"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">{metric.desc}</p>
                        </div>

                        <button
                          type="button"
                          onClick={async () => {
                            let updated = isSelected
                              ? currentMetrics.filter((m) => m !== metric.id)
                              : [...currentMetrics, metric.id];

                            if (updated.length === 0) {
                              alert("Minimal harus ada 1 metrik grafik yang dipilih!");
                              return;
                            }

                            await fetch("/api/settings/chart-metrics", {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ dashboardChartMetrics: updated }),
                            });
                            queryClient.invalidateQueries({ queryKey: ["settings-full"] });
                            queryClient.invalidateQueries({ queryKey: ["dashboard-chart-metrics"] });
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                              : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                          }`}
                        >
                          {isSelected ? "✓ Ditampilkan di Dashboard" : "+ Tampilkan Metrik Ini"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 9. BACKUP & RESTORE DATA */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              onClick={() => togglePanel("backup")}
              className="w-full p-4 flex items-center justify-between bg-slate-50/80 hover:bg-slate-100/80 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Database className="w-4 h-4 text-indigo-600" />
                Pencadangan & Pemulihan (Backup & Restore)
              </div>
              {openPanels.backup ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {openPanels.backup && (
              <div className="p-5 border-t border-slate-100 space-y-4">
                <p className="text-xs text-slate-500">
                  Unduh cadangan data transaksi atau konfigurasi pengaturan dalam format JSON yang dapat dipulihkan kapan saja.
                </p>

                <div className="flex flex-wrap gap-3">
                  <a
                    href="/api/settings/backup/data"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Backup Data Transaksi
                  </a>
                  <a
                    href="/api/settings/backup/settings"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download Backup Pengaturan & Target
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
