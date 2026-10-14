import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout.js";
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

const App: React.FC = () => {
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
          <Route path="/analisa-data" element={<DataExplorerPage />} />
          <Route path="/log" element={<ActivityLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </DateRangeProvider>
  );
};

export default App;
