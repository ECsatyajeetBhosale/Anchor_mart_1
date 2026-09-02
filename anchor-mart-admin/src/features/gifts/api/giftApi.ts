import { GIFT_ENDPOINTS } from "@/lib/apiEndpoints";
import {
  type ListResult,
  asNumber,
  asString,
  getProp,
  unwrapData,
  unwrapList,
} from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  GetGiftShipsParams,
  GiftConfig,
  GiftHandoverStatus,
  GiftShip,
  GiftShipDetail,
  GiftShipOrder,
  GiftShipPort,
  GiftShipSailor,
  GrantShipResult,
  SailorGift,
  UpdateGiftConfigPayload,
} from "../types/gift.types";

/** Reads a boolean, defaulting to `false` for anything the payload omits. */
function asBool(value: unknown): boolean {
  return value === true;
}

function toPorts(value: unknown): GiftShipPort[] {
  if (!Array.isArray(value)) return [];
  return value.map((p) => ({
    id: asString(getProp(p, "id")),
    port_name: asString(getProp(p, "port_name")),
  }));
}

function toShip(row: unknown): GiftShip {
  return {
    imo_number: asString(getProp(row, "imo_number")),
    vessel_name: asString(getProp(row, "vessel_name")),
    ports: toPorts(getProp(row, "ports")),
    order_count: asNumber(getProp(row, "order_count")),
    sailor_count: asNumber(getProp(row, "sailor_count")),
    gifted_sailor_count: asNumber(getProp(row, "gifted_sailor_count")),
    total_value: asString(getProp(row, "total_value")) || "0.00",
    earliest_arrival: (getProp(row, "earliest_arrival") as string | null) ?? null,
    latest_departure: (getProp(row, "latest_departure") as string | null) ?? null,
    // Absent means "can't tell" — default to enabled so a missing field doesn't
    // grey out every button on a programme that is actually running.
    program_enabled: getProp(row, "program_enabled") !== false,
    has_gift_history: asBool(getProp(row, "has_gift_history")),
    is_dismissed: asBool(getProp(row, "is_dismissed")),
  };
}

/** Every handover state the API can send, as a set the parser can check against. */
const HANDOVER_STATUSES: readonly GiftHandoverStatus[] = [
  "pending",
  "collected",
  "delivered",
  "revoked",
  "void",
];

/**
 * Narrows the raw string to a known state, falling back to `pending`.
 *
 * A checked lookup rather than a cast. The cast this replaces let any string
 * through as a valid union member, so when the backend added `collected` the
 * compiler stayed silent and the screen quietly labelled those gifts
 * "Awaiting handover" — the one reading that was certainly wrong.
 */
function toHandoverStatus(value: unknown): GiftHandoverStatus {
  const raw = asString(value);
  return HANDOVER_STATUSES.find((status) => status === raw) ?? "pending";
}

/**
 * A `revoked` or `void` gift reads as **null** — those sailors are giftable
 * again, and the backend already nulls them. This is a belt-and-braces guard so
 * a serializer change can't make a freed sailor look gifted.
 */
function toGift(value: unknown): SailorGift | null {
  if (!value || typeof value !== "object") return null;
  const handover = toHandoverStatus(getProp(value, "handover_status"));
  if (handover === "revoked" || handover === "void") return null;
  return {
    id: asString(getProp(value, "id")),
    handover_status: handover,
    carrier_order_id: (getProp(value, "carrier_order_id") as string | null) ?? null,
    carrier_order_number: (getProp(value, "carrier_order_number") as string | null) ?? null,
    source: asString(getProp(value, "source")) === "bulk" ? "bulk" : "manual",
    granted_by_name: (getProp(value, "granted_by_name") as string | null) ?? null,
    granted_at: (getProp(value, "granted_at") as string | null) ?? null,
    collected_at: (getProp(value, "collected_at") as string | null) ?? null,
    collected_by_name: (getProp(value, "collected_by_name") as string | null) ?? null,
    delivered_by_name: (getProp(value, "delivered_by_name") as string | null) ?? null,
  };
}

