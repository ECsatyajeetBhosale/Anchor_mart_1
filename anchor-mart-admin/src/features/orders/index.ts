export { OrdersPage } from "@/pages/OrdersPage";
export {
  useGetOrdersQuery,
  useGetOrderDetailQuery,
  useGetOrderStatsQuery,
  useCancelOrderMutation,
} from "./api/orderApi";
export type {
  GetOrdersParams,
  CancelOrderPayload,
  CancelOrderResponse,
  OrderStats,
} from "./api/orderApi";
export type { Order, OrderListResponse } from "./types/order.types";

// Flow 02 · API 17 — bind/clear a ship agent on an order
export { useSetOrderShipAgentMutation } from "./api/orderShipAgentApi";
export type {
  SetOrderShipAgentArgs,
  SetOrderShipAgentResponse,
} from "./api/orderShipAgentApi";
export { OrderShipAgentSection } from "./components/OrderShipAgentSection";

// Flow 28 · APIs 11–12 — assign / reassign the delivery partner on an order
export { OrderAssignPartnerSection } from "./components/OrderAssignPartnerSection";
export type { OrderAssignPartnerSectionProps } from "./components/OrderAssignPartnerSection";

// Flow 12 — cancel + refund
export { CancelOrderDialog } from "./components/CancelOrderDialog";
export { RefundOrderDialog } from "./components/RefundOrderDialog";
export { useGetRefundQuoteQuery, useRefundOrderMutation } from "./api/orderRefundApi";

// Flow 11 — location changes + delivery surcharges
export { OrderLocationDeltaSection } from "./components/OrderLocationDeltaSection";
export { RaiseDeltaDialog } from "./components/RaiseDeltaDialog";
export {
  useGetLocationReportsQuery,
  useRaiseDeltaMutation,
  useDismissLocationReportMutation,
  useApplyLocationReportMutation,
  useWithdrawDeltaMutation,
} from "./api/orderDeltaApi";
export type {
  DeltaPayment,
  DeltaStatus,
  LocationReport,
  LocationReportKind,
  LocationReportStatus,
  RefundQuote,
  RefundOrderPayload,
  RefundOrderResponse,
} from "./types/delta.types";
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
