import { IconAlertTriangle, IconChecks, IconClipboardList } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { SectionCard } from "@/components/common/SectionCard";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import {
  useGetVerificationReportsQuery,
  useGetVerificationStatsQuery,
} from "../api/verificationApi";
import type {
  ApiVerificationReport,
  ApiVerificationStats,
  PriceDiff,
  VerificationReport,
} from "../types/verification.types";
import { SubstituteDrawer } from "./SubstituteDrawer";
import { VerificationRoundsDrawer } from "./VerificationRoundsDrawer";
import { useVerificationColumns } from "./verificationColumns";

const M = MESSAGES.VERIFICATION;
const LIMIT = 10;

// Order-status scopes for the queue. "all" clears the param, letting the server
// apply its own default (`verification_submitted`).
const STATUS_OPTIONS = [
  { value: "all", label: M.STATUS_FILTER.SUBMITTED },
  { value: "sourcing", label: M.STATUS_FILTER.SOURCING },
  { value: "confirmed", label: M.STATUS_FILTER.CONFIRMED },
];

// KPI cards — each maps 1:1 to a counter on the verification-stats response.
const STAT_CONFIG: {
  id: string;
  label: string;
  footer: string;
  key: keyof ApiVerificationStats;
  icon: React.ReactNode;
  variant: "navy" | "green" | "red";
}[] = [
  {
    id: "in_verification",
    label: M.STATS.IN_VERIFICATION,
    footer: M.STATS.IN_VERIFICATION_FOOTER,
    key: "in_verification",
    icon: <IconClipboardList size={20} />,
    variant: "navy",
  },
  {
    id: "verified_today",
    label: M.STATS.VERIFIED_TODAY,
    footer: M.STATS.VERIFIED_TODAY_FOOTER,
    key: "verified_today",
    icon: <IconChecks size={20} />,
    variant: "green",
  },
  {
    id: "unavailable_items",
    label: M.STATS.UNAVAILABLE,
    footer: M.STATS.UNAVAILABLE_FOOTER,
    key: "unavailable_items",
    icon: <IconAlertTriangle size={20} />,
    variant: "red",
  },
];

/** Map an API report record onto the flat shape the table renders. */
function toReport(api: ApiVerificationReport): VerificationReport {
  return {
    id: api.id,
    orderId: api.order_id,
    enquiry: api.order_number,
    partner: api.partner,
    // The reports API doesn't carry a shop; kept blank until an item endpoint exists.
    shop: "",
    totalItems: api.total_items,
    available: api.available_items,
    unavailable: api.unavailable_items,
    status: api.status_display || api.status,
    statusCode: api.status,
    submittedAt: api.submitted_at,
    reviewedAt: api.reviewed_at,
  };
}

export function VerificationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<VerificationReport | null>(null);
  const [roundsReport, setRoundsReport] = useState<VerificationReport | null>(null);
  const [isRoundsOpen, setIsRoundsOpen] = useState(false);

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";

  const { data, isLoading, isFetching, isError, refetch } = useGetVerificationReportsQuery({
    page,
    limit: LIMIT,
    search,
    orderStatus: statusFilter !== "all" ? statusFilter : undefined,
  });

  // Live console counters; cards show "—" while the request is in flight.
  const { data: stats, isLoading: statsLoading } = useGetVerificationStatsQuery();
  const statItems = STAT_CONFIG.map((c) => ({
    id: c.id,
    label: c.label,
    footer: c.footer,
    value: statsLoading ? M.DASH : (stats?.[c.key] ?? 0).toLocaleString(),
    icon: c.icon,
    variant: c.variant,
  }));

  const reports: VerificationReport[] = (data?.results ?? []).map(toReport);
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Update one URL param; filter/search changes reset to page 1.
  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (key !== "page") next.set("page", "1");
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const openSubstitute = (report: VerificationReport) => {
    setActiveReport(report);
    setDialogOpen(true);
  };

  const openRounds = (report: VerificationReport) => {
    setRoundsReport(report);
    setIsRoundsOpen(true);
  };

  const handleSend = (substituteName: string, _priceDiff: PriceDiff) => {
    if (!substituteName.trim()) {
      toast.error(M.DIALOG.NAME_REQUIRED);
      return;
    }
    toast.success(M.DIALOG.SENT(substituteName));
    setDialogOpen(false);
  };

  const columns = useVerificationColumns({
    onSuggest: (e, row) => {
      e.stopPropagation();
      openSubstitute(row);
    },
    onViewRounds: (e, row) => {
      e.stopPropagation();
      openRounds(row);
    },
  });

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: M.ALL_STATUS,
                options: STATUS_OPTIONS,
                width: "170px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          />
        }
      />

      <StatsGrid items={statItems} />

      <SectionCard title={M.TABLE.TITLE} bodyPadding="none" className="mb-5">
        <DataTable
          columns={columns}
          data={reports}
          rowKey="id"
          page={page}
          pages={totalPages}
          isLoading={isLoading}
          isError={isError}
          error={isError ? MESSAGES.COMMON.ERROR : null}
          onRetry={refetch}
          onPageChange={handlePageChange}
          showPagination
          emptyMessage={M.TABLE.EMPTY}
          // Clicking a row opens the full round history; the inline button
          // remains the shortcut to the substitution flow.
          onRowClick={openRounds}
          bare
        />
      </SectionCard>

      <VerificationRoundsDrawer
        report={roundsReport}
        isOpen={isRoundsOpen}
        onClose={() => setIsRoundsOpen(false)}
      />

      <SubstituteDrawer
        open={dialogOpen}
        itemName={activeReport?.enquiry ?? ""}
        shop={activeReport?.shop ?? ""}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleSend}
      />
    </div>
  );
}

export default VerificationPage;
