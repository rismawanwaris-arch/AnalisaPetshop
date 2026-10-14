import React, { useState } from "react";
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
} from "lucide-react";
import { formatRupiah, formatNumber, formatDate, daysAgo } from "../lib/format.js";
import { useDateRange } from "../context/DateRangeContext.js";
import { DateRangePicker } from "../components/DateRangePicker.js";

export const PurchasesPage: React.FC = () => {
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [searchVendor, setSearchVendor] = useState<string>("");
  const { fromDate, toDate, setFromDate, setToDate, setPreset } = useDateRange();

  // 1. Fetch Vendors summary
  const { data: vendors, isLoading: loadingVendors } = useQuery({
    queryKey: ["purchases", "vendors"],
    queryFn: async () => {
      const res = await fetch("/api/purchases/vendors");
      if (!res.ok) throw new Error("Gagal mengambil data vendor");
      return res.json();
    },
  });

  // 2. Fetch Invoices for selected vendor (or all) within date range
  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["purchases", "invoices", selectedVendorId, fromDate, toDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVendorId) params.append("vendorId", String(selectedVendorId));
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/purchases/invoices?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal mengambil data faktur");
      return res.json();
    },
  });

  // 3. Fetch Invoice detail if modal opened
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

  const filteredVendors = vendors?.filter((v: any) =>
    v.name.toLowerCase().includes(searchVendor.toLowerCase())
  );

  const totalAllProcurement = vendors?.reduce((acc: number, v: any) => acc + Number(v.totalAmount), 0) || 0;
  const totalAllInvoices = vendors?.reduce((acc: number, v: any) => acc + Number(v.invoiceCount), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Pengadaan</span>
          <div className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            {formatRupiah(totalAllProcurement)}
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Seluruh faktur masuk</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Supplier Rekanan</span>
          <div className="text-2xl font-black text-emerald-600 mt-2 tracking-tight">
            {vendors?.length || 0} <span className="text-sm font-normal text-slate-400">Vendor</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Aktif menyuplai petshop</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Faktur Order</span>
          <div className="text-2xl font-black text-blue-600 mt-2 tracking-tight">
            {totalAllInvoices} <span className="text-sm font-normal text-slate-400">Nota</span>
          </div>
          <span className="text-xs text-slate-400 mt-1 block">Tercatat di Gudang Padasuka</span>
        </div>
      </div>

      {/* Action / Search Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            Tracking Pembelian & Nota Supplier
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Klik nama supplier untuk memfilter nota, atau klik tombol <b>Rincian</b> pada nota untuk melihat daftar barang yang dibeli
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
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama supplier..."
              value={searchVendor}
              onChange={(e) => setSearchVendor(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl pl-9 pr-3 py-2 w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50"
            />
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Supplier Cards) & Right Column (Faktur / Orderan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Supplier List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Daftar Supplier ({filteredVendors?.length || 0})
            </span>
            {selectedVendorId && (
              <button
                onClick={() => setSelectedVendorId(null)}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Reset Filter (Lihat Semua)
              </button>
            )}
          </div>

          {loadingVendors ? (
            <div className="p-8 text-center text-xs text-slate-400">Memuat data supplier...</div>
          ) : (
            <div className="space-y-2.5">
              {filteredVendors?.map((v: any) => {
                const isSelected = selectedVendorId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVendorId(isSelected ? null : v.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-emerald-50/70 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                        : "bg-white border-slate-200/80 hover:border-slate-300 hover:shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          {v.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
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

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Total Belanja
                        </span>
                        <span className="font-extrabold text-slate-900">{formatRupiah(v.totalAmount)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Terakhir Order
                        </span>
                        <span className="font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                          {v.lastOrderDate ? `${formatDate(v.lastOrderDate)} (${daysAgo(v.lastOrderDate)})` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Invoices List */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {selectedVendorId
                ? `Nota dari: ${vendors?.find((x: any) => x.id === selectedVendorId)?.name}`
                : "Semua Nota Orderan Pembelian"}
            </span>
            <span className="text-xs text-slate-400 font-medium">{invoices?.length || 0} Faktur Ditemukan</span>
          </div>

          {loadingInvoices ? (
            <div className="p-8 text-center text-xs text-slate-400">Memuat nota pembelian...</div>
          ) : invoices?.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs">
              Tidak ada nota pembelian ditemukan.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">No. Faktur</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4 text-center">Item</th>
                      <th className="py-3 px-4 text-right">Total Nota</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices?.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.noFaktur}
                          <span className="block font-sans text-[10px] text-slate-400 font-normal">{inv.outlet?.name}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap font-medium">
                          {formatDate(inv.tanggal)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-700">
                          {inv.vendor?.name}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
                            {inv.items?.length || 0} SKU
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                          {formatRupiah(inv.total)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoiceId(inv.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors border border-emerald-200/60 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Rincian
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal / Drawer: Nota per Orderan */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Rincian Nota Orderan Pembelian
                </span>
                <h3 className="text-base font-extrabold text-slate-900 font-mono mt-0.5">
                  {invoiceDetail?.noFaktur || "Memuat..."}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Supplier</span>
                    <span className="font-bold text-slate-900 text-sm mt-0.5 block">{invoiceDetail?.vendor?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Tanggal Faktur</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{formatDate(invoiceDetail?.tanggal)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Penerima Gudang</span>
                    <span className="font-semibold text-slate-800 mt-0.5 block">{invoiceDetail?.outlet?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Nilai Nota</span>
                    <span className="font-black text-emerald-700 text-base mt-0.5 block">{formatRupiah(invoiceDetail?.total)}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Barang yang Dipesan ({invoiceDetail?.items?.length || 0} Macam Produk)
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Kode & Nama Barang</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Harga Beli Satuan</th>
                          <th className="py-2.5 px-3 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoiceDetail?.items?.map((it: any) => (
                          <tr key={it.id} className="hover:bg-slate-50/60">
                            <td className="py-2.5 px-3">
                              <span className="font-bold text-slate-800 block">{it.itemName}</span>
                              <span className="text-[10px] text-slate-400 font-mono">{it.itemCode} • Satuan: {it.satuan}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-700">
                              {formatNumber(it.qty)} {it.satuan}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600 font-medium">
                              {formatRupiah(it.harga)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
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
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
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
