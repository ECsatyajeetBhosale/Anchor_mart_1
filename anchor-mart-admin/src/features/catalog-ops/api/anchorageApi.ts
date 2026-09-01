import { ANCHORAGE_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  Anchorage,
  AnchorageCreatePayload,
  AnchoragePortRef,
  AnchorageUpdatePayload,
} from "../types/catalogOps.types";

export interface GetAnchoragesParams {
  /** The parent port's **UUID**. Required — absent or malformed is a 400. */
  portId: string;
  /** `"true"` / `"false"`. Omitted means both. */
  isActive?: string;
  page?: number;
  /** Server caps this at 50; larger values are capped rather than rejected. */
  limit?: number;
}

/**
 * The nested parent port.
 *
 * Falls back to a flat `port_code` on the row: that is the shape the endpoint
 * returned before 2026-09-01, and a row read through the old serializer should
 * degrade to a port with no id rather than to a crash on `port.id`.
 */
function toPortRef(row: unknown): AnchoragePortRef {
  const port = getProp(row, "port");
  if (port && typeof port === "object") {
    return {
      id: asString(getProp(port, "id")),
      port_code: asString(getProp(port, "port_code")),
      port_name: asString(getProp(port, "port_name")),
    };
  }
  return { id: "", port_code: asString(getProp(row, "port_code")), port_name: "" };
}

function toAnchorage(row: unknown): Anchorage {
  const hours = getProp(row, "estimated_delivery_hours");
  return {
    id: asString(getProp(row, "id")),
    port: toPortRef(row),
    anchorage_name: asString(getProp(row, "anchorage_name")),
    // Legitimately empty on a row created without one — codes are not generated.
    anchorage_code: asString(getProp(row, "anchorage_code")),
    // `null` and `0` are different answers: never set, versus set to immediate.
    // Only a real number survives, so `null`, `""` and a missing key all read as
    // "not set" rather than collapsing into zero.
    estimated_delivery_hours: typeof hours === "number" ? hours : null,
    // Absent on a port that predates the default-anchorage rule, and absent from
    // rows read through the older serializer — both mean "not the default".
    is_default: getProp(row, "is_default") === true,
    // Anything but an explicit `false` counts as active, matching how `toPort`
    // reads the same flag: a row that omits it is live.
    is_active: getProp(row, "is_active") !== false,
    created_at: asString(getProp(row, "created_at")),
    updated_at: asString(getProp(row, "updated_at")),
  };
}

/**
 * Anchorage admin CRUD (see `ANCHORAGE_ENDPOINTS` for the contract's quirks).
 *
 * **Every write is gated on `platform.port_config`** — the same super-admin
 * feature that gates the port writes themselves. Anchorage writes were open to
 * every admin tier until 2026-09-01; they are not any more, so a caller that
 * renders these without checking will hand a sub-admin a 403.
 *
 * **Every write invalidates by port, not by row.** The list is fetched per port
 * and there is no unscoped one, so the port tag is the only cache entry a
 * mooring can appear in. It has to be the unit of invalidation for a second
 * reason too: promotion is a *two-row* change — the incumbent default is
 * demoted in the same transaction — so a write here can alter a row the caller
 * never named.
 */
export const anchorageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnchorages: builder.query<ListResult<Anchorage>, GetAnchoragesParams>({
      query: ({ portId, isActive, page, limit }) => ({
        url: ANCHORAGE_ENDPOINTS.GET_ANCHORAGES,
        method: "GET",
        params: {
          port_id: portId,
          is_active: isActive || undefined,
          page,
          page_size: limit,
        },
      }),
      // The rows sit at `results.data`, one level deeper than the usual
      // envelope. `unwrapList` already walks that shape — the same one the
      // customer anchorage list uses.
      transformResponse: (res: unknown) => unwrapList(res, toAnchorage),
      // Scoped per port: the list is meaningless unscoped, and one port's write
      // must not refetch another's.
      providesTags: (_r, _e, { portId }) => [{ type: "Anchorages", id: portId }],
    }),

    /**
     * Create one mooring under a port.
     *
     * A duplicate name under the same port is a **400** carrying a field-level
     * `anchorage_name` error — "An anchorage with this name already exists for
     * this port." — which is a real sentence worth showing rather than
     * replacing with a generic failure. The same name under a *different* port
     * is fine, and a soft-deleted row does not reserve its name.
     */
    createAnchorage: builder.mutation<unknown, { portId: string; body: AnchorageCreatePayload }>({
      query: ({ body }) => ({
        url: ANCHORAGE_ENDPOINTS.CREATE_ANCHORAGE,
        method: "POST",
        body,
      }),
      // `portId` rides along for the cache only. The body carries the same UUID
      // as `port`, but the two are kept apart deliberately: one is the write
      // contract, the other is this cache's key, and collapsing them would tie
      // the tag to whatever the API happens to call the field next.
      invalidatesTags: (_r, _e, { portId }) => [{ type: "Anchorages", id: portId }],
    }),

    /**
     * Rename a mooring, retime it, toggle its status, or promote it to default.
     *
     * `PATCH` rather than `PUT` — though the two behave identically here, both
     * being partial since 2026-09-01.
     *
     * Three bodies are refused with a `400` and a usable sentence, and the
     * caller is expected to not offer them rather than to explain them after
     * the fact: `is_default: false` (demote), `is_active: false` on the default,
     * and any `port` (moving the mooring).
     *
     * The 200 body is the updated row, not the usual `{ message }` envelope, so
     * there is no server sentence to surface on success.
     */
    updateAnchorage: builder.mutation<
      unknown,
      { portId: string; anchorageId: string; body: AnchorageUpdatePayload }
    >({
      query: ({ anchorageId, body }) => ({
        url: ANCHORAGE_ENDPOINTS.UPDATE_ANCHORAGE(anchorageId),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { portId }) => [{ type: "Anchorages", id: portId }],
    }),

    /**
     * Soft-delete a mooring: `is_deleted=True`, `is_active=False`, with
     * `deleted_at`/`deleted_by` recorded. The row is retained server-side but
     * drops out of the list and details endpoints and can no longer be updated
     * — so from this panel it is gone for good.
     *
     * Two failures are worth distinguishing by status rather than by prose:
     *
     * - **409** — the row is the port's default and the port has other
     *   anchorages. Promote one of those first. Deleting a port's *last*
     *   anchorage is allowed even though it is the default.
     * - **404** — already deleted, which is what a stale row in an open drawer
     *   produces. A second attempt is an error, not a no-op.
     */
    deleteAnchorage: builder.mutation<
      { message?: string },
      { portId: string; anchorageId: string }
    >({
      query: ({ anchorageId }) => ({
        url: ANCHORAGE_ENDPOINTS.DELETE_ANCHORAGE(anchorageId),
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, { portId }) => [{ type: "Anchorages", id: portId }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAnchoragesQuery,
  useCreateAnchorageMutation,
  useUpdateAnchorageMutation,
  useDeleteAnchorageMutation,
} = anchorageApi;
