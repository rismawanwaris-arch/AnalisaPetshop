import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { Layout } from "./components/Layout.js";
import { LoginPage } from "./pages/LoginPage.js";
import { DateRangeProvider } from "./context/DateRangeContext.js";
import { ThemeProvider } from "./context/ThemeContext.js";
import { Loader2 } from "lucide-react";

const DashboardPage = lazy(() => import("./pages/DashboardPage.js").then((m) => ({ default: m.DashboardPage })));
const PurchasesPage = lazy(() => import("./pages/PurchasesPage.js").then((m) => ({ default: m.PurchasesPage })));
const SalesPage = lazy(() => import("./pages/SalesPage.js").then((m) => ({ default: m.SalesPage })));
const TargetReportPage = lazy(() => import("./pages/TargetReportPage.js").then((m) => ({ default: m.TargetReportPage })));
const PointsPage = lazy(() => import("./pages/PointsPage.js").then((m) => ({ default: m.PointsPage })));
const PublicPointsPage = lazy(() => import("./pages/PublicPointsPage.js").then((m) => ({ default: m.PublicPointsPage })));
const MasterItemsPage = lazy(() => import("./pages/MasterItemsPage.js").then((m) => ({ default: m.MasterItemsPage })));
const ItemCategoriesPage = lazy(() => import("./pages/ItemCategoriesPage.js").then((m) => ({ default: m.ItemCategoriesPage })));
const OutletsPage = lazy(() => import("./pages/OutletsPage.js").then((m) => ({ default: m.OutletsPage })));
const OutletDetailPage = lazy(() => import("./pages/OutletDetailPage.js").then((m) => ({ default: m.OutletDetailPage })));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage.js").then((m) => ({ default: m.EmployeesPage })));
const DataExplorerPage = lazy(() => import("./pages/DataExplorerPage.js").then((m) => ({ default: m.DataExplorerPage })));
const ActivityLogPage = lazy(() => import("./pages/ActivityLogPage.js").then((m) => ({ default: m.ActivityLogPage })));
const ImportPage = lazy(() => import("./pages/ImportPage.js").then((m) => ({ default: m.ImportPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage.js").then((m) => ({ default: m.SettingsPage })));

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[320px] w-full">
    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
  </div>
);

// Main App Router with Public & Protected Routes
const MainApp: React.FC = () => {
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

  return (
    <DateRangeProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Rute Publik: Papan Poin tanpa perlu login / akun */}
          <Route path="/papan-poin" element={<PublicPointsPage />} />

          {/* Jika belum login */}
          {!user ? (
            <>
              <Route path="/points" element={<PublicPointsPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            /* Jika sudah login */
            <Route
              path="*"
              element={
                <Layout>
                  <Suspense fallback={<PageLoader />}>
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
                  </Suspense>
                </Layout>
              }
            />
          )}
        </Routes>
      </Suspense>
    </DateRangeProvider>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
