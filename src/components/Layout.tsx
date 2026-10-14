import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Award,
  Package,
  Layers,
  Store,
  Users,
  Receipt,
  Upload,
  Search,
  FileText,
  Settings,
  Building2,
  LogOut,
  Shield,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.js";
import { ChangePasswordModal } from "./ChangePasswordModal.js";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  name: string;
  href: string;
  icon: any;
  badge?: string;
  masterOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, logout, isMaster } = useAuth();

  const { data: menuData } = useQuery({
    queryKey: ["menu-visibility"],
    queryFn: async () => {
      const res = await fetch("/api/settings/menu-visibility");
      if (!res.ok) return { hiddenMenuItems: [] };
      return res.json();
    },
  });

  const hiddenMenuItems: string[] = menuData?.hiddenMenuItems || [];

  // Navigation structure
  const sections: NavSection[] = [
    {
      title: "Cabang Bandung",
      items: [
        { name: "Dashboard", href: "/", icon: LayoutDashboard },
        { name: "Target Harian", href: "/target", icon: TrendingUp },
        { name: "Monitoring Pembelian", href: "/purchases", icon: ShoppingCart, badge: "Supplier" },
        { name: "Poin Penjualan", href: "/points", icon: Award },
      ],
    },
    {
      title: "Dimensi Analisis",
      items: [
        { name: "Kategori Item", href: "/items/categories", icon: Layers },
        { name: "Performa Outlet", href: "/outlets", icon: Store },
        { name: "Pegawai & Staff", href: "/employees", icon: Users },
        { name: "Daftar Transaksi", href: "/transactions", icon: Receipt },
      ],
    },
    {
      title: "Manajemen Data & Sistem",
      items: [
        { name: "Master Item", href: "/items", icon: Package },
        { name: "Import & Batch", href: "/import", icon: Upload },
        { name: "Analisa Data", href: "/analisa-data", icon: Search },
        { name: "Log Aktivitas", href: "/log", icon: FileText },
        { name: "Pengaturan", href: "/settings", icon: Settings, badge: "Master", masterOnly: true },
      ],
    },
  ];

  // Filter items:
  // 1. Pengaturan is ONLY visible for master role.
  // 2. Other items respect hiddenMenuItems.
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.masterOnly && !isMaster) return false;
        if (item.href === "/settings") return isMaster;
        return !hiddenMenuItems.includes(item.href);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50/75 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar - Pinned height, scrollable menu */}
      <aside className="w-full md:w-64 h-auto md:h-screen bg-slate-900 text-slate-300 flex-shrink-0 flex flex-col justify-between border-r border-slate-800 select-none z-30">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Brand Header */}
          <div className="h-16 flex-shrink-0 flex items-center px-5 bg-slate-950/80 border-b border-slate-800/80 gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <span className="text-lg">🐾</span>
            </div>
            <div className="min-w-0">
              <span className="text-white font-bold tracking-tight text-sm truncate block leading-tight">
                Analisa Petshop
              </span>
              <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Cabang & Gudang
              </span>
            </div>
          </div>

          {/* Navigation Sections */}
          <nav className="p-3.5 space-y-5 overflow-y-auto flex-1 overscroll-contain">
            {visibleSections.map((section, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === "/"
                        ? location.pathname === "/"
                        : location.pathname === item.href ||
                          (item.href !== "/" &&
                            location.pathname.startsWith(item.href) &&
                            (item.href !== "/items" || location.pathname === "/items"));

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          isActive
                            ? "bg-emerald-600 text-white shadow-xs shadow-emerald-900/50"
                            : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                              item.masterOnly
                                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                : isActive
                                ? "bg-emerald-700/80 text-emerald-100"
                                : "bg-slate-800 text-slate-400 border border-slate-700/60"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User Profile & Role Footer in Sidebar */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-xs text-slate-400 flex-shrink-0">
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                  isMaster
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {isMaster ? "👑" : "🛡️"}
              </div>
              <div className="min-w-0">
                <span className="text-white font-bold text-xs truncate block leading-tight">
                  {user?.displayName || user?.username || "Pengguna"}
                </span>
                <span className="text-[10px] text-slate-400 capitalize block truncate">
                  Level: <span className={isMaster ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>{user?.role || "Staff"}</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                title="Ganti Password Akun"
                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => logout()}
                title="Keluar / Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Scrollable independently */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-16 flex-shrink-0 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 backdrop-blur-md bg-white/95">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sistem Manajemen Analisis & Pembelian Petshop
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Wilayah Bandung: Padasuka</span>
            </div>

            <div className="hidden sm:block h-4 w-px bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="text-right hidden sm:block mr-1">
                <span className="font-bold text-slate-800 block text-xs leading-none">
                  {user?.displayName || user?.username}
                </span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {isMaster ? "👑 Tingkat Master" : "🛡️ Tingkat Admin"}
                </span>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                title="Ganti Password Akun Anda"
              >
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Ganti Password</span>
              </button>
              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100/80 border border-red-200/60 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};
