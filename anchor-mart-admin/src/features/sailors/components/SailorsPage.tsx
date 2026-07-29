import { IconEdit, IconEye, IconGift, IconPlus, IconShare, IconUsers } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { TableActions } from "@/components/common/TableActions";
import { textColumn } from "@/components/common/tableColumns";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { DataTable } from "@/components/ui/data-table";
import { getFallbackAvatar } from "@/lib/avatar";
import { MESSAGES } from "@/lib/messages";

import { useGetSailorQuery, useGetSailorStatsQuery, useGetSailorsQuery } from "../api/sailorApi";
import type { SailorData } from "../types/sailor.types";
import { SailorDetailDrawer } from "./SailorDetailDrawer";
import { SailorFormModal } from "./SailorFormModal";

const M = MESSAGES.SAILORS;

const LIMIT = 10;

// The dropdown is the single status control — a tab row alongside it drove the
// same `?status=` param and only created two ways to say one thing.
const STATUS_OPTIONS = [
  { label: M.STATUS_FILTER.ALL, value: "all" },
  { label: M.STATUS_FILTER.ACTIVE, value: "active" },
  { label: M.STATUS_FILTER.INACTIVE, value: "inactive" },
  { label: M.STATUS_FILTER.NEW, value: "new" },
];

/** A non-placeholder text value. */
const isReal = (v: string) => !!v && v !== "—";

/**
 * Merges the detail response onto the clicked row. The row is authoritative
 * (it always has every displayed field); each detail field is used only when it
 * carries a real value, so an unmapped/partial detail payload can never blank
 * out the drawer.
 */
function mergeSailorDetail(row: SailorData | null, detail?: SailorData): SailorData | null {
  if (!row) return null;
  if (!detail) return row;
  return {
    id: row.id || detail.id,
    n: isReal(detail.n) ? detail.n : row.n,
    e: isReal(detail.e) ? detail.e : row.e,
    w: isReal(detail.w) ? detail.w : row.w,
    j: isReal(detail.j) ? detail.j : row.j,
    sh: isReal(detail.sh) ? detail.sh : row.sh,
    o: detail.o || row.o,
    p: detail.p || row.p,
    ca: detail.ca || row.ca,
    wi: detail.wi || row.wi,
    st: isReal(detail.st) ? detail.st : row.st,
    sc: isReal(detail.st) ? detail.sc : row.sc,
    // Take the flag from whichever source carried a real status, so the block
    // state and its label always agree.
    active: isReal(detail.st) ? detail.active : row.active,
  };
}

export function SailorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedSailor, setSelectedSailor] = useState<SailorData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  /** The sailor being edited; null means the form opens in "add" mode. */
  const [editSailor, setEditSailor] = useState<SailorData | null>(null);

  // URL-driven filter state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? "all";
  const statusParam = statusFilter !== "all" ? statusFilter : undefined;

  // --- Queries ---
  const { data, isLoading, isFetching, isError, refetch } = useGetSailorsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    status: statusParam,
  });
  const { data: stats, isLoading: statsLoading } = useGetSailorStatsQuery();

  // Detail fetch on drawer open — enriches the instantly-shown row data.
  const { data: sailorDetail, isFetching: detailFetching } = useGetSailorQuery(
    selectedSailor?.id ?? "",
    { skip: !selectedSailor },
  );
  // The clicked row already has every field the drawer shows, so it stays
  // authoritative; the detail response only fills in fields where it has a real
  // value (guards against an unmapped detail shape blanking the drawer).
  const drawerSailor = mergeSailorDetail(selectedSailor, sailorDetail);

  const sailors = data?.sailors ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Update one URL param; filter changes reset to page 1. "all"/empty clears it.
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

  /** Opens the form drawer — with a sailor for edit, without one for add. */
  const openForm = (sailor?: SailorData) => {
    setEditSailor(sailor ?? null);
    setIsFormOpen(true);
  };

  const showSailorProfile = (s: SailorData) => {
    setSelectedSailor(s);
  };

  const closeProfile = () => {
    setSelectedSailor(null);
  };

  const statItems = [
    {
      id: "total",
      label: M.STATS.TOTAL,
      value: statsLoading ? "—" : (stats?.total_sailors ?? 0).toLocaleString(),
      icon: <IconUsers size={20} />,
      variant: "navy" as const,
    },
    {
      id: "loyalty",
      label: M.STATS.LOYALTY,
      value: statsLoading ? "—" : (stats?.loyalty_points_issued ?? 0).toLocaleString(),
      icon: <IconGift size={20} />,
      variant: "amber" as const,
    },
    {
      id: "referrals",
      label: M.STATS.REFERRALS,
      value: statsLoading ? "—" : (stats?.referrals ?? 0).toLocaleString(),
      icon: <IconShare size={20} />,
      variant: "teal" as const,
    },
  ];

  const columns: Column<SailorData>[] = [
    {
      id: "sailor",
      header: M.COLUMNS.SAILOR,
      cell: (s) => (
        <div className="flex items-center gap-2.5">
          <div className="av av-img">
            <img src={getFallbackAvatar(s.id || s.n)} alt={s.n} loading="lazy" />
          </div>
          <div>
            <div className="td-p">{s.n}</div>
            <div className="td-m">{s.e}</div>
          </div>
        </div>
      ),
    },
    textColumn({ id: "contact", header: M.COLUMNS.CONTACT, get: (s) => s.w, className: "td-m" }),
    textColumn({ id: "joined", header: M.COLUMNS.JOINED, get: (s) => s.j, className: "td-m" }),
    textColumn({ id: "orders", header: M.COLUMNS.ORDERS, get: (s) => s.o, className: "td-p w7" }),
    {
      id: "loyalty",
      header: M.COLUMNS.LOYALTY,
      cell: (s) => (
        <>
          <span className="camber w7">{s.p.toLocaleString()}</span>
          <span className="td-m">{M.PTS_SUFFIX}</span>
        </>
      ),
    },
    {
      id: "status",
      header: M.COLUMNS.STATUS,
      cell: (s) => (
        <Badge variant={s.sc} className="text-[10px]">
          {s.st}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: M.COLUMNS.ACTIONS,
      className: "w-24 text-right",
      headerClassName: "text-right",
      cell: (s) => (
        <TableActions
          row={s}
          actions={[
            {
              icon: <IconEye size={16} />,
              title: M.ACTIONS.VIEW,
              onClick: (e) => {
                e.stopPropagation();
                showSailorProfile(s);
              },
            },
            {
              icon: <IconEdit size={16} />,
              title: M.ACTIONS.EDIT,
              onClick: (e) => {
                e.stopPropagation();
                openForm(s);
              },
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isFetching}
            filters={[
              {
                id: "status",
                value: statusFilter,
                placeholder: M.STATUS_FILTER.ALL,
                options: STATUS_OPTIONS,
                width: "150px",
                onValueChange: (val) => setParam("status", val),
              },
            ]}
          >
            <button type="button" className="btn btn-primary" onClick={() => openForm()}>
              <IconPlus size={16} />
              {M.ADD_SAILOR}
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={sailors}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={handlePageChange}
        showPagination
        emptyMessage={M.EMPTY_FILTERED}
        onRowClick={showSailorProfile}
      />

      <SailorDetailDrawer
        isOpen={!!selectedSailor}
        sailor={drawerSailor}
        isLoading={detailFetching}
        onClose={closeProfile}
        onEdit={(s) => {
          closeProfile();
          openForm(s);
        }}
      />

      <SailorFormModal
        isOpen={isFormOpen}
        sailor={editSailor}
        onClose={() => setIsFormOpen(false)}
      />
    </>
  );
}
