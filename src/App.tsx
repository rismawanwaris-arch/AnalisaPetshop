import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { Layout } from "./components/Layout.js";
import { LoginPage } from "./pages/LoginPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { PurchasesPage } from "./pages/PurchasesPage.js";
import { SalesPage } from "./pages/SalesPage.js";
import { TargetReportPage } from "./pages/TargetReportPage.js";
import { PointsPage } from "./pages/PointsPage.js";
import { MasterItemsPage } from "./pages/MasterItemsPage.js";
import { ItemCategoriesPage } from "./pages/ItemCategoriesPage.js";
import { OutletsPage } from "./pages/OutletsPage.js";
import { OutletDetailPage } from "./pages/OutletDetailPage.js";
import { EmployeesPage } from "./pages/EmployeesPage.js";
import { DataExplorerPage } from "./pages/DataExplorerPage.js";
import { ActivityLogPage } from "./pages/ActivityLogPage.js";
import { ImportPage } from "./pages/ImportPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { DateRangeProvider } from "./context/DateRangeContext.js";
import { Loader2 } from "lucide-react";

// Protected Route Component
const ProtectedApp: React.FC = () => {
  const { user, isLoading, isMaster } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Memverifikasi Sesi Masuk...
        </span>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <DateRangeProvider>
      <Layout>
        <Routes>
          {/* Cabang Bandung */}
          <Route path="/" element={<DashboardPage />} />
          <Route path="/target" element={<TargetReportPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/points" element={<PointsPage />} />

          {/* Dimensi Analisis */}
          <Route path="/items" element={<MasterItemsPage />} />
          <Route path="/items/categories" element={<ItemCategoriesPage />} />
          <Route path="/outlets" element={<OutletsPage />} />
          <Route path="/outlets/:id" element={<OutletDetailPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/transactions" element={<SalesPage />} />

          {/* Manajemen Data & Sistem */}
          <Route path="/import" element={<ImportPage />} />
          <Route path="/imports" element={<ImportPage />} />
          <Route
            path="/analisa-data"
            element={isMaster ? <DataExplorerPage /> : <Navigate to="/" replace />}
          />
          <Route path="/log" element={<ActivityLogPage />} />

          {/* Pengaturan: Hanya Tingkat Master */}
          <Route
            path="/settings"
            element={isMaster ? <SettingsPage /> : <Navigate to="/" replace />}
          />

          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </DateRangeProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProtectedApp />
    </AuthProvider>
  );
};

export default App;
