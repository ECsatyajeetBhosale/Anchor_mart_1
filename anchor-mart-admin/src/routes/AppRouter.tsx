import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { APP_ROUTES } from "@/lib/constants";
import { ProtectedRoute } from "./ProtectedRoute";
import { Layout } from "@/components/common/Layout";
import { AuthLayout } from "@/components/common/AuthLayout";

// Auth — from feature
import { LoginPage } from "@/features/auth";

// Dashboard — from feature
import { DashboardPage } from "@/features/dashboard";
import { AnalyticsPage } from "@/features/analytics";

// Pages (remain in pages/ until migrated to features)
import { SailorsPage } from "@/pages/SailorsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { IntentsPage } from "@/pages/IntentsPage";
import { ExpressPage } from "@/pages/ExpressPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { RewardsPage } from "@/pages/RewardsPage";
import { PartnersPage } from "@/pages/PartnersPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { VerificationPage } from "@/pages/VerificationPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { ChatPage } from "@/pages/ChatPage";
import { SupportPage } from "@/pages/SupportPage";
import { SellersPage } from "@/pages/SellersPage";
import { SpecialRequestsPage } from "@/pages/SpecialRequestsPage";
import { SparesPage } from "@/pages/SparesPage";
import { SettingsPage } from "@/pages/SettingsPage";

// Products — from feature
import { ProductsPage } from "@/features/products";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to={APP_ROUTES.DASHBOARD} replace />} />

        {/* Auth routes (unauthenticated) */}
        <Route element={<AuthLayout />}>
          <Route path={APP_ROUTES.LOGIN} element={<LoginPage />} />
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
            <Route path={APP_ROUTES.EXPRESS} element={<ExpressPage />} />
            <Route path={APP_ROUTES.INVENTORY} element={<InventoryPage />} />
            <Route path={APP_ROUTES.REWARDS} element={<RewardsPage />} />
            <Route path={APP_ROUTES.PARTNERS} element={<PartnersPage />} />
            <Route path={APP_ROUTES.ASSIGNMENTS} element={<AssignmentsPage />} />
            <Route path={APP_ROUTES.VERIFICATION} element={<VerificationPage />} />
            <Route path={APP_ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={APP_ROUTES.CHAT} element={<ChatPage />} />
            <Route path={APP_ROUTES.SUPPORT} element={<SupportPage />} />
             <Route path={APP_ROUTES.SELLERS} element={<SellersPage />} />
            <Route path={APP_ROUTES.SETTINGS} element={<SettingsPage />} />
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
