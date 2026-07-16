import { ASSIGNMENT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ApiUnassignedOrder,
  ApiUnassignedOrdersResponse,
  AssignOrderPayload,
  UnassignedOrder,
} from "../types/assignment.types";

/** Format the API's decimal string amount as `$1000.00`, falling back to "-". */
function formatAmount(amount: string): string {
  const value = Number(amount);
  return Number.isFinite(value) ? `$${value.toFixed(2)}` : "-";
}

/**
 * Map an unassigned-order API row onto the flat shape the
 * `UnassignedOrdersCard` renders. Keeps the UI untouched — only the data
 * source changes. The API has no priority field, so rows default to "Normal".
 */
function mapUnassignedOrder(o: ApiUnassignedOrder): UnassignedOrder {
  return {
    id: o.order_number || o.id,
    orderId: o.id,
    sailor: o.customer_name || "-",
    items: o.status_display || "-",
    port: formatAmount(o.total_amount),
    priority: "Normal",
  };
}

export const assignmentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Orders awaiting partner assignment. Returns the mapped UI rows directly.
    getUnassignedOrders: builder.query<UnassignedOrder[], void>({
      query: () => ({ url: ASSIGNMENT_ENDPOINTS.GET_UNASSIGNED_ORDERS, method: "GET" }),
      transformResponse: (res: ApiUnassignedOrdersResponse) =>
        (res?.results ?? []).map(mapUnassignedOrder),
      providesTags: [{ type: "Assignments", id: "UNASSIGNED-LIST" }],
    }),

    // Assign (or reassign) an order to a delivery partner.
    assignOrder: builder.mutation<unknown, AssignOrderPayload>({
      query: (body) => ({
        url: ASSIGNMENT_ENDPOINTS.ASSIGN_ORDER,
        method: "POST",
        body,
      }),
      // Refresh the unassigned list so the newly assigned order drops off it.
      invalidatesTags: [{ type: "Assignments", id: "UNASSIGNED-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetUnassignedOrdersQuery, useAssignOrderMutation } = assignmentApi;
