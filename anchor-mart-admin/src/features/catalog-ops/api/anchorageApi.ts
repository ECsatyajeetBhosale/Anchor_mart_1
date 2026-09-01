import { ANCHORAGE_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  Anchorage,
  AnchoragePayload,
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

function toAnchorage(row: unknown): Anchorage {
  return {
    // Absent from the documented payload, so this is a hopeful read rather than
    // a guaranteed one — see the note on `Anchorage`. Left undefined instead of
    // `""` so the row actions can test it honestly. `anchorage_id` is checked
    // as well: it is the name the write routes use for the same value, and a
    // serializer that exposes the key at all may expose it under either.
    id: asString(getProp(row, "id")) || asString(getProp(row, "anchorage_id")) || undefined,
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
 * **The write routes key on an `anchorage_id` UUID the read routes may not
 * return.** The documented list row is `{ port_code, anchorage_name, is_active,
 * created_at, updated_at }` and the details payload matches it, so `id` is read
 * defensively in `toAnchorage` and the drawer offers edit/delete per row — on
 * the rows that came back with one. The mutations below are written against the
 * contract regardless: a UI that can only act on some rows still needs the call
 * to exist, and if the serializer starts sending the key nothing here changes.
 *
 * Every write invalidates by **port**, not by row. The list is fetched per port
 * and there is no unscoped one, so the port tag is the only cache entry a
 * mooring can appear in — and a rename has to move it there, not just refresh a
 * detail view this feature does not have.
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

    /**
     * Rename a mooring or toggle its status.
     *
     * `PATCH` rather than `PUT`: the view accepts both, and a partial body is
     * the documented recommendation — it also means a field the serializer
     * happens to require but this form does not collect can't be blanked by
     * omission.
     *
     * The 200 body is the updated row (`{ anchorage_name, is_active, id }`),
     * not the usual `{ message }` envelope, so there is no server sentence to
     * surface on success — the caller supplies its own.
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
     * drops out of every read — the list and the details view both treat a
     * deleted anchorage as a 404 — so from this panel it is gone for good.
     *
     * A second attempt on the same id is a **404**, not a no-op, which is what
     * a stale row in an open drawer will produce. The caller shows the server's
     * "Anchorage not found" for exactly that case.
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
