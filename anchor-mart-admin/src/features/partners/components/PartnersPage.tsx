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
import { getApiMessage } from "@/lib/apiError";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";
import {
  useDeletePartnerMutation,
  useGetPartnerStatsQuery,
  useGetPartnersQuery,
} from "../api/partnerApi";
import type { PartnerData } from "../types/partner.types";
import { PartnerDetailDrawer } from "./PartnerDetailDrawer";
import { PartnerFormDrawer } from "./PartnerFormDrawer";
import { PartnerHistoryDrawer } from "./PartnerHistoryDrawer";

const M = MESSAGES.PARTNERS;

export function PartnersPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Partners list from the API. Onboard/edit have no write endpoint yet, so they
  // mutate a local copy seeded from the fetched rows; delete uses the real API.
  const { data, isLoading, isError, refetch } = useGetPartnersQuery();
  const [partners, setPartners] = useState<PartnerData[]>([]);
  useEffect(() => {
    setPartners(data?.partners ?? []);
  }, [data?.partners]);

  const [deletePartner, { isLoading: isDeleting }] = useDeletePartnerMutation();

  // Flow 28 API 3 — the only performance surface in Build A. The richer
  // per-partner KPI endpoints are explicitly deferred to Build-2 by the flow doc.
  const { data: stats, isLoading: statsLoading } = useGetPartnerStatsQuery();
  const statItems = [
    {
      id: "total",
      label: M.STATS.TOTAL,
      footer: M.STATS.TOTAL_FOOTER,
      value: statsLoading ? "—" : (stats?.total_partners ?? 0).toLocaleString(),
      icon: <IconUsers size={20} />,
      variant: "navy" as const,
    },
    {
      id: "active",
      label: M.STATS.ACTIVE_DELIVERIES,
      footer: M.STATS.ACTIVE_DELIVERIES_FOOTER,
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

  // URL-driven search (shareable, refresh-safe) — mirrors other list pages.
  const search = searchParams.get("search") ?? "";

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") {
      next.set(key, value);
    } else {
      next.delete(key);
    }
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
      toast.error(getApiMessage(err) ?? M.TOAST.DELETE_ERROR);
    }
  };

  const filteredPartners = partners.filter((pt) => {
    const q = search.toLowerCase();
    return (
      !q ||
      pt.n.toLowerCase().includes(q) ||
      pt.id.toLowerCase().includes(q) ||
      pt.p.toLowerCase().includes(q)
    );
  });

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
      id: "total",
      header: M.COLUMNS.TOTAL_DELIVERIES,
      className: "td-m",
      headerClassName: "text-center",
      cell: (d) => <div className="w-full text-center">{d.t}</div>,
    },
    actionsColumn({
      header: M.COLUMNS.ACTIONS,
      actions: () => ({
        view: {
          title: M.ACTIONS.VIEW,
          onClick: (e, r) => {
            e.stopPropagation();
            openHistory(r);
          },
        },
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
            toast.success(M.TOAST.MESSAGE_OPENED(r.n));
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
        data={filteredPartners}
        rowKey="id"
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
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
