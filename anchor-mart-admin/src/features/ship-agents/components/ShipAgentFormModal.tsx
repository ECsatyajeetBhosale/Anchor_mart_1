import type { ShipAgent } from "../types/shipAgent.types";
import { ShipAgentAddDrawer } from "./ShipAgentAddDrawer";
import { ShipAgentEditDrawer } from "./ShipAgentEditDrawer";

export interface ShipAgentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: ShipAgent | null;
}

/**
 * Entry point used by the ship-agents table. Add and Edit are separate
 * self-contained drawers; this thin switch keeps the table's API unchanged
 * (one component for both flows).
 *
 * It intentionally holds no hooks — each child owns its own form state, which
 * keeps hook order stable when switching between the add and edit drawers.
 */
export function ShipAgentFormModal({ isOpen, onClose, agent }: ShipAgentFormModalProps) {
  if (agent) {
    return <ShipAgentEditDrawer isOpen={isOpen} onClose={onClose} agent={agent} />;
  }
  return <ShipAgentAddDrawer isOpen={isOpen} onClose={onClose} />;
}
