import {
  actionsColumn,
  badgeColumn,
  textColumn,
  twoLineColumn,
} from "@/components/common/tableColumns";
import type { Column } from "@/components/ui/data-table";
import { MESSAGES } from "@/lib/messages";
import { IconAnchor } from "@tabler/icons-react";
import type React from "react";
import type { ShipAgent } from "../types/shipAgent.types";

const M = MESSAGES.SHIP_AGENTS;

const SCOPE_FILTER_OPTIONS = [
  { label: M.SCOPE_FILTER.GLOBAL, value: "global" },
  { label: M.SCOPE_FILTER.OWNED, value: "owned" },
];

/** Join country code + mobile into a single display string. */
function formatMobile(agent: ShipAgent): string {
  const mobile = agent.mobile?.trim();
  if (!mobile) return M.DASH;
  const cc = agent.country_code?.trim();
  return cc ? `${cc} ${mobile}` : mobile;
}

export interface UseShipAgentColumnsOptions {
  /** Current scope filter value ("", "global", "owned") for the header dropdown. */
  scopeFilter: string;
  onScopeFilter: (value: string) => void;
  onEdit: (e: React.MouseEvent, agent: ShipAgent) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

/**
 * Column definitions for the ship-agents table. Kept out of the page component
 * so the page stays focused on data/state wiring and the columns stay reusable.
 */
export function useShipAgentColumns({
  scopeFilter,
  onScopeFilter,
  onEdit,
  onDelete,
}: UseShipAgentColumnsOptions): Column<ShipAgent>[] {
  return [
    {
      id: "icon",
      header: "",
      cell: () => (
        <div className="prod-thumb">
          <IconAnchor size={18} />
        </div>
      ),
      className: "w-12",
    },
    twoLineColumn({
      id: "agent",
      header: M.COLUMNS.AGENT,
      primary: (row) => row.name,
      secondary: (row) => row.company || M.DASH,
    }),
    twoLineColumn({
      id: "contact",
      header: M.COLUMNS.CONTACT,
      primary: (row) => formatMobile(row),
      secondary: (row) => row.email || M.DASH,
    }),
    badgeColumn({
      id: "scope",
      header: M.COLUMNS.SCOPE,
      get: (row) => (row.is_global ? M.SCOPE_LABEL.GLOBAL : M.SCOPE_LABEL.OWNED),
      variant: (row) => (row.is_global ? "info" : "neutral"),
      // Server-side scope filter via the clickable header (?scope=global|owned).
      filter: {
        value: scopeFilter,
        options: SCOPE_FILTER_OPTIONS,
        onChange: onScopeFilter,
      },
    }),
    textColumn({
      id: "owner",
      header: M.COLUMNS.OWNER,
      get: (row) => row.owner_email || (row.is_global ? M.GLOBAL_DIRECTORY : M.DASH),
      cellClassName: "td-m",
    }),
    textColumn({
      id: "orders",
      header: M.COLUMNS.ORDERS,
      get: (row) => row.orders_count ?? 0,
      cellClassName: "td-p",
    }),
    textColumn({
      id: "created",
      header: M.COLUMNS.CREATED,
      get: (row) => row.created_at || M.DASH,
      cellClassName: "td-m",
    }),
    actionsColumn({
      header: M.COLUMNS.ACTIONS,
      actions: () => ({
        edit: {
          title: M.ACTION_EDIT,
          onClick: (e, r) => onEdit(e, r),
        },
        delete: {
          title: M.ACTION_REMOVE,
          onClick: (e, r) => onDelete(e, r.id),
        },
      }),
    }),
  ];
}
