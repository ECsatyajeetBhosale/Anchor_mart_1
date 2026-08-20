import { DropdownSelect } from "@/components/common/DropdownSelect";
import { Button } from "@/components/ui/button";
import { useGetShipAgentsQuery } from "@/features/ship-agents";
import type { ShipAgent } from "@/features/ship-agents";
import { getApiMessage } from "@/lib/apiError";
import { MESSAGES } from "@/lib/messages";
import { IconAnchor, IconX } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useSetOrderShipAgentMutation } from "../api/orderShipAgentApi";
import { useOrderOwnership } from "../hooks/useOrderOwnership";
import type { OrderShipAgentSnapshot } from "../types/order.types";
import type { AssignedAdmin } from "../types/ownership.types";

const M = MESSAGES.ORDERS.SHIP_AGENT;

/** Order statuses after which the ship agent can no longer be changed. */
const CLOSED_STATUSES = new Set(["delivered", "cancelled", "refunded"]);

export interface OrderShipAgentSectionProps {
  orderId: string;
  /** Raw order status (e.g. "delivered") — drives the closed-order gate. */
  status: string;
  /** Currently bound agent (admin read body), or null. */
  shipAgent?: ShipAgent | null;
  /** Frozen snapshot; shown when the live agent is gone but a binding remains. */
  shipAgentSnapshot?: OrderShipAgentSnapshot | null;
  /** Owning admin (Flow 27); undefined when the row didn't load it. */
  assignedAdmin?: AssignedAdmin | null;
}

/** One-line contact summary for the currently bound agent. */
function contactLine(agent: ShipAgent | OrderShipAgentSnapshot): string {
  const mobile = agent.mobile?.trim();
  const cc = agent.country_code?.trim();
  const phone = mobile ? (cc ? `${cc} ${mobile}` : mobile) : "";
  return [phone, agent.email?.trim()].filter(Boolean).join(" · ") || MESSAGES.SHIP_AGENTS.DASH;
}

/**
 * Flow 02 · API 17 — bind/clear the ship agent on an order. Self-contained
 * section injected into the shared `OrderDetailDrawer` via its `shipAgentSlot`.
 * All order-feature logic lives here so the common drawer stays generic.
 */
export function OrderShipAgentSection({
  orderId,
  status,
  shipAgent,
  shipAgentSnapshot,
  assignedAdmin,
}: OrderShipAgentSectionProps) {
  const { isSuperAdmin, stateOf } = useOrderOwnership();
  const [setOrderShipAgent, { isLoading }] = useSetOrderShipAgentMutation();

  // Current binding: prefer the live agent, fall back to the frozen snapshot
  // (the agent may have been soft-deleted while the order keeps its binding).
  const current = shipAgent ?? shipAgentSnapshot ?? null;

  const [selectedId, setSelectedId] = useState<string>(current?.id ?? "");
  // Re-sync the picker when the drawer switches to a different order.
  useEffect(() => {
    setSelectedId(current?.id ?? "");
  }, [current?.id]);

  // Agent directory for the picker (any non-deleted agent may be attached).
  const { data, isLoading: agentsLoading } = useGetShipAgentsQuery({ page: 1, limit: 50 });
  const agents = data?.results ?? [];

  const options = agents.map((a) => ({
    value: a.id,
    label: a.company ? `${a.name} · ${a.company}` : a.name,
  }));
  // Keep the bound agent selectable even if it falls outside the first page.
  if (current && !options.some((o) => o.value === current.id)) {
    options.unshift({
      value: current.id,
      label: current.company ? `${current.name} · ${current.company}` : current.name,
    });
  }

  // Gate (mirrors the backend evaluation order: status → ownership).
  const closed = CLOSED_STATUSES.has(status.trim().toLowerCase());
  const ownState = stateOf(assignedAdmin);
  const ownershipKnown = assignedAdmin !== undefined;
  // Another admin owns it and we're not super — a hard block.
  const blockedByOther = ownershipKnown && !isSuperAdmin && ownState === "other";
  // Do we hold write access? Super admin always; otherwise the owner.
  //
  // There is deliberately no self-claim step here any more: an Operator cannot
  // assign an order to themselves, so the way out of this gate is an Admin
  // assigning it to them — which is a sentence, not a button. Ownership that
  // hasn't loaded yet reads as "not yours" and blocks, which is the recoverable
  // direction to be wrong in for the moment before the detail lands.
  const canWrite = isSuperAdmin || ownState === "mine";
  // A sub-admin who doesn't hold the order: blocked, with nothing to click.
  const notAssigned = !closed && !blockedByOther && !canWrite;

  const busy = isLoading;
  // Assign/clear stay behind the ownership gate (the doc's required sequence).
  const writeDisabled = busy || closed || blockedByOther || notAssigned;

  const hint = closed
    ? M.CLOSED
    : blockedByOther
      ? M.OTHER_ADMIN
      : notAssigned
        ? M.NOT_ASSIGNED
        : null;

  const handleAssign = async () => {
    if (!selectedId) return;
    try {
      const res = await setOrderShipAgent({ orderId, shipAgentId: selectedId }).unwrap();
      toast.success(res.message ?? M.ASSIGNED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.ASSIGNED);
    }
  };

  const handleClear = async () => {
    try {
      const res = await setOrderShipAgent({ orderId, shipAgentId: null }).unwrap();
      toast.success(res.message ?? M.CLEARED);
    } catch (error) {
      toast.error(getApiMessage(error) ?? M.CLEARED);
    }
  };

  const isUnchanged = selectedId === (current?.id ?? "");

  return (
    <div className="mt16">
      <div className="sec-label flex items-center gap-1.5">
        <IconAnchor size={13} className="inline" />
        {M.SECTION}
      </div>

      {/* Current binding */}
      <div className="detail-kv">
        <div className="detail-k">{M.SECTION}</div>
        <div className="detail-v">
          {current ? (
            <div>
              <div className="td-p">{current.name}</div>
              <div className="td-m">{contactLine(current)}</div>
            </div>
          ) : (
            <span className="c4">{M.NONE}</span>
          )}
        </div>
      </div>

      {/* Picker + actions */}
      <div className="mt-2 flex items-center gap-2">
        <div className="flex-1">
          <DropdownSelect
            value={selectedId}
            onValueChange={setSelectedId}
            placeholder={agentsLoading ? MESSAGES.COMMON.LOADING : M.PICK_PLACEHOLDER}
            options={options}
            width="100%"
            disabled={writeDisabled || agentsLoading}
          />
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleAssign}
          disabled={writeDisabled || !selectedId || isUnchanged}
        >
          {isLoading ? M.LOADING : current ? M.UPDATE : M.ASSIGN}
        </Button>
        {current && (
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={writeDisabled}>
            <IconX size={15} />
            {M.CLEAR}
          </Button>
        )}
      </div>

      {hint && <div className="fg-hint mt-1.5">{hint}</div>}
    </div>
  );
}
