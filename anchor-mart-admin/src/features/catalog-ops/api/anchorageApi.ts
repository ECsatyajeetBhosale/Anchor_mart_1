import { ANCHORAGE_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type { Anchorage, AnchoragePayload } from "../types/catalogOps.types";

export interface GetAnchoragesParams {
  /** The parent port's **UUID**. Required — absent or malformed is a 400. */
  portId: string;
  /** `"true"` / `"false"`. Omitted means both. */
  isActive?: string;
  page?: number;
  /** Server caps this at 50; larger values are capped rather than rejected. */
  limit?: number;
}

function toAnchorage(row: unknown): Anchorage {
  return {
    // Absent from the documented payload, so this is a hopeful read rather than
    // a guaranteed one — see the note on `Anchorage`. Left undefined instead of
    // `""` so a caller can test it honestly.
    id: asString(getProp(row, "id")) || undefined,
    port_code: asString(getProp(row, "port_code")),
    anchorage_name: asString(getProp(row, "anchorage_name")),
    anchorage_code: asString(getProp(row, "anchorage_code")),
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
 * **List and create only, deliberately.** Update and delete exist server-side
 * and both key on an `anchorage_id` UUID — which no documented read payload
 * returns. Adding the mutations here would put two calls in the codebase that
 * nothing can supply an argument for. They go in the moment the list serializer
 * includes `id`; nothing else about this module has to change.
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
     * A duplicate `port_code` + `anchorage_name` is a **400** carrying
     * `non_field_errors: ["Anchorage already exists for this port"]` — a real
     * message worth showing rather than replacing with a generic failure.
     */
    createAnchorage: builder.mutation<unknown, { portId: string; body: AnchoragePayload }>({
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
  }),
  overrideExisting: false,
});

export const { useGetAnchoragesQuery, useCreateAnchorageMutation } = anchorageApi;
