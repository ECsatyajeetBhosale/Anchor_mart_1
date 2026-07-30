import { AuthLayout } from "@/components/common/AuthLayout";
import { Layout } from "@/components/common/Layout";
import { APP_ROUTES } from "@/lib/constants";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

// Auth — from feature
import { LoginPage, OtpLoginPage } from "@/features/auth";

import { AnalyticsPage } from "@/features/analytics";
// Dashboard — from feature
import { DashboardPage } from "@/features/dashboard";

import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { ExpressPage } from "@/pages/ExpressPage";
import { IntentsPage } from "@/pages/IntentsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PartnersPage } from "@/pages/PartnersPage";
import { RewardsPage } from "@/pages/RewardsPage";
// Pages (remain in pages/ until migrated to features)
import { SailorsPage } from "@/pages/SailorsPage";
import { SettingsPage } from "@/pages/SettingsPage";

// Settings sub-page — Help & FAQ management
import { FaqsPage, UsersPage } from "@/features/settings";
import { SpecialRequestsPage } from "@/pages/SpecialRequestsPage";
import { VerificationPage } from "@/pages/VerificationPage";

// Notification console — role-based sends + platform broadcast
import { NotificationsPage } from "@/features/notifications";

// Chat monitor — read-only support and order threads
import { DeliveryChatsPage, SupportChatsPage } from "@/features/chat";

// Ratings & Reviews (Flow 16 admin surfaces)
import { RatingsPage } from "@/features/ratings";

// Surprise Gift Program (Flow 20) — vessel-scoped, marketing not fulfilment
import { GiftShipsPage } from "@/features/gifts";

// Catalog operations — ports, shops, inventory, saved products
import { PortsPage } from "@/features/catalog-ops";

// Products — from feature
import { ProductsPage } from "@/features/products";

// Categories — from catalog feature
import { CategoriesPage } from "@/features/catalog";

// Emergency Categories — from feature (marine emergency spares catalog)
import { EmergencyCategoriesPage } from "@/features/emergency-categories";

// Ship Agents — from feature (Flow 02 admin directory)
import { ShipAgentsPage } from "@/features/ship-agents";

// Sellers — from feature
import { SellerRequestsPage } from "@/features/sellers";

// Spares — from feature
import { SparesPage } from "@/features/spares";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={APP_ROUTES.DASHBOARD} replace />} />

        {/* Auth routes (unauthenticated) */}
        <Route element={<AuthLayout />}>
          <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
          <Route path={APP_ROUTES.LOGIN_OTP} element={<OtpLoginPage />} />
        </Route>

        {/* Protected dashboard routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path={APP_ROUTES.DASHBOARD} element={<DashboardPage />} />
            <Route path={APP_ROUTES.ANALYTICS} element={<AnalyticsPage />} />
            <Route path={APP_ROUTES.SAILORS} element={<SailorsPage />} />
            <Route path={APP_ROUTES.ORDERS} element={<OrdersPage />} />
            <Route path={APP_ROUTES.INTENTS} element={<IntentsPage />} />
            <Route path={APP_ROUTES.PRODUCTS} element={<ProductsPage />} />
            <Route path={APP_ROUTES.CATEGORIES} element={<CategoriesPage />} />
            <Route path={APP_ROUTES.EMERGENCY_CATEGORIES} element={<EmergencyCategoriesPage />} />
            <Route path={APP_ROUTES.SHIP_AGENTS} element={<ShipAgentsPage />} />
            <Route path={APP_ROUTES.EXPRESS} element={<ExpressPage />} />
            <Route path={APP_ROUTES.PORTS} element={<PortsPage />} />
            <Route path={APP_ROUTES.REWARDS} element={<RewardsPage />} />
            <Route path={APP_ROUTES.GIFTS} element={<GiftShipsPage />} />
            <Route path={APP_ROUTES.RATINGS} element={<RatingsPage />} />
            <Route path={APP_ROUTES.PARTNERS} element={<PartnersPage />} />
            <Route path={APP_ROUTES.ASSIGNMENTS} element={<AssignmentsPage />} />
            <Route path={APP_ROUTES.VERIFICATION} element={<VerificationPage />} />
            <Route path={APP_ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={APP_ROUTES.CHAT} element={<DeliveryChatsPage />} />
            <Route path={APP_ROUTES.SUPPORT} element={<SupportChatsPage />} />
            <Route path={APP_ROUTES.SELLERS} element={<SellerRequestsPage />} />
            <Route path={APP_ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={APP_ROUTES.SETTINGS_FAQS} element={<FaqsPage />} />
            <Route path={APP_ROUTES.SETTINGS_USERS} element={<UsersPage />} />
            <Route path={APP_ROUTES.REQUESTS} element={<SpecialRequestsPage />} />
            <Route path={APP_ROUTES.SPARES} element={<SparesPage />} />
          </Route>
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to={APP_ROUTES.DASHBOARD} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
