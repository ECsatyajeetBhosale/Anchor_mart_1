import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { DataTable } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useGetVerificationReportsQuery } from "../api/verificationApi";
import type {
  ApiVerificationReport,
  PriceDiff,
  VerificationReport,
} from "../types/verification.types";
import { SubstituteDrawer } from "./SubstituteDrawer";
import { needsAction, useVerificationColumns } from "./verificationColumns";

const M = MESSAGES.VERIFICATION;
const LIMIT = 10;

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
  };
}

export function VerificationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeReport, setActiveReport] = useState<VerificationReport | null>(null);

  // URL-driven pagination (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);

  const { data, isLoading, isError, refetch } = useGetVerificationReportsQuery({
    page,
    limit: LIMIT,
  });

  const reports: VerificationReport[] = (data?.results ?? []).map(toReport);
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(newPage));
    setSearchParams(next);
  };

  const openSubstitute = (report: VerificationReport) => {
    setActiveReport(report);
    setDialogOpen(true);
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
  });

  return (
    <div className="page-enter">
      <PageHeader title={M.TITLE} />

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
          onRowClick={(row) => needsAction(row) && openSubstitute(row)}
          bare
        />
      </SectionCard>

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
