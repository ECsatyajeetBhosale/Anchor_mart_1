import { ORDER_ENDPOINTS } from "@/lib/apiEndpoints";
import { asString, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AssignableAdmin,
  AssignableAdminListResult,
  ClaimOrderResponse,
  GetAssignableAdminsParams,
  ReassignOrderPayload,
  ReassignOrderResponse,
  ReleaseOrderResponse,
} from "../types/ownership.types";

/** Maps a picker row, falling back to the email when no name is set. */
function toAssignableAdmin(row: unknown): AssignableAdmin {
  const r = (row ?? {}) as Record<string, unknown>;
  const email = asString(r.email).trim();
  const combined = `${asString(r.first_name).trim()} ${asString(r.last_name).trim()}`.trim();
  return {
    id: asString(r.id),
    name: asString(r.name).trim() || asString(r.full_name).trim() || combined || email,
    email,
    role: asString(r.role).trim() || undefined,
  };
}

export const orderOwnershipApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 27 API 1 — become the single accountable owner of an order
     * ("Manage Order"). The body is ignored by the backend entirely.
     *
     * Idempotent: re-claiming an order you already own returns the same 200.
     * A 409 means another admin holds it, and carries that owner in
     * `assigned_admin` so the caller can name them.
     *
     * Invalidates both lists because ownership is serialized onto orders and
     * intents alike — a claim made from either screen must refresh the other.
     */
    claimOrder: builder.mutation<ClaimOrderResponse, string>({
      query: (orderId) => ({
        url: ORDER_ENDPOINTS.CLAIM_ORDER(orderId),
        method: "POST",
      }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * Flow 27 API 2 — hand accountability to another admin.
     *
     * Callable by a super admin (any order) or the order's current owner. An
     * unassigned order cannot be reassigned by a sub-admin at all: there is no
     * current owner to match against. Reassigning to the account that already
     * owns it is a no-op 200.
     *
     * `admin_id` comes from `getAssignableAdmins` below. Until that endpoint
     * existed this mutation had no caller — F-03 recorded exactly that.
     */
    reassignOrder: builder.mutation<ReassignOrderResponse, ReassignOrderPayload>({
      query: ({ orderId, admin_id }) => ({
        url: ORDER_ENDPOINTS.REASSIGN_ORDER(orderId),
        method: "POST",
        body: { admin_id },
      }),
      invalidatesTags: (_result, _error, { orderId }) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * Return the order to the unassigned pool.
     *
     * The counterpart to claim, and the honest answer to "I picked this up by
     * mistake". Before it existed the only way out was to reassign it onto
     * someone else, which made another admin accountable for a decision they
     * had not taken.
     */
    releaseOrder: builder.mutation<ReleaseOrderResponse, string>({
      query: (orderId) => ({ url: ORDER_ENDPOINTS.RELEASE_ORDER(orderId), method: "POST" }),
      invalidatesTags: (_result, _error, orderId) => [
        { type: "Intents", id: orderId },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Orders", id: orderId },
        { type: "Orders", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * The reassign picker — active admin-tier accounts.
     *
     * Deliberately not cached against a tag: the list is small, read only while
     * a picker is open, and a stale entry here would offer an admin who has
     * since been deactivated (a 404 from reassign, in field-error shape).
     */
    getAssignableAdmins: builder.query<AssignableAdminListResult, GetAssignableAdminsParams>({
      query: (params) => ({
        url: ORDER_ENDPOINTS.ASSIGNABLE_ADMINS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
        },
      }),
      transformResponse: (res: unknown): AssignableAdminListResult => {
        const { count, items } = unwrapList<AssignableAdmin>(res, toAssignableAdmin);
        return { count, admins: items };
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useClaimOrderMutation,
  useReassignOrderMutation,
  useReleaseOrderMutation,
  useGetAssignableAdminsQuery,
} = orderOwnershipApi;
