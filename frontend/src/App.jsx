import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SuperAdminRoute from './components/auth/SuperAdminRoute';
import ShopRoute from './components/auth/ShopRoute';
import DashboardPage from './features/dashboard/DashboardPage';
import PosPage from './features/pos/PosPage';
import InventoryPage from './features/inventory/InventoryPage';
import OrdersPage from './features/orders/OrdersPage';
import CrmPage from './features/crm/CrmPage';
import DeliveryPage from './features/delivery/DeliveryPage';
import ReportsPage from './features/reports/ReportsPage';
import SettingsPage from './features/settings/SettingsPage';
import WebsiteConfigPage from './features/website/WebsiteConfigPage';
import StorefrontPage from './features/website/StorefrontPage';
import AdminPage from './features/admin/AdminPage';
import VendorPage from './features/vendor/VendorPage';
import BranchesPage from './features/branches/BranchesPage';
import UsersPage from './features/users/UsersPage';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/store/:slug" element={<StorefrontPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        {/* ── Superadmin-only ── */}
        <Route path="/admin" element={<SuperAdminRoute><AdminPage /></SuperAdminRoute>} />

        {/* ── Shop routes (blocked for superadmin) ── */}
        <Route path="/dashboard"     element={<ShopRoute><DashboardPage /></ShopRoute>} />
        <Route path="/pos"           element={<ShopRoute><PosPage /></ShopRoute>} />
        <Route path="/inventory"     element={<ShopRoute><InventoryPage /></ShopRoute>} />
        <Route path="/orders"        element={<ShopRoute><OrdersPage /></ShopRoute>} />
        <Route path="/crm"           element={<ShopRoute><CrmPage /></ShopRoute>} />
        <Route path="/delivery"      element={<ShopRoute><DeliveryPage /></ShopRoute>} />
        <Route path="/reports"       element={<ShopRoute><ReportsPage /></ShopRoute>} />
        <Route path="/website-config" element={<ShopRoute><WebsiteConfigPage /></ShopRoute>} />
        <Route path="/vendor"        element={<ShopRoute><VendorPage /></ShopRoute>} />
        <Route path="/branches"      element={<ShopRoute><BranchesPage /></ShopRoute>} />
        <Route path="/users"         element={<ShopRoute><UsersPage /></ShopRoute>} />
        <Route path="/settings"      element={<ShopRoute><SettingsPage /></ShopRoute>} />
      </Route>
    </Routes>
  );
}