function toOrder(row: unknown): GiftShipOrder {
  return {
    id: asString(getProp(row, "id")),
    order_number: asString(getProp(row, "order_number")),
    total_amount: asString(getProp(row, "total_amount")) || "0.00",
    status: asString(getProp(row, "status")),
    ship_arrival_date: (getProp(row, "ship_arrival_date") as string | null) ?? null,
    expected_departure: (getProp(row, "expected_departure") as string | null) ?? null,
    port_name: (getProp(row, "port_name") as string | null) ?? null,
    anchorage_name: (getProp(row, "anchorage_name") as string | null) ?? null,
    is_gift_carrier: asBool(getProp(row, "is_gift_carrier")),
    // `can_manage` is deliberately not read: it is DEPRECATED and always true,
    // kept only so an already-integrated frontend doesn't disable every button.
  };
}

function toSailor(row: unknown): GiftShipSailor {
  const orders = getProp(row, "orders");
  return {
    user_id: asString(getProp(row, "user_id")),
    sailor_name: asString(getProp(row, "sailor_name")),
    order_count: asNumber(getProp(row, "order_count")),
    total_value: asString(getProp(row, "total_value")) || "0.00",
    gift: toGift(getProp(row, "gift")),
    previously_gifted_count: asNumber(getProp(row, "previously_gifted_count")),
    orders: Array.isArray(orders) ? orders.map(toOrder) : [],
  };
}

function toShipDetail(res: unknown): GiftShipDetail {
  const payload = unwrapData<unknown>(res);
  const sailors = getProp(payload, "sailors");
  return {
    imo_number: asString(getProp(payload, "imo_number")),
    vessel_name: asString(getProp(payload, "vessel_name")),
    order_count: asNumber(getProp(payload, "order_count")),
    sailor_count: asNumber(getProp(payload, "sailor_count")),
    gifted_sailor_count: asNumber(getProp(payload, "gifted_sailor_count")),
    program_enabled: getProp(payload, "program_enabled") !== false,
    is_dismissed: asBool(getProp(payload, "is_dismissed")),
    sailors: Array.isArray(sailors) ? sailors.map(toSailor) : [],
  };
}

/**
 * Parsers exposed for unit tests.
 *
 * The handover state is the one piece of this payload with real consequences —
 * it decides the badge an admin acts on — and it is decided here rather than in
 * the component, so this is where it can be pinned down without mounting a
 * drawer and a store.
 */
export const giftTestables = { toGift };

