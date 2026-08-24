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

import { DealsPage } from "@/features/rewards";
// Parked screens — hidden from the sidebar and unrouted for now. The pages
// themselves are untouched; uncomment the import and its <Route> below (and the
// matching entry in `lib/navigation.ts`) to bring one back.
// import { AssignmentsPage } from "@/pages/AssignmentsPage";
import { ExpressOrdersPage } from "@/pages/ExpressOrdersPage";
import { ExpressPage } from "@/pages/ExpressPage";
import { IntentsPage } from "@/pages/IntentsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { PartnersPage } from "@/pages/PartnersPage";
import { RewardsPage } from "@/pages/RewardsPage";
// Pages (remain in pages/ until migrated to features)
import { SailorsPage } from "@/pages/SailorsPage";
import { SettingsPage } from "@/pages/SettingsPage";

// Settings sub-page — Help & FAQ management (Users moved to Account Management)
import { FaqsPage } from "@/features/settings";
import { SpecialRequestsPage } from "@/pages/SpecialRequestsPage";
// Restored 2026-08-24 alongside its realtime badge.
import { VerificationPage } from "@/pages/VerificationPage";

// Notification console — role-based sends + platform broadcast
import { NotificationsPage } from "@/features/notifications";

// Chat — live support, delivery and per-order threads (Flow 23)
import { DeliveryChatsPage, OrderChatsPage, SupportChatsPage } from "@/features/chat";

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

// Account Management (Flow 31) — provision users + review deletion requests
import { AdminUsersPage, DeletionRequestsPage } from "@/features/account-management";

// Outbound message ledger (Flow 22) — did the email/WhatsApp actually land?
// Parked — see the note above `AssignmentsPage`.
// import { OutboundMessagesPage } from "@/features/messages";

// Saved products (Flow 29c §5) — sailor wishlists, read-only
import { SavedProductsPage } from "@/features/saved-products";

// Audit trail (Flow 34) — role-scoped; verification is super-admin only
import { AuditTrailPage } from "@/features/audit";

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
            <Route path={APP_ROUTES.EXPRESS_ORDERS} element={<ExpressOrdersPage />} />
            <Route path={APP_ROUTES.PORTS} element={<PortsPage />} />
            <Route path={APP_ROUTES.REWARDS} element={<RewardsPage />} />
            <Route path={APP_ROUTES.DEALS} element={<DealsPage />} />
            <Route path={APP_ROUTES.GIFTS} element={<GiftShipsPage />} />
            <Route path={APP_ROUTES.RATINGS} element={<RatingsPage />} />
            <Route path={APP_ROUTES.PARTNERS} element={<PartnersPage />} />
            {/* Failed deliveries: the orders screen seeded to `delivery_failed`.
                Declared before nothing in particular, but it must stay a real
                route — a redirect to `/orders?status=…` would leave its sidebar
                entry permanently inactive. */}
            <Route
              path={APP_ROUTES.ORDERS_FAILED}
              element={<OrdersPage defaultStatus="delivery_failed" />}
            />
            <Route path={APP_ROUTES.VERIFICATION} element={<VerificationPage />} />
            {/* Assignments stays parked — unrouted, so the path falls through to
                the 404 redirect. Uncomment with its import and nav entry. */}
            {/* <Route path={APP_ROUTES.ASSIGNMENTS} element={<AssignmentsPage />} /> */}
            <Route path={APP_ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
            <Route path={APP_ROUTES.CHAT} element={<DeliveryChatsPage />} />
            <Route path={APP_ROUTES.SUPPORT} element={<SupportChatsPage />} />
            <Route path={APP_ROUTES.ORDER_CHATS} element={<OrderChatsPage />} />
            <Route path={APP_ROUTES.SELLERS} element={<SellerRequestsPage />} />
            {/* Account Management is a sidebar *section* now, not a screen —
                its two halves each hold a path so the section can list them as
                siblings of Sailors, Delivery Partners and Seller Requests. */}
            <Route path={APP_ROUTES.ADMIN_USERS} element={<AdminUsersPage />} />
            <Route path={APP_ROUTES.DELETION_REQUESTS} element={<DeletionRequestsPage />} />
            {/* Every path that has ever pointed at this area, redirected rather
                than dropped so existing links and bookmarks still land — the 404
                fallback would otherwise send them to the dashboard with no
                explanation. Deletion review is the target because every admin
                tier can use it; the admin directory is super-admin only. */}
            <Route
              path={APP_ROUTES.ACCOUNT_MANAGEMENT}
              element={<Navigate to={APP_ROUTES.DELETION_REQUESTS} replace />}
            />
            <Route
              path={APP_ROUTES.ACCOUNT_DELETIONS}
              element={<Navigate to={APP_ROUTES.DELETION_REQUESTS} replace />}
            />
            <Route
              path={APP_ROUTES.SETTINGS_USERS}
              element={<Navigate to={APP_ROUTES.DELETION_REQUESTS} replace />}
            />
            {/* Parked — see the note beside the Assignments route above. */}
            {/* <Route path={APP_ROUTES.MESSAGES} element={<OutboundMessagesPage />} /> */}
            <Route path={APP_ROUTES.SAVED_PRODUCTS} element={<SavedProductsPage />} />
            <Route path={APP_ROUTES.AUDIT} element={<AuditTrailPage />} />
            <Route path={APP_ROUTES.SETTINGS} element={<SettingsPage />} />
            <Route path={APP_ROUTES.SETTINGS_FAQS} element={<FaqsPage />} />
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
