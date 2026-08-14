import { IconSettings, IconStar, IconTicket } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DynamicTabs } from "@/components/common/DynamicTabs";
import { PageHeader } from "@/components/common/PageHeader";
import { Search } from "@/components/common/Search";
import { SectionCard } from "@/components/common/SectionCard";
import { idColumn, statusColumn, textColumn } from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import {
  useCreateCouponMutation,
  useDeleteCouponMutation,
  useGetActiveCouponsQuery,
  useUpdateCouponMutation,
} from "../api/couponApi";
import {
  useGetLoyaltyConfigQuery,
  useGetLoyaltyOverviewQuery,
  useUpdateLoyaltyConfigMutation,
} from "../api/loyaltyApi";
import type { CouponFormData } from "../schemas/coupon.schema";
import type { LoyaltyConfigFormData } from "../schemas/loyaltyConfig.schema";
import type {
  ApiCoupon,
  Coupon,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../types/reward.types";
import { ActiveCouponsCard } from "./ActiveCouponsCard";
import { BonusPointsTab } from "./BonusPointsTab";
import { CouponAssignmentsTab } from "./CouponAssignmentsTab";
import { CouponFormDrawer } from "./CouponFormDrawer";
import { CouponReportTab } from "./CouponReportTab";
import { LoyaltyConfigDrawer } from "./LoyaltyConfigDrawer";

const M = MESSAGES.REWARDS;
const P = MESSAGES.PROMOTION;

const TAB_OVERVIEW = "overview";
const COUPON_LIMIT = 10;

/** Format an ISO timestamp (e.g. "2026-12-31T23:59:59Z") as "Dec 31, 2026". */
function formatCouponDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Map an API coupon record onto the flat shape the coupon card renders. */
function toCoupon(api: ApiCoupon): Coupon {
  const value = Number(api.discount_value);
  const d =
    api.discount_type === "percentage"
      ? `${value}% off ${api.applies_to}`
      : `$${value.toFixed(2)} off ${api.applies_to}`;
  const min = Number(api.min_purchase_amount);
  const m = api.first_time_user_only
    ? "First order only"
    : min > 0
      ? `Min. order $${min.toFixed(2)}`
      : "No minimum";
  return {
    id: api.id,
    code: api.code,
    d,
    m,
    e: formatCouponDate(api.valid_to),
    u: api.times_used,
    val: api.discount_value,
    raw: api,
  };
}

/** Build the create request body from the validated form data. */
function toCreateCouponPayload(data: CouponFormData): CreateCouponPayload {
  const usage = data.usage_limit.trim();
  return {
    code: data.code.toUpperCase(),
    title: data.title,
    description: data.description,
    image: data.image || null,
    discount_type: data.discount_type,
    applies_to: data.applies_to,
    discount_value: data.discount_value,
    min_purchase_amount: data.min_purchase_amount,
    valid_from: `${data.valid_from}T00:00:00Z`,
    valid_to: data.valid_to,
    usage_limit: usage ? Number(usage) : null,
    per_user_usage_limit: Number(data.per_user_usage_limit) || 1,
    is_public: data.is_public,
  };
}

/**
 * Build the update request body from the form data. The update contract uses
 * date-only validity, includes `is_active`, omits `applies_to`, and sends a
 * blank `per_user_usage_limit` as an empty string.
 */
function toUpdateCouponPayload(data: CouponFormData): UpdateCouponPayload {
  const usage = data.usage_limit.trim();
  const perUser = data.per_user_usage_limit.trim();
  return {
    code: data.code.toUpperCase(),
    title: data.title,
    description: data.description,
    image: data.image || null,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    min_purchase_amount: data.min_purchase_amount,
    valid_from: data.valid_from,
    valid_to: data.valid_to,
    usage_limit: usage ? Number(usage) : null,
    per_user_usage_limit: perUser ? Number(perUser) : "",
    is_public: data.is_public,
    is_active: data.is_active,
  };
}

export function RewardsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(TAB_OVERVIEW);
  const [couponPage, setCouponPage] = useState(1);
  const [couponSearch, setCouponSearch] = useState("");

  /**
   * Coupons and the loyalty config are **governance** capabilities — the backend
   * grants `promo.coupon` and `finance.config` to `super_admin` only
   * (`ROLE_FEATURES`), so every coupon write and the points config would 403 for
   * a sub-admin. Reading stays open: the tables below render for both tiers.
   *
   * Hiding the control is a UX gate, not a security one — the server refuses the
   * call regardless, and the mutation handlers still surface that refusal.
   */
  const { can } = useAdminAccess();
  const canManageCoupons = can("promo.coupon");
  const canConfigureLoyalty = can("finance.config");

  /**
   * Coupons (live API). Seed local state so the existing add/edit UI keeps
   * working optimistically until those mutation endpoints are wired up.
   *
   * **Paged and searched server-side.** The query used to be sent bare, which
   * returns the endpoint's default page of ten and reports the real total only
   * in `count` — read by nothing, under a table with its pager switched off. The
   * eleventh coupon existed and could not be reached.
   */
  const {
    data: couponData,
    isLoading: couponsLoading,
    isError: couponsError,
    refetch: refetchCoupons,
  } = useGetActiveCouponsQuery({ page: couponPage, limit: COUPON_LIMIT, search: couponSearch });
  const couponPages = Math.max(1, Math.ceil((couponData?.count ?? 0) / COUPON_LIMIT));
  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const [deleteCoupon, { isLoading: isDeleting }] = useDeleteCouponMutation();
  useEffect(() => {
    if (couponData?.results) setCoupons(couponData.results.map(toCoupon));
  }, [couponData]);

  // Loyalty Program Overview KPIs (live API). Values fall back to "—" until loaded.
  const { data: loyalty } = useGetLoyaltyOverviewQuery();

  // Loyalty points configuration (live API) — seeds the "Configure Points" drawer.
  const { data: loyaltyConfig } = useGetLoyaltyConfigQuery();
  const [updateLoyaltyConfig, { isLoading: isSavingConfig }] = useUpdateLoyaltyConfigMutation();
  const dash = "—";
  const loyaltyView = {
    pointsIssued: loyalty ? loyalty.points_issued.toLocaleString("en-US") : dash,
    totalValue: loyalty
      ? `$${Number(loyalty.total_value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : dash,
    pointsRedeemed: loyalty ? `${loyalty.points_redeemed.toLocaleString("en-US")} pts` : dash,
    activeUsers: loyalty ? loyalty.active_loyalty_users.toLocaleString("en-US") : dash,
    perDelivery: loyalty ? `+${loyalty.rules.points_per_delivery} pts` : dash,
    perReferral: loyalty ? `+${loyalty.rules.points_per_referral} pts` : dash,
    redemption: loyalty ? `1 pt = $${Number(loyalty.rules.point_value).toFixed(2)}` : dash,
  };

  const openDrawer = (coupon?: Coupon) => {
    setEditCoupon(coupon ?? null);
    setDrawerOpen(true);
  };

  const handleSubmit = async (data: CouponFormData) => {
    const code = data.code.toUpperCase();

    // Both create and update hit the API; the list refetches via tag invalidation.
    try {
      if (editCoupon) {
        await updateCoupon({ id: editCoupon.id, body: toUpdateCouponPayload(data) }).unwrap();
        setDrawerOpen(false);
        toast.success(M.COUPON_UPDATED(code));
      } else {
        await createCoupon(toCreateCouponPayload(data)).unwrap();
        setDrawerOpen(false);
        toast.success(M.COUPON_CREATED(code));
      }
    } catch (err) {
      toast.error(
        getApiMessage(err) ?? (editCoupon ? M.COUPON_UPDATE_ERROR : M.COUPON_CREATE_ERROR),
      );
    }
  };

  const confirmDelete = async () => {
    if (!couponToDelete) return;
    try {
      await deleteCoupon(couponToDelete.id).unwrap();
      toast.success(M.COUPON_DELETED(couponToDelete.code));
      setCouponToDelete(null); // close only on success; tag invalidation refetches the list
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.COUPON_DELETE_ERROR);
    }
  };

  const handleConfigSubmit = async (data: LoyaltyConfigFormData) => {
    try {
      await updateLoyaltyConfig({
        points_per_delivery: data.points_per_delivery,
        points_per_referral: data.points_per_referral,
        point_value: data.point_value,
      }).unwrap();
      setConfigOpen(false);
      toast.success(M.POINTS_SAVED);
    } catch (err) {
      toast.error(getApiMessage(err) ?? M.POINTS_SAVE_ERROR);
    }
  };

  const couponColumns: Column<Coupon>[] = [
    idColumn({ id: "code", header: M.TABLE.COLUMNS.CODE, get: (r) => r.code }),
    textColumn({
      id: "discount",
      header: M.TABLE.COLUMNS.DISCOUNT,
      get: (r) => r.d,
      className: "td-m",
    }),
    textColumn({
      id: "requirement",
      header: M.TABLE.COLUMNS.REQUIREMENT,
      get: (r) => r.m,
      className: "td-m",
    }),
    textColumn({
      id: "uses",
      header: M.TABLE.COLUMNS.USES,
      get: (r) => r.u,
      className: "td-m text-center",
      headerClassName: "text-center",
    }),
    textColumn({
      id: "expires",
      header: M.TABLE.COLUMNS.EXPIRES,
      get: (r) => r.e,
      className: "td-m",
    }),
    statusColumn({
      id: "status",
      header: M.TABLE.COLUMNS.STATUS,
      get: (r) => r.raw?.is_active ?? true,
    }),
  ];

  // The loyalty + coupons overview is the default tab; kept as a variable so
  // the tab list below reads as a flat set of surfaces.
  const overviewTab = (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Loyalty Program Overview (static — no backend endpoint yet) */}
        <SectionCard icon={<IconStar size={18} />} title={M.LOYALTY.TITLE}>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="infobox">
              <div className="info-lbl">{M.LOYALTY.POINTS_ISSUED}</div>
              <div className="text-[22px] font-extrabold text-[var(--amber-600)] mt-1">
                {loyaltyView.pointsIssued}
              </div>
            </div>
            <div className="infobox">
              <div className="info-lbl">{M.LOYALTY.TOTAL_VALUE}</div>
              <div className="text-[22px] font-extrabold text-[var(--teal-600)] mt-1">
                {loyaltyView.totalValue}
              </div>
            </div>
            <div className="infobox">
              <div className="info-lbl">{M.LOYALTY.POINTS_REDEEMED}</div>
              <div className="text-[17px] font-extrabold text-[var(--t1)] mt-1">
                {loyaltyView.pointsRedeemed}
              </div>
            </div>
            <div className="infobox">
              <div className="info-lbl">{M.LOYALTY.ACTIVE_USERS}</div>
              <div className="text-[17px] font-extrabold text-[var(--t1)] mt-1">
                {loyaltyView.activeUsers}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-extrabold uppercase tracking-[0.8px] text-[var(--t4)] mb-2">
            {M.LOYALTY.RULES}
          </div>
          <div className="infobox">
            <div className="flex justify-between text-[13px] pb-2 mb-2 border-b border-dashed border-[var(--border-xs)]">
              <span className="font-semibold text-[var(--t3)]">{M.LOYALTY.RULE_DELIVERY}</span>
              <span className="font-extrabold text-[var(--t1)]">{loyaltyView.perDelivery}</span>
            </div>
            <div className="flex justify-between text-[13px] pb-2 mb-2 border-b border-dashed border-[var(--border-xs)]">
              <span className="font-semibold text-[var(--t3)]">{M.LOYALTY.RULE_REFERRAL}</span>
              <span className="font-extrabold text-[var(--t1)]">{loyaltyView.perReferral}</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="font-semibold text-[var(--t3)]">{M.LOYALTY.RULE_REDEMPTION}</span>
              <span className="font-extrabold text-[var(--t1)]">{loyaltyView.redemption}</span>
            </div>
          </div>
        </SectionCard>

        {/* Active Coupons */}
        <ActiveCouponsCard
          coupons={coupons}
          canManage={canManageCoupons}
          onEdit={(cp) => openDrawer(cp)}
          onDelete={(cp) => setCouponToDelete(cp)}
        />
      </div>

      {/* All coupons (same data as the cards) in a table — click a row to edit. */}
      <SectionCard
        icon={<IconTicket size={18} />}
        title={M.TABLE.TITLE}
        bodyPadding="none"
        actions={
          <Search
            value={couponSearch}
            onSearch={(value) => {
              setCouponSearch(value);
              setCouponPage(1);
            }}
            placeholder={M.TABLE.SEARCH_PLACEHOLDER}
            debounceMs={300}
            style={{ width: "240px" }}
          />
        }
      >
        <DataTable
          columns={couponColumns}
          data={coupons}
          rowKey="id"
          isLoading={couponsLoading}
          isError={couponsError}
          error={couponsError ? MESSAGES.COMMON.ERROR : null}
          onRetry={refetchCoupons}
          page={couponPage}
          pages={couponPages}
          onPageChange={setCouponPage}
          emptyMessage={M.TABLE.EMPTY}
          // The row opens the edit form, so it is a write entry point too. The
          // table itself stays readable for both tiers.
          onRowClick={canManageCoupons ? (cp) => openDrawer(cp) : undefined}
          bare
        />
      </SectionCard>
    </>
  );

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <>
            {canManageCoupons && (
              <Button variant="secondary" size="sm" onClick={() => openDrawer()}>
                <IconTicket size={14} className="mr-1" />
                {M.CREATE_COUPON}
              </Button>
            )}
            {canConfigureLoyalty && (
              <Button variant="primary" size="sm" onClick={() => setConfigOpen(true)}>
                <IconSettings size={14} className="mr-1" />
                {M.CONFIGURE_POINTS}
              </Button>
            )}
          </>
        }
      />

      <DynamicTabs
        value={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { value: TAB_OVERVIEW, label: P.TABS.OVERVIEW, content: overviewTab },
          // Deal of the Day left this screen for its own Marketing entry: a
          // daily offer is scheduled and priced independently of the loyalty
          // programme and the coupon book, so it was the one tab here that
          // shared nothing with the rest.
          { value: "bonus", label: P.TABS.BONUS, content: <BonusPointsTab /> },
          { value: "assignments", label: P.TABS.ASSIGNMENTS, content: <CouponAssignmentsTab /> },
          { value: "report", label: P.TABS.REPORT, content: <CouponReportTab /> },
        ]}
      />

      <CouponFormDrawer
        open={drawerOpen}
        coupon={editCoupon}
        onClose={() => setDrawerOpen(false)}
        onSubmit={handleSubmit}
        isSubmitting={isCreating || isUpdating}
      />

      <LoyaltyConfigDrawer
        open={configOpen}
        config={loyaltyConfig ?? null}
        onClose={() => setConfigOpen(false)}
        onSubmit={handleConfigSubmit}
        isSubmitting={isSavingConfig}
      />

      <ConfirmDialog
        isOpen={!!couponToDelete}
        onClose={() => setCouponToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={M.FORM.DELETE_TITLE}
        description={couponToDelete ? M.FORM.DELETE_MESSAGE(couponToDelete.code) : ""}
        confirmText={MESSAGES.COMMON.DELETE}
      />
    </div>
  );
}
