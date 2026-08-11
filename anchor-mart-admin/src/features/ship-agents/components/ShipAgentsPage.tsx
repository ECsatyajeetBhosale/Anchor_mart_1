import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchFilters } from "@/components/common/SearchFilters";
import { StatsGrid } from "@/components/common/StatsGrid";
import { DataTable } from "@/components/ui/data-table";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconAddressBook, IconPlus, IconUserCircle, IconWorld } from "@tabler/icons-react";
import type React from "react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useDeleteShipAgentMutation, useGetShipAgentsQuery } from "../api/shipAgentApi";
import type { ShipAgent } from "../types/shipAgent.types";
import { ShipAgentFormModal } from "./ShipAgentFormModal";
import { useShipAgentColumns } from "./shipAgentColumns";

const M = MESSAGES.SHIP_AGENTS;
const LIMIT = 10;

export function ShipAgentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ShipAgent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [deleteShipAgent, { isLoading: isDeleting }] = useDeleteShipAgentMutation();

  // URL-driven state (shareable, refresh-safe).
  const page = Number.parseInt(searchParams.get("page") ?? "1", 10);
  const searchTerm = searchParams.get("search") ?? "";
  const scopeFilter = searchParams.get("scope") ?? ""; // "", "global", "owned"
  const scope = scopeFilter === "global" || scopeFilter === "owned" ? scopeFilter : undefined;

  // Ship-agent list — search and scope filter server-side.
  const { data, isLoading, isError, refetch } = useGetShipAgentsQuery({
    page,
    limit: LIMIT,
    search: searchTerm,
    scope,
  });

  const agents: ShipAgent[] = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // No dedicated stats endpoint exists for ship agents, so derive KPI counts
  // from two lightweight scoped queries (independent of the page's filters).
  const { data: globalData } = useGetShipAgentsQuery({ scope: "global", page: 1, limit: 1 });
  const { data: ownedData } = useGetShipAgentsQuery({ scope: "owned", page: 1, limit: 1 });
  const globalCount = globalData?.count;
  const ownedCount = ownedData?.count;
  const total =
    globalCount === undefined || ownedCount === undefined ? undefined : globalCount + ownedCount;

  const setFilterParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", "1");
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set("page", newPage.toString());
    setSearchParams(next);
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAgentToDelete(id);
  };

  const handleEdit = (e: React.MouseEvent, agent: ShipAgent) => {
    e.stopPropagation();
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleAddAgent = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!agentToDelete) return;
    try {
      await deleteShipAgent(agentToDelete).unwrap();
      toast.success(M.TOAST.DELETE_SUCCESS);
      setAgentToDelete(null);
    } catch (error) {
      // The server's reason beats the fixed string — see CategoriesPage.
      toast.error(getApiMessage(error) ?? M.TOAST.DELETE_ERROR);
    }
  };

  const columns = useShipAgentColumns({
    scopeFilter,
    onScopeFilter: (value) => setFilterParam("scope", value),
    onEdit: handleEdit,
    onDelete: handleDeleteClick,
  });

  const statItems = [
    {
      id: "total-agents",
      label: M.STATS.TOTAL,
      value: total ?? "-",
      icon: <IconAddressBook size={19} />,
      variant: "navy" as const,
    },
    {
      id: "global-agents",
      label: M.STATS.GLOBAL,
      value: globalCount ?? "-",
      icon: <IconWorld size={19} />,
      variant: "teal" as const,
    },
    {
      id: "owned-agents",
      label: M.STATS.OWNED,
      value: ownedCount ?? "-",
      icon: <IconUserCircle size={19} />,
      variant: "amber" as const,
    },
  ];

  return (
    <>
      <PageHeader
        title={M.TITLE}
        actions={
          <SearchFilters
            searchValue={searchTerm}
            onSearchChange={(val) => setFilterParam("search", val)}
            searchPlaceholder={M.SEARCH_PLACEHOLDER}
            searchDebounceMs={300}
            searchLoading={isLoading}
          >
            <button type="button" className="btn btn-primary" onClick={handleAddAgent}>
              <IconPlus size={16} />
              {M.ADD_AGENT}
            </button>
          </SearchFilters>
        }
      />

      <StatsGrid items={statItems} />

      <DataTable
        columns={columns}
        data={agents}
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
        onRowClick={(row) => {
          setEditingAgent(row);
          setIsModalOpen(true);
        }}
      />

      <ShipAgentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agent={editingAgent}
      />

      <ConfirmDialog
        isOpen={!!agentToDelete}
        onClose={() => setAgentToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={M.DELETE_CONFIRM.TITLE}
        description={M.DELETE_CONFIRM.MESSAGE}
        confirmText={M.DELETE_CONFIRM.CONFIRM}
        isLoading={isDeleting}
      />
    </>
  );
}
