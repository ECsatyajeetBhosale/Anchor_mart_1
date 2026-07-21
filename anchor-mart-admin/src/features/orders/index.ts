export { OrdersPage } from "@/pages/OrdersPage";
export { useGetOrdersQuery, useCancelOrderMutation } from "./api/orderApi";
export type { GetOrdersParams, CancelOrderResponse } from "./api/orderApi";
export type { Order, OrderListResponse } from "./types/order.types";

// Flow 02 · API 17 — bind/clear a ship agent on an order
export { useSetOrderShipAgentMutation } from "./api/orderShipAgentApi";
export type {
  SetOrderShipAgentArgs,
  SetOrderShipAgentResponse,
} from "./api/orderShipAgentApi";
export { OrderShipAgentSection } from "./components/OrderShipAgentSection";
export type { OrderShipAgentSnapshot } from "./types/order.types";

// Flow 27 — order ownership
export { useClaimOrderMutation, useReassignOrderMutation } from "./api/orderOwnershipApi";
export { OwnerCell } from "./components/OwnerCell";
export { useOrderOwnership, type OwnershipState } from "./hooks/useOrderOwnership";
export type {
  AssignedAdmin,
  ClaimConflict,
  ClaimOrderResponse,
  ReassignError,
  ReassignOrderPayload,
  ReassignOrderResponse,
} from "./types/ownership.types";
