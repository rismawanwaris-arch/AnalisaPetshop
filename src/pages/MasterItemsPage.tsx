import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Layers,
  DollarSign,
  Tag,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { formatRupiah, formatNumber } from "../lib/format.js";

interface MasterItemForm {
  id?: number;
  code: string;
  name: string;
  barcode: string;
  itemGroup: string;
  unitBase: string;
  unitPurchase: string;
  lastPurchasePrice: string | number;
  avgHpp: string | number;
  priceRetail: string | number;
  priceAgent: string | number;
  priceOnline: string | number;
  priceRepack: string | number;
  priceBranch: string | number;
  status: string;
}

const initialForm: MasterItemForm = {
  code: "",
  name: "",
  barcode: "",
  itemGroup: "CAT ADULT DRY",
  unitBase: "PCS",
  unitPurchase: "PCS",
  lastPurchasePrice: 0,
  avgHpp: 0,
  priceRetail: 0,
  priceAgent: 0,
  priceOnline: 0,
  priceRepack: 0,
  priceBranch: 0,
  status: "Aktif",
};

export const MasterItemsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [page, setPage] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItemForm | null>(null);
  const [formData, setFormData] = useState<MasterItemForm>(initialForm);
  const [formError, setFormError] = useState("");

  // Upload Excel State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/master-items/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengimpor file Excel");
      return data;
    },
    onSuccess: (data) => {
      setUploadStatus({ type: "success", text: data.message });
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["master-items"] });
    },
    onError: (err: any) => {
      setUploadStatus({ type: "error", text: err.message || "Gagal mengimpor file" });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["master-items", page, search, selectedGroup],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (search) params.append("search", search);
      if (selectedGroup) params.append("group", selectedGroup);
      const res = await fetch(`/api/master-items?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil master item");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (item: MasterItemForm) => {
      const url = item.id ? `/api/master-items/${item.id}` : "/api/master-items";
      const method = item.id ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan barang");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-items"] });
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData(initialForm);
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Gagal menyimpan barang");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/master-items/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus barang");
      return data;
    },
    onSuccess: (data) => {
      alert(data.message || "Barang berhasil dihapus!");
      queryClient.invalidateQueries({ queryKey: ["master-items"] });
    },
    onError: (err: any) => {
      alert(err.message || "Gagal menghapus barang");
    },
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(initialForm);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      id: item.id,
      code: item.code || "",
      name: item.name || "",
      barcode: item.barcode || "",
      itemGroup: item.itemGroup || "",
      unitBase: item.unitBase || "PCS",
      unitPurchase: item.unitPurchase || "PCS",
      lastPurchasePrice: item.lastPurchasePrice || 0,
      avgHpp: item.avgHpp || 0,
      priceRetail: item.priceRetail || 0,
      priceAgent: item.priceAgent || 0,
      priceOnline: item.priceOnline || 0,
      priceRepack: item.priceRepack || 0,
      priceBranch: item.priceBranch || 0,
      status: item.status || "Aktif",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = (item: any) => {
    if (confirm(`Apakah Anda yakin ingin menghapus barang "${item.name}" (${item.code})?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Kelola Master Katalog Item
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap SKU produk, edit data barang, ubah harga zona, dan tambah produk baru
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/api/master-items/template"
            download="template_master_item.xlsx"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer shrink-0"
            title="Download Template Format Excel Master Item"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Download Template
          </a>

          <button
            onClick={() => {
              setUploadFile(null);
              setUploadStatus(null);
              setIsUploadModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl border border-blue-200 shadow-2xs transition-colors cursor-pointer shrink-0"
          >
            <Upload className="w-4 h-4 text-blue-600" />
            Impor / Update Excel
          </button>

          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Tambah Barang Baru
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedGroup}
            onChange={(e) => {
              setSelectedGroup(e.target.value);
              setPage(1);
            }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 font-semibold focus:outline-none"
          >
            <option value="">Semua Kategori Grup</option>
            {data?.groups?.map((g: string) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari kode, barcode, nama barang..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-200 rounded-lg pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Memuat katalog barang...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3">Kode & Barcode</th>
                    <th className="py-3 px-4">Nama Barang</th>
                    <th className="py-3 px-3">Grup</th>
                    <th className="py-3 px-3 text-right">Beli Terakhir</th>
                    <th className="py-3 px-3 text-right">HPP Rata2</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-800 bg-emerald-50/40">Harga Retail</th>
                    <th className="py-3 px-3 text-right">Harga Agen</th>
                    <th className="py-3 px-3 text-right">Harga Cabang</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.items?.map((it: any) => (
                    <tr key={it.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        {it.code}
                        {it.barcode && <span className="block text-[10px] text-slate-400 font-mono">{it.barcode}</span>}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {it.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700">
                          {it.itemGroup || "-"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatRupiah(it.lastPurchasePrice)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                        {formatRupiah(it.avgHpp)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-700 bg-emerald-50/20">
                        {formatRupiah(it.priceRetail)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatRupiah(it.priceAgent)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {formatRupiah(it.priceBranch)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            it.status === "Aktif"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {it.status || "Aktif"}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            title="Edit Barang"
                            onClick={() => openEditModal(it)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            title="Hapus Barang"
                            onClick={() => handleDelete(it)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Halaman {page} dari {data?.totalPages || 1} ({formatNumber(data?.total)} total produk)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={page >= (data?.totalPages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add / Edit Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                  {editingItem ? "Edit Data Barang" : "Tambah Barang Baru"}
                </span>
                <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                  {editingItem ? editingItem.name : "Input Master SKU"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Item (SKU) *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="Contoh: 001501"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Barcode (Opsional)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Contoh: 8993374326970"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Barang *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: BOLT IKAN 800 GR"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori / Grup</label>
                  <input
                    type="text"
                    value={formData.itemGroup}
                    onChange={(e) => setFormData({ ...formData, itemGroup: e.target.value })}
                    placeholder="Contoh: CAT ADULT DRY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Satuan Dasar</label>
                  <input
                    type="text"
                    value={formData.unitBase}
                    onChange={(e) => setFormData({ ...formData, unitBase: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 uppercase"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Barang</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900 block mb-3 uppercase tracking-wider text-[11px]">
                  Informasi Harga & Zonasi (Rp)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-500 block mb-1">Beli Terakhir</label>
                    <input
                      type="number"
                      value={formData.lastPurchasePrice}
                      onChange={(e) => setFormData({ ...formData, lastPurchasePrice: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">HPP Rata-rata</label>
                    <input
                      type="number"
                      value={formData.avgHpp}
                      onChange={(e) => setFormData({ ...formData, avgHpp: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-bold"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-emerald-700 font-bold block mb-1">Harga Retail (0) *</label>
                    <input
                      type="number"
                      value={formData.priceRetail}
                      onChange={(e) => setFormData({ ...formData, priceRetail: e.target.value })}
                      className="w-full bg-emerald-50/50 border border-emerald-300 rounded-lg px-3 py-1.5 font-black text-emerald-800"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Harga Agen (1)</label>
                    <input
                      type="number"
                      value={formData.priceAgent}
                      onChange={(e) => setFormData({ ...formData, priceAgent: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Harga Online (2)</label>
                    <input
                      type="number"
                      value={formData.priceOnline}
                      onChange={(e) => setFormData({ ...formData, priceOnline: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 block mb-1">Harga Cabang (5)</label>
                    <input
                      type="number"
                      value={formData.priceBranch}
                      onChange={(e) => setFormData({ ...formData, priceBranch: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate(formData)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Barang"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Upload Excel */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Impor / Update Master Item via Excel
                </h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-600 space-y-1.5 bg-blue-50/60 p-3.5 rounded-xl border border-blue-200/60">
                <p className="font-bold text-blue-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  Sistem Pembaruan Otomatis:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 text-[11px]">
                  <li>Barang dengan <strong>Kode Item</strong> yang sudah ada akan <strong>otomatis di-update</strong> harga, HPP, barcode, dan namanya sesuai file Excel.</li>
                  <li>Barang dengan Kode Item baru akan ditambahkan ke katalog.</li>
                  <li>Aktivitas pembaruan akan otomatis dicatat di <strong>Log Aktivitas</strong> lengkap dengan jumlah baris dan waktu update.</li>
                </ul>
              </div>

              {uploadStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                    uploadStatus.type === "success"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {uploadStatus.type === "success" ? (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>{uploadStatus.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilih File Excel (.xlsx / .xls)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUploadFile(f);
                    setUploadStatus(null);
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-200 rounded-xl p-2 bg-slate-50"
                />
                {uploadFile && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    File terpilih: <strong>{uploadFile.name}</strong> ({(uploadFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-between items-center text-xs">
                <a
                  href="/api/master-items/template"
                  download="template_master_item.xlsx"
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline inline-flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh Template Excel
                </a>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={!uploadFile || uploadMutation.isPending}
                onClick={() => uploadFile && uploadMutation.mutate(uploadFile)}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses Excel...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload & Sinkronkan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
