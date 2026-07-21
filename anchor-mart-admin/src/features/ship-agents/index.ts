// Public API for the ship-agents feature (Flow 02 admin directory) — import
// only from here.
export { ShipAgentsPage } from "./components/ShipAgentsPage";
export { ShipAgentFormModal } from "./components/ShipAgentFormModal";
export { ShipAgentAddDrawer } from "./components/ShipAgentAddDrawer";
export { ShipAgentEditDrawer } from "./components/ShipAgentEditDrawer";
export { useShipAgentColumns } from "./components/shipAgentColumns";
export {
  useGetShipAgentsQuery,
  useCreateShipAgentMutation,
  useUpdateShipAgentMutation,
  useDeleteShipAgentMutation,
} from "./api/shipAgentApi";
export type {
  ShipAgent,
  ShipAgentListResponse,
  ShipAgentPayload,
} from "./types/shipAgent.types";