export const giftApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** §1 — the programme config. */
    getGiftConfig: builder.query<GiftConfig, void>({
      query: () => ({ url: GIFT_ENDPOINTS.GET_CONFIG, method: "GET" }),
      transformResponse: (res: unknown): GiftConfig => {
        const payload = unwrapData<unknown>(res);
        return {
          is_enabled: asBool(getProp(payload, "is_enabled")),
          min_orders: asNumber(getProp(payload, "min_orders"), 2),
        };
      },
      providesTags: [{ type: "Gifts", id: "CONFIG" }],
    }),

    /**
     * §2 — update the config. PATCH because both verbs are partial and PATCH
     * says so honestly.
     *
     * `min_total_value` and `threshold_mode` exist as columns but are
     * deliberately off the API — sending them is silently ignored. Don't add
     * fields for them: an inert writable control is worse than no control,
     * because an admin sets a threshold and waits for behaviour that never comes.
     */
    updateGiftConfig: builder.mutation<GiftConfig, UpdateGiftConfigPayload>({
      query: (body) => ({ url: GIFT_ENDPOINTS.UPDATE_CONFIG, method: "PATCH", body }),
      // The switch changes every ship row's `program_enabled`, so drop the lists too.
      invalidatesTags: [
        { type: "Gifts", id: "CONFIG" },
        { type: "Gifts", id: "LIST" },
      ],
    }),

    /** §2a — the ship-browse screen. */
    getGiftShips: builder.query<ListResult<GiftShip>, GetGiftShipsParams | undefined>({
      query: (params) => ({
        url: GIFT_ENDPOINTS.GET_SHIPS,
        method: "GET",
        // Blank filters are dropped: `gift_status` and `ordering` are validated
        // server-side and answer 400 on an empty string.
        params: params
          ? {
              page: params.page,
              page_size: params.limit,
              search: params.search || undefined,
              port_id: params.portId || undefined,
              gift_status: params.giftStatus || undefined,
              arrival_from: params.arrivalFrom || undefined,
              arrival_to: params.arrivalTo || undefined,
              include_dismissed: params.includeDismissed ? "true" : undefined,
              ordering: params.ordering || undefined,
            }
          : undefined,
      }),
      transformResponse: (res: unknown) => unwrapList(res, toShip),
      providesTags: [{ type: "Gifts", id: "LIST" }],
    }),

    /** §2b — ship detail, sailors first with orders nested. */
    getGiftShip: builder.query<GiftShipDetail, string>({
      query: (imo) => ({ url: GIFT_ENDPOINTS.GET_SHIP(imo), method: "GET" }),
      transformResponse: toShipDetail,
      providesTags: (_r, _e, imo) => [{ type: "Gifts", id: `SHIP-${imo}` }],
    }),

    /**
     * §3 — gift the whole ship. **No request body**: there is no item to choose.
     *
     * Grants one gift per not-yet-gifted sailor, each riding that sailor's
     * earliest-arriving giftable order. Sailors who already hold one are
     * skipped, never overwritten — so this is safe to re-run as the crew keeps
     * ordering, which is the intended usage.
     */
    grantShipGifts: builder.mutation<GrantShipResult, string>({
      query: (imo) => ({ url: GIFT_ENDPOINTS.GRANT_SHIP(imo), method: "POST" }),
      transformResponse: (res: unknown): GrantShipResult => ({
        message: asString(getProp(res, "message")),
        sailors_gifted: asNumber(getProp(res, "sailors_gifted")),
        sailors_skipped: asNumber(getProp(res, "sailors_skipped")),
        data: getProp(res, "data") ? toShipDetail(getProp(res, "data")) : null,
      }),
      invalidatesTags: (_r, _e, imo) => [
        { type: "Gifts", id: `SHIP-${imo}` },
        { type: "Gifts", id: "LIST" },
      ],
    }),

    /** §4 — hide a ship from the default list. No body, no reason: it's a preference. */
    dismissShip: builder.mutation<unknown, string>({
      query: (imo) => ({ url: GIFT_ENDPOINTS.DISMISS_SHIP(imo), method: "POST" }),
      invalidatesTags: [{ type: "Gifts", id: "LIST" }],
    }),

    /** §5 — restore it. Any admin may undo any admin's dismissal. */
    undismissShip: builder.mutation<unknown, string>({
      query: (imo) => ({ url: GIFT_ENDPOINTS.UNDISMISS_SHIP(imo), method: "POST" }),
      invalidatesTags: [{ type: "Gifts", id: "LIST" }],
    }),

    /**
     * §6 — gift one specific order, when the admin wants a different order than
     * the auto-picked earliest. Not a way around the ship minimum.
     */
    grantOrderGift: builder.mutation<unknown, { orderId: string; imo: string; note?: string }>({
      query: ({ orderId, note }) => ({
        url: GIFT_ENDPOINTS.GRANT_ORDER(orderId),
        method: "POST",
        body: { note: note ?? "" },
      }),
      invalidatesTags: (_r, _e, { imo }) => [
        { type: "Gifts", id: `SHIP-${imo}` },
        { type: "Gifts", id: "LIST" },
      ],
    }),

    /**
     * §7 — revoke before pickup. `reason` is required and non-blank.
     *
     * Revoking **frees the sailor**: they become giftable again in the same open
     * group, so a mis-targeted gift can be moved to the right order. The sailor
     * is deliberately not notified — they were told a gift was coming without
     * learning what it was, so a retraction would turn a surprise into a
     * visible loss.
     */
    revokeOrderGift: builder.mutation<unknown, { orderId: string; imo: string; reason: string }>({
      query: ({ orderId, reason }) => ({
        url: GIFT_ENDPOINTS.REVOKE_ORDER(orderId),
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: (_r, _e, { imo }) => [
        { type: "Gifts", id: `SHIP-${imo}` },
        { type: "Gifts", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetGiftConfigQuery,
  useUpdateGiftConfigMutation,
  useGetGiftShipsQuery,
  useGetGiftShipQuery,
  useGrantShipGiftsMutation,
  useDismissShipMutation,
  useUndismissShipMutation,
  useGrantOrderGiftMutation,
  useRevokeOrderGiftMutation,
} = giftApi;
