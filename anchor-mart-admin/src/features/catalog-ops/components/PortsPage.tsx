import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import {
  actionsColumn,
  idColumn,
  statusColumn,
  textColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import { type Column, DataTable } from "@/components/ui/data-table";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { useAdminAccess } from "@/lib/roles";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeletePortMutation, useGetPortsQuery } from "../api/portApi";
import type { Port } from "../types/catalogOps.types";
import { AnchorageDrawer } from "./AnchorageDrawer";
import { PortFormDrawer } from "./PortFormDrawer";

const M = MESSAGES.PORTS;
const LIMIT = 10;

/**
 * The `is_active` filter sends the capitalised Python literals the API
 * collection uses — the sibling customer endpoint 500s on lowercase `true`.
 */
const STATUS_OPTIONS = [
  { value: "True", label: M.STATUS_FILTER.ACTIVE },
  { value: "False", label: M.STATUS_FILTER.INACTIVE },
];

export function PortsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPort, setEditingPort] = useState<Port | null>(null);
  const [portToDelete, setPortToDelete] = useState<Port | null>(null);
  /** The port whose anchorages are open. Null closes the drawer. */
  const [anchoragePort, setAnchoragePort] = useState<Port | null>(null);

  const [deletePort, { isLoading: isDeleting }] = useDeletePortMutation();

  /**
   * Ports are platform configuration: add/update/delete all require
   * `platform.port_config`, which `ROLE_FEATURES` grants to `super_admin` only.
   * The directory itself stays readable — a sub-admin still needs to look a port
   * up while working an order.
   */
  const { can } = useAdminAccess();
  const canConfigurePorts = can("platform.port_config");

  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const search = searchParams.get("search") ?? "";
  const isActive = searchParams.get("is_active") ?? "";

  const { data, isLoading, isError, refetch } = useGetPortsQuery({
    page,
    limit: LIMIT,
    search,
    isActive,
  });

  const ports = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.count ?? 0) / LIMIT));

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const openDrawer = (port: Port | null) => {
    setEditingPort(port);
    setDrawerOpen(true);
  };

  const confirmDelete = async () => {
    if (!portToDelete) return;
    try {
      const res = await deletePort(portToDelete.id).unwrap();
      setPortToDelete(null);
      // The delete cascades: the port's anchorages are deactivated and stop
      // being selectable. `deactivated_anchorages` is the only report of it.
      const deactivated = res?.deactivated_anchorages ?? 0;
      toast.success(
        deactivated > 0 ? M.TOAST.DELETE_SUCCESS_CASCADE(deactivated) : M.TOAST.DELETE_SUCCESS,
      );
    } catch (error) {
      // Keep the dialog open so the admin can see the reason and retry.
      toast.error(getApiMessage(error) ?? M.TOAST.DELETE_ERROR);
    }
  };

  const columns: Column<Port>[] = [
    idColumn({ id: "code", header: M.COLUMNS.CODE, get: (r) => r.port_code || M.DASH }),
    twoLineColumn({
      id: "port",
      header: M.COLUMNS.PORT,
      primary: (r) => r.port_name || M.DASH,
      secondary: (r) => r.region || M.DASH,
    }),
    textColumn({
      id: "country",
      header: M.COLUMNS.COUNTRY,
      get: (r) => r.country || M.DASH,
      cellClassName: "td-m",
    }),
    textColumn({
      id: "region",
      header: M.COLUMNS.REGION,
      get: (r) => r.region || M.DASH,
      cellClassName: "td-m",
    }),
    statusColumn({
      id: "status",
      header: M.COLUMNS.STATUS,
      get: (r) => r.is_active,
      filter: {
        value: isActive,
        options: STATUS_OPTIONS,
        onChange: (v) => setParam("is_active", v),
      },
    }),
    /*
      The whole column, not just its buttons, is conditional.

      It used to render for everyone and hand a sub-admin an empty `actions: {}`
      — so the table carried a header and a fixed `w-24` cell of nothing on
      every row, and the columns that do have something to say were squeezed to
      make room for it. Port configuration is `platform.port_config`, which no
      operator holds, so for them there is no action here at all and the column
      has nothing to be.

      Dropping it also lets the remaining columns take the width back: the table
      is auto-layout, so this needs no other spacing change.
    */
    ...(canConfigurePorts
      ? [
          actionsColumn<Port>({
            header: M.COLUMNS.ACTIONS,
            actions: () => ({
              /**
               * The port's moorings. Offered on the same permission as the rest
               * of this row: an anchorage is port configuration, and the list
               * endpoint keys on the port's UUID, which this row is the natural
               * place to have.
               */
              anchorages: {
                title: M.ANCHORAGES.ACTION,
                onClick: (e, row) => {
                  e.stopPropagation();
                  setAnchoragePort(row);
                },
              },
              edit: {
                title: MESSAGES.COMMON.EDIT,
                onClick: (e, row) => {
                  e.stopPropagation();
                  openDrawer(row);
                },
              },
              delete: {
                title: MESSAGES.COMMON.DELETE,
                onClick: (e, row) => {
                  e.stopPropagation();
                  setPortToDelete(row);
                },
              },
            }),
          }),
        ]
      : []),
  ];

  return (
    <div className="page-enter">
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={search}
            onSearchChange={(v) => setParam("search", v)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isLoading}
          >
            {canConfigurePorts && (
              <button type="button" className="btn btn-primary" onClick={() => openDrawer(null)}>
                <IconPlus size={16} />
                {M.ADD}
              </button>
            )}
          </SearchFilters>
        }
      />

      <DataTable
        columns={columns}
        data={ports}
        rowKey="id"
        page={page}
        pages={totalPages}
        isLoading={isLoading}
        isError={isError}
        error={isError ? M.FETCH_ERROR : null}
        onRetry={refetch}
        onPageChange={(p) => {
          const next = new URLSearchParams(searchParams);
          next.set("page", String(p));
          setSearchParams(next);
        }}
        showPagination
        emptyMessage={M.EMPTY}
        // The row opens the edit drawer, so it is a write entry point like the
        // action buttons above.
        onRowClick={canConfigurePorts ? (row) => openDrawer(row) : undefined}
        hasActiveFilters={Boolean(search || isActive)}
        onResetFilters={() => setSearchParams(new URLSearchParams())}
      />

      <PortFormDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} port={editingPort} />

      <AnchorageDrawer
        isOpen={!!anchoragePort}
        onClose={() => setAnchoragePort(null)}
        port={anchoragePort}
      />

      <ConfirmDialog
        isOpen={!!portToDelete}
        onClose={() => setPortToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        title={M.DELETE_CONFIRM.TITLE}
        description={M.DELETE_CONFIRM.MESSAGE}
        confirmText={M.DELETE_CONFIRM.CONFIRM}
      />
    </div>
  );
}

export default PortsPage;
