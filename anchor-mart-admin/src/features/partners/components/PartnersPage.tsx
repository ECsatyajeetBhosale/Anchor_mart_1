import { IconPlus, IconTruckDelivery, IconUsers } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import {
  actionsColumn,
  avatarColumn,
  idColumn,
  textColumn,
} from "@/components/common/tableColumns";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { useStartChat } from "@/features/chat";
import { getApiMessage, getApiStatus } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  useDeletePartnerMutation,
  useGetPartnerStatsQuery,
  useGetPartnersQuery,
} from "../api/partnerApi";
import { PARTNER_PAGE_SIZE, type PartnerData } from "../types/partner.types";
import { CapabilityBadges } from "./CapabilityBadges";
import { PartnerDetailDrawer } from "./PartnerDetailDrawer";
import { PartnerFormDrawer } from "./PartnerFormDrawer";
import { PartnerHistoryDrawer } from "./PartnerHistoryDrawer";

const M = MESSAGES.PARTNERS;

export function PartnersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Opens the partner's existing support thread. Admins cannot *create* one —
  // Flow 23 gives that to the partner — so this is a lookup and a navigation,
  // and it says so itself when the partner has never written in.
  const { startSupportChat } = useStartChat();

  // URL-driven list state (shareable, refresh-safe) — mirrors the other list pages.
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";

  // Partners list from the API. Onboard/edit have no write endpoint yet, so they
  // mutate a local copy seeded from the fetched rows; delete uses the real API.
  // Search runs server-side: the list is paginated at 50, so filtering the page
  // in the client would hide every match past the first page.
  const { data, isLoading, isFetching, isError, refetch } = useGetPartnersQuery({
    page,
    limit: PARTNER_PAGE_SIZE,
    search,
  });
  const [partners, setPartners] = useState<PartnerData[]>([]);
  useEffect(() => {
    setPartners(data?.partners ?? []);
  }, [data?.partners]);

  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / PARTNER_PAGE_SIZE));

  const [deletePartner, { isLoading: isDeleting }] = useDeletePartnerMutation();

  // Flow 28 API 3 — the only performance surface in Build A. The richer
  // per-partner KPI endpoints are explicitly deferred to Build-2 by the flow doc.
  const { data: stats, isLoading: statsLoading } = useGetPartnerStatsQuery();
  const statItems = [
    {
      id: "total",
      label: M.STATS.TOTAL,
      value: statsLoading ? "—" : (stats?.total_partners ?? 0).toLocaleString(),
      icon: <IconUsers size={20} />,
      variant: "navy" as const,
    },
    {
      id: "active",
      label: M.STATS.ACTIVE_DELIVERIES,
      value: statsLoading ? "—" : (stats?.active_deliveries ?? 0).toLocaleString(),
      icon: <IconTruckDelivery size={20} />,
      variant: "teal" as const,
    },
  ];

  // The clicked partner, plus which drawer is showing them. Only one is ever
  // open: `history` is the read-first drill-down a row click lands on, `edit`
  // is the form it hands off to. Modelled as one value rather than two booleans
  // so the two right-side sheets can never be open at once.
  const [selectedPartner, setSelectedPartner] = useState<PartnerData | null>(null);
  const [openDrawer, setOpenDrawer] = useState<"history" | "edit" | null>(null);
  // Where closing the edit drawer lands. Editing from the profile is a
  // drill-down, so it goes back there; editing straight from a row action has
  // nothing behind it and closes outright.
  const [editReturnsToHistory, setEditReturnsToHistory] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<PartnerData | null>(null);

  const openHistory = (partner: PartnerData) => {
    setSelectedPartner(partner);
    setOpenDrawer("history");
  };

  const openEdit = (partner: PartnerData, fromHistory: boolean) => {
    setSelectedPartner(partner);
    setEditReturnsToHistory(fromHistory);
    setOpenDrawer("edit");
  };

  // A filter change resets to page 1, otherwise the new result set is read at an
  // offset that belongs to the old one.
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

  const openAdd = () => setIsFormOpen(true);

  const confirmDelete = async () => {
    if (!partnerToDelete) return;
    const target = partnerToDelete;
    try {
      // Locally-added rows have no backing user id — just drop them locally.
      if (target.userId) {
        await deletePartner(target.userId).unwrap();
      }
      setPartners((prev) => prev.filter((pt) => pt.id !== target.id));
      toast.success(M.TOAST.DELETED(target.n));
      setPartnerToDelete(null);
    } catch (err) {
      // 409 is its own answer: the partner still holds an order, so the delete
      // is refused until it is reassigned or finished. Falling through to the
      // generic "Failed to delete" would leave the admin retrying a call that
      // cannot succeed and no wiser about why.
      if (getApiStatus(err) === 409) {
        toast.error(getApiMessage(err) ?? M.TOAST.DELETE_BLOCKED);
        return;
      }
      toast.error(getApiMessage(err) ?? M.TOAST.DELETE_ERROR);
    }
  };

  const columns: Column<PartnerData>[] = [
    avatarColumn({
      id: "partner",
      header: M.COLUMNS.PARTNER,
      name: (d) => d.n,
      image: (d) => getFallbackAvatar(d.id),
    }),
    idColumn({ id: "id", header: M.COLUMNS.ID, get: (d) => d.id }),
    textColumn({ id: "port", header: M.COLUMNS.PORT_ZONE, get: (d) => d.p, className: "td-m" }),
    textColumn({ id: "joined", header: M.COLUMNS.JOINED, get: (d) => d.j, className: "td-m" }),
    {
      // What kind of work this partner may be assigned. Shown on the row because
      // it decides which orders they can appear against in the assign picker —
      // an admin hunting for "why isn't this partner offered?" looks here first.
      id: "capability",
      header: M.COLUMNS.CAPABILITY,
      className: "td-m",
      cell: (d) => <CapabilityBadges canVerify={d.canVerify} canDeliver={d.canDeliver} />,
    },
    {
      id: "total",
      header: M.COLUMNS.TOTAL_DELIVERIES,
      className: "td-m",
      headerClassName: "text-center",
      cell: (d) => <div className="w-full text-center">{d.t}</div>,
    },
    actionsColumn({
      header: M.COLUMNS.ACTIONS,
      actions: () => ({
        // No `view` action: the eye opened the history drawer, which is exactly
        // what clicking the row already does (`onRowClick={openHistory}`), so it
        // was a second button for the same thing.
        edit: {
          title: M.ACTIONS.EDIT,
          onClick: (e, r) => {
            e.stopPropagation();
            openEdit(r, false);
          },
        },
        message: {
          title: M.ACTIONS.MESSAGE,
          onClick: (e, r) => {
            e.stopPropagation();
            // A partner's support thread lives in the **delivery** inbox, not
            // the sailor one — landing on the wrong tab would show an empty
            // list exactly where the thread is not.
            void startSupportChat(r.userId, "delivery");
          },
        },
        delete: {
          title: M.ACTIONS.DELETE,
          onClick: (e, r) => {
            e.stopPropagation();
            setPartnerToDelete(r);
          },
        },
      }),
    }),
  ];

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
          >
            <Button variant="primary" size="sm" onClick={openAdd}>
              <IconPlus size={15} className="mr-1" />
              {M.ADD_PARTNER}
            </Button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={partners}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY}
        onRowClick={openHistory}
      />

      {/* A row click opens the read-first profile; editing is one deliberate
          step further in, from its footer button. */}
      <PartnerHistoryDrawer
        partner={selectedPartner}
        isOpen={openDrawer === "history"}
        onClose={() => setOpenDrawer(null)}
        onEdit={() => selectedPartner && openEdit(selectedPartner, true)}
      />

      <PartnerDetailDrawer
        partner={selectedPartner}
        isOpen={openDrawer === "edit"}
        onClose={() => setOpenDrawer(editReturnsToHistory ? "history" : null)}
      />

      <PartnerFormDrawer isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <ConfirmDialog
        isOpen={!!partnerToDelete}
        onClose={() => setPartnerToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={M.CONFIRM_DELETE.TITLE}
        description={partnerToDelete ? M.CONFIRM_DELETE.MESSAGE(partnerToDelete.n) : ""}
        confirmText={M.CONFIRM_DELETE.CONFIRM}
      />
    </div>
  );
}

export default PartnersPage;
