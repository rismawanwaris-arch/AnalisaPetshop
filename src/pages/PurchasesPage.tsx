import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart,
  Building2,
  Calendar,
  Clock,
  Search,
  Receipt,
  FileText,
  ChevronRight,
  Package,
  X,
  ExternalLink,
  DollarSign,
  AlertCircle,
  Truck,
  Upload,
  ArrowUpDown,
  Filter,
  Store,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { formatRupiah, formatNumber, formatDate, daysAgo } from "../lib/format.js";
import { useDateRange, getCurrentMonthRange, getLastMonthRange } from "../context/DateRangeContext.js";

const PurchasesPageContent: React.FC = () => {
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"top-items" | "invoices" | "vendors">("top-items");
  const [sortBy, setSortBy] = useState<"spend" | "qty">("spend");
  const [datePreset, setDatePreset] = useState<"all" | "this-month" | "last-month">("this-month");

  const { fromDate, toDate, setFromDate, setToDate } = useDateRange();

  // Date Preset Handler
  const handleDatePreset = (preset: "all" | "this-month" | "last-month") => {
    setDatePreset(preset);
    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "this-month") {
      const range = getCurrentMonthRange();
      setFromDate(range.from);
      setToDate(range.to);
    } else if (preset === "last-month") {
      const range = getLastMonthRange();
      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  // 1. Fetch Outlets for Dropdown
  const { data: rawOutlets } = useQuery({
    queryKey: ["outlets"],
    queryFn: async () => {
      const res = await fetch("/api/outlets");
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : (json?.outlets || []);
    },
  });

  const outletList: any[] = Array.isArray(rawOutlets)
    ? rawOutlets
    : Array.isArray((rawOutlets as any)?.outlets)
    ? (rawOutlets as any).outlets
    : [];

  // 2. Fetch Vendors summary
  const { data: rawVendors, isLoading: loadingVendors } = useQuery({
    queryKey: ["purchases", "vendors"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/vendors");
      if (!res.ok) throw new Error("Gagal mengambil data vendor");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });
  const vendorList: any[] = Array.isArray(rawVendors) ? rawVendors : [];

  // 3. Fetch KPI Summary Metrics (Total Belanja, Total Nota, Suplier Aktif, Total Qty, Varian)
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ["purchases", "summary", selectedVendorId, selectedOutletId, fromDate, toDate, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendorId) params.append("vendorId", String(selectedVendorId));
      if (selectedOutletId) params.append("outletId", String(selectedOutletId));
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/purchases/summary?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil ringkasan belanja");
      return res.json();
    },
  });

  // 4. Fetch Top Items (Item Terbanyak Dibeli)
  const { data: rawTopItems, isLoading: loadingTopItems } = useQuery({
    queryKey: ["purchases", "top-items", selectedVendorId, selectedOutletId, fromDate, toDate, searchQuery, sortBy],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendorId) params.append("vendorId", String(selectedVendorId));
      if (selectedOutletId) params.append("outletId", String(selectedOutletId));
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (searchQuery) params.append("search", searchQuery);
      params.append("sortBy", sortBy);
      params.append("limit", "100");

      const res = await fetch(`/api/purchases/top-items?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data item terbanyak dibeli");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });
  const topItemList: any[] = Array.isArray(rawTopItems) ? rawTopItems : [];

  // 5. Fetch Invoices for selected filters
  const { data: rawInvoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["purchases", "invoices", selectedVendorId, selectedOutletId, fromDate, toDate, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendorId) params.append("vendorId", String(selectedVendorId));
      if (selectedOutletId) params.append("outletId", String(selectedOutletId));
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/purchases/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data faktur");
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    },
  });
  const invoiceList: any[] = Array.isArray(rawInvoices) ? rawInvoices : [];

  // 6. Fetch Invoice detail if modal opened
  const { data: invoiceDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ["purchases", "invoice", selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) return null;
      const res = await fetch(`/api/purchases/invoices/${selectedInvoiceId}`);
      if (!res.ok) throw new Error("Gagal mengambil detail faktur");
      return res.json();
    },
    enabled: !!selectedInvoiceId,
  });

  const filteredVendors = vendorList.filter((v: any) =>
    (v?.name || "").toLowerCase().includes((searchQuery || "").toLowerCase())
  );

  // Compute footer totals for Top Items
  const totalTopQty = topItemList.reduce((acc: number, it: any) => acc + (Number(it?.totalQty) || 0), 0);
  const totalTopSpend = topItemList.reduce((acc: number, it: any) => acc + (Number(it?.totalSpend) || 0), 0);

  const invoiceDetailItems = Array.isArray(invoiceDetail?.items) ? invoiceDetail.items : [];

  return (
    <div className="space-y-5">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Pembelian & Suplier
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Analisis rekapitulasi belanja masuk per vendor / suplier serta pemeriksaan nota faktur pembelian barang.
          </p>
        </div>

        <Link
          to="/import"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-sm transition-all cursor-pointer self-start sm:self-auto shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>Import Nota Pembelian</span>
        </Link>
      </div>

      {/* 2. Filter Bar Box (Matching Gambar 1) */}
      <div className="bg-white dark:bg-slate-900/95 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-colors">
        {/* Preset Pills */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDatePreset("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              datePreset === "all"
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Semua Data
          </button>
          <button
            onClick={() => handleDatePreset("this-month")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              datePreset === "this-month"
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => handleDatePreset("last-month")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              datePreset === "last-month"
                ? "bg-slate-900 text-white dark:bg-slate-800 dark:text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Bulan Lalu
          </button>
        </div>

        {/* 5 Input Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Dari Tanggal */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Dari Tanggal
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setDatePreset("all");
              }}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Sampai Tanggal */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Sampai Tanggal
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setDatePreset("all");
              }}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Pilih Suplier / Vendor */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Pilih Suplier / Vendor
            </label>
            <select
              value={selectedVendorId || ""}
              onChange={(e) => setSelectedVendorId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Semua Suplier ({vendorList.length})</option>
              {vendorList.map((v: any) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.invoiceCount} nota)
                </option>
              ))}
            </select>
          </div>

          {/* Cabang / Gudang Penerima */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Cabang / Gudang Penerima
            </label>
            <select
              value={selectedOutletId || ""}
              onChange={(e) => setSelectedOutletId(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">Semua Lokasi ({outletList.length})</option>
              {outletList.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pencarian Cepat */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
              Pencarian Cepat
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="No Faktur / Nama Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. 4 KPI Stat Cards (Matching Gambar 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Belanja Masuk */}
        <div className="bg-white dark:bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Belanja Masuk
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-500 dark:text-emerald-400 mt-1.5 tracking-tight truncate">
            {formatRupiah(summary?.totalBelanja || 0)}
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Nilai kotor seluruh faktur pembelian
          </span>
        </div>

        {/* Card 2: Total Nota / Faktur */}
        <div className="bg-white dark:bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Nota / Faktur
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {formatNumber(summary?.totalNota || 0)}{" "}
            <span className="text-xs font-medium text-slate-400">nota</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Transaksi nota pembelian masuk
          </span>
        </div>

        {/* Card 3: Suplier Aktif */}
        <div className="bg-white dark:bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Suplier Aktif
          </span>
          <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5 tracking-tight">
            {summary?.suplierAktif || 0}{" "}
            <span className="text-xs font-medium text-slate-400">suplier</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            Vendor yang menyuplai barang
          </span>
        </div>

        {/* Card 4: Total Kuantitas Masuk */}
        <div className="bg-white dark:bg-slate-900/95 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs transition-colors">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Kuantitas Masuk
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 tracking-tight">
            {formatNumber(summary?.totalKuantitas || 0)}{" "}
            <span className="text-xs font-medium text-slate-400">pcs</span>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
            {summary?.totalVarian || 0} varian barang
          </span>
        </div>
      </div>

      {/* 4. Tabs Navigation (Matching Gambar 1) */}
      <div className="border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 sm:gap-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("vendors")}
          className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "vendors"
              ? "border-sky-500 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span>📑</span>
          <span>Rekap per Suplier ({vendorList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "invoices"
              ? "border-sky-500 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span>🧾</span>
          <span>Daftar Nota / Faktur ({invoiceList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("top-items")}
          className={`flex items-center gap-2 py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "top-items"
              ? "border-sky-500 text-sky-600 dark:text-sky-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <span>📦</span>
          <span>Item Terbanyak Dibeli ({topItemList.length})</span>
        </button>
      </div>

      {/* 5. TAB CONTENT */}

      {/* TAB 3: ITEM TERBANYAK DIBELI (Matching Gambar 1) */}
      {activeTab === "top-items" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Peringkat Barang Pembelian Teratas ({topItemList.length} Barang)
            </span>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs text-slate-400 font-medium">Urutkan:</span>
              <button
                onClick={() => setSortBy(sortBy === "spend" ? "qty" : "spend")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <span>{sortBy === "spend" ? "Total Belanja (Rp)" : "Total Qty (Pcs)"}</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-3 text-center w-14">Rank</th>
                    <th className="py-3 px-3 w-28">Kode Item</th>
                    <th className="py-3 px-4">Nama Barang / SKU</th>
                    <th className="py-3 px-4">Suplier Utama</th>
                    <th className="py-3 px-4 text-right">Total Qty Dibeli</th>
                    <th className="py-3 px-4 text-right">Total Belanja (Rp)</th>
                    <th className="py-3 px-4 text-right">Harga Rata-Rata Beli</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {loadingTopItems ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Memuat peringkat item terbanyak dibeli...
                      </td>
                    </tr>
                  ) : topItemList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada data pembelian yang cocok dengan filter yang dipilih.
                      </td>
                    </tr>
                  ) : (
                    topItemList.map((it: any) => (
                      <tr
                        key={it.itemCode}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 text-center font-bold">
                          {it.rank <= 3 ? (
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${
                                it.rank === 1
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
                                  : it.rank === 2
                                  ? "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                                  : "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400"
                              }`}
                            >
                              {it.rank}
                            </span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">{it.rank}</span>
                          )}
                        </td>

                        {/* Kode Item */}
                        <td className="py-3 px-3 font-mono font-medium text-slate-600 dark:text-slate-400">
                          {it.itemCode}
                        </td>

                        {/* Nama Barang / SKU */}
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {it.itemName}
                        </td>

                        {/* Suplier Utama */}
                        <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-300">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            {it.supplierUtama}
                          </span>
                        </td>

                        {/* Total Qty Dibeli */}
                        <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-200">
                          {formatNumber(it.totalQty)}
                        </td>

                        {/* Total Belanja (Rp) */}
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(it.totalSpend)}
                        </td>

                        {/* Harga Rata-Rata Beli */}
                        <td className="py-3 px-4 text-right font-medium text-slate-500 dark:text-slate-400">
                          {formatRupiah(it.avgPrice)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>

                {/* Footer Total Row */}
                {topItemList.length > 0 && (
                  <tfoot className="bg-slate-50/90 dark:bg-slate-950/80 border-t-2 border-slate-200 dark:border-slate-800 text-xs font-bold">
                    <tr>
                      <td colSpan={4} className="py-3 px-4 text-slate-700 dark:text-slate-300 uppercase tracking-wider text-right">
                        Total Seluruh Barang Terdaftar:
                      </td>
                      <td className="py-3 px-4 text-right text-slate-900 dark:text-white font-black">
                        {formatNumber(totalTopQty)} pcs
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400 font-black">
                        {formatRupiah(totalTopSpend)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-medium">
                        -
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR NOTA / FAKTUR */}
      {activeTab === "invoices" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daftar Nota Masuk ({invoiceList.length} Faktur)
            </span>
          </div>

          <div className="bg-white dark:bg-slate-900/95 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">No. Faktur</th>
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-4">Gudang / Cabang</th>
                    <th className="py-3 px-4 text-center">Item</th>
                    <th className="py-3 px-4 text-right">Total Nota</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {loadingInvoices ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Memuat nota pembelian...
                      </td>
                    </tr>
                  ) : invoiceList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                        Tidak ada nota pembelian ditemukan.
                      </td>
                    </tr>
                  ) : (
                    invoiceList.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {inv.noFaktur}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(inv.tanggal)}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {inv.vendor?.name}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                          {inv.outlet?.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            {(Array.isArray(inv.items) ? inv.items : []).length} SKU
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {formatRupiah(inv.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-[11px] transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rincian</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: REKAP PER SUPLIER */}
      {activeTab === "vendors" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Daftar Supplier Rekanan ({filteredVendors.length} Rekanan)
            </span>
            {selectedVendorId && (
              <button
                onClick={() => setSelectedVendorId(null)}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                Reset Filter (Lihat Semua)
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {loadingVendors ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Memuat data supplier...
              </div>
            ) : (
              filteredVendors.map((v: any) => {
                const isSelected = selectedVendorId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVendorId(isSelected ? null : v.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 ring-1 ring-emerald-500 shadow-sm"
                        : "bg-white dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                          {v.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <Receipt className="w-3.5 h-3.5 text-slate-400" />
                            {v.invoiceCount} Nota
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 font-medium">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                            {v.itemCount} Variasi SKU
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? "text-emerald-600 rotate-90" : "text-slate-400"
                        }`}
                      />
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Total Belanja
                        </span>
                        <span className="font-black text-slate-900 dark:text-white text-sm">
                          {formatRupiah(v.totalAmount)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Terakhir Order
                        </span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 px-2 py-0.5 rounded-md inline-block text-[11px]">
                          {v.lastOrderDate ? `${formatDate(v.lastOrderDate)}` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 6. Invoice Detail Modal */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Rincian Faktur: {invoiceDetail?.noFaktur}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    ID Transaksi #{invoiceDetail?.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            {loadingDetail ? (
              <div className="p-12 text-center text-xs text-slate-400">Mengambil rincian nota...</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Invoice Meta */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm mt-0.5 block">{invoiceDetail?.vendor?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Tanggal Faktur</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{formatDate(invoiceDetail?.tanggal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Penerima Gudang</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">{invoiceDetail?.outlet?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Nilai Nota</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-base mt-0.5 block">{formatRupiah(invoiceDetail?.total)}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                    Barang yang Dipesan ({invoiceDetailItems.length} Macam Produk)
                  </h4>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950/70 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Kode & Nama Barang</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Harga Beli Satuan</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {invoiceDetailItems.map((it: any) => (
                          <tr key={it.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{it.itemName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{it.itemCode} • Satuan: {it.satuan}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-700 dark:text-slate-300">
                              {formatNumber(it.qty)} {it.satuan}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400 font-medium">
                              {formatRupiah(it.harga)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 dark:text-white">
                              {formatRupiah(it.subtotalItem)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="px-4 py-2 bg-slate-900 text-white dark:bg-slate-800 font-bold text-xs rounded-xl hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

class PurchasesErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("PurchasesPage Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">Kendala Tampilan Pembelian</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {this.state.error?.message || "Terjadi kesalahan saat memuat tampilan data pembelian."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer"
          >
            Muat Ulang Halaman
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const PurchasesPage: React.FC = () => {
  return (
    <PurchasesErrorBoundary>
      <PurchasesPageContent />
    </PurchasesErrorBoundary>
  );
};
