import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/auth/ProtectedRoute';
import SuperAdminRoute from './components/auth/SuperAdminRoute';
import ShopRoute from './components/auth/ShopRoute';
import DashboardPage from './features/dashboard/DashboardPage';
import ProductsPage from './features/products/ProductsPage';
import PosPage from './features/pos/PosPage';
import InventoryPage from './features/inventory/InventoryPage';
import OrdersPage from './features/orders/OrdersPage';
import CrmPage from './features/crm/CrmPage';
import DeliveryPage from './features/delivery/DeliveryPage';
import ReportsPage from './features/reports/ReportsPage';
import SettingsPage from './features/settings/SettingsPage';
import RestaurantPage from './features/restaurant/RestaurantPage';
import WebsiteConfigPage from './features/website/WebsiteConfigPage';
import StorefrontPage from './features/website/StorefrontPage';
import PookalStorefront from './features/website/PookalStorefront';
import AdminPage from './features/admin/AdminPage';
import SuppliersPage from './features/suppliers/SuppliersPage';
import BranchesPage from './features/branches/BranchesPage';
import UsersPage from './features/users/UsersPage';
import LoginPage from './features/auth/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/pookal" element={<PookalStorefront />} />
      <Route path="/store/pookal" element={<PookalStorefront />} />
      <Route path="/store/:slug" element={<StorefrontPage />} />
      <Route path="/store" element={<StorefrontPage />} />
      <Route path="/storefront" element={<StorefrontPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />

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
        <Route path="/products"      element={<ShopRoute requiredModule="products"><ProductsPage /></ShopRoute>} />
        <Route path="/pos"           element={<ShopRoute requiredModule="pos"><PosPage /></ShopRoute>} />
        <Route path="/inventory"     element={<ShopRoute requiredModule="inventory"><InventoryPage /></ShopRoute>} />
        <Route path="/orders"        element={<ShopRoute requiredModule="orders"><OrdersPage /></ShopRoute>} />
        <Route path="/restaurant"    element={<ShopRoute requiredCapability="restaurant"><RestaurantPage /></ShopRoute>} />
        <Route path="/crm"           element={<ShopRoute requiredModule="crm"><CrmPage /></ShopRoute>} />
        <Route path="/delivery"      element={<ShopRoute requiredModule="delivery"><DeliveryPage /></ShopRoute>} />
        <Route path="/reports"       element={<ShopRoute requiredModule="reports"><ReportsPage /></ShopRoute>} />
        <Route path="/website-config" element={<ShopRoute requiredModule="website"><WebsiteConfigPage /></ShopRoute>} />
        <Route path="/suppliers"     element={<ShopRoute requiredModule="suppliers"><SuppliersPage /></ShopRoute>} />
        <Route path="/vendor"        element={<ShopRoute requiredModule="suppliers"><SuppliersPage /></ShopRoute>} />
        <Route path="/branches"      element={<ShopRoute><BranchesPage /></ShopRoute>} />
        <Route path="/users"         element={<ShopRoute><UsersPage /></ShopRoute>} />
        <Route path="/settings"      element={<ShopRoute><SettingsPage /></ShopRoute>} />
      </Route>
    </Routes>
  );
}
