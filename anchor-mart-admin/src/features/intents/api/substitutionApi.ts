import { SUBSTITUTION_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  ReleaseSuggestionsPayload,
  StageSuggestionPayload,
  StagedSuggestion,
  SuggestNewProductPayload,
  SuggestionVariant,
  VerificationDetail,
  VerificationLine,
} from "../types/intent.types";

/* ----------------------------- coercers ----------------------------- */

function str(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}
function num(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
/** Reads the first present key off an object (defensive across field-name variants). */
function pick(obj: unknown, ...keys: string[]): unknown {
  for (const k of keys) {
    const v = getProp(obj, k);
    if (v !== undefined && v !== null) return v;
  }
  return undefined;
}

/* --------------------------- mappers (API 6) ------------------------ */

function mapLine(raw: unknown): VerificationLine {
  const requestedQty = num(pick(raw, "requested_qty", "quantity", "qty")) || 0;
  const availableRaw = pick(raw, "available_qty");
  const availableQty = typeof availableRaw === "number" ? availableRaw : null;
  const isAvailableRaw = pick(raw, "is_available");
  const isAvailable = typeof isAvailableRaw === "boolean" ? isAvailableRaw : null;
  const shortfallRaw = pick(raw, "shortfall");
  const shortfall =
    typeof shortfallRaw === "number"
      ? shortfallRaw
      : availableQty !== null
        ? Math.max(0, requestedQty - availableQty)
        : 0;
  return {
    orderItemId: str(pick(raw, "order_item_id", "id")),
    name: str(pick(raw, "product_name", "name")) || "Item",
    sku: str(pick(raw, "sku")),
    requestedQty,
    availableQty,
    isAvailable,
    shortfall,
    needsSuggestion:
      pick(raw, "needs_suggestion") === true || isAvailable === false || shortfall > 0,
    note: str(pick(raw, "note", "reason")),
  };
}

function mapVerificationDetail(res: unknown): VerificationDetail {
  const body = getProp(res, "data") ?? res;
  const report = getProp(body, "latest_report") ?? body;
  const partner = getProp(body, "partner");
  const order = getProp(body, "order");
  return {
    partnerName: str(pick(partner, "name", "partner_name", "email")),
    submittedAt: str(pick(report, "submitted_at", "created_at")),
    portId: str(pick(order, "port_id", "port")),
    lines: asArray(pick(report, "lines", "items")).map(mapLine),
  };
}

/* --------------------------- mappers (API 9) ------------------------ */

function mapStaged(raw: unknown): StagedSuggestion {
  const releasedRaw = pick(raw, "released", "is_released");
  const status = str(pick(raw, "status"));
  return {
    suggestionId: str(pick(raw, "suggestion_id", "id")),
    orderItemId: str(pick(raw, "order_item_id")),
    originalName: str(pick(raw, "original_product_name", "original_name")),
    suggestedName: str(pick(raw, "suggested_product_name", "suggested_name")),
    suggestedSku: str(pick(raw, "suggested_sku")),
    quantity: num(pick(raw, "suggested_quantity", "quantity")) || 1,
    unitPrice: str(pick(raw, "suggested_unit_price", "unit_price")),
    status,
    // A suggestion is "released" if the flag says so, else infer from status.
    released: releasedRaw === true || /released|accepted|rejected|substituted/i.test(status),
  };
}

/* --------------------------- mappers (API 10) ----------------------- */

/** Flattens the product→variants picker payload into a flat variant list. */
function mapVariants(res: unknown): SuggestionVariant[] {
  const body = getProp(res, "results") ?? getProp(res, "data") ?? res;
  const rows = asArray(getProp(body, "data") ?? body);
  const out: SuggestionVariant[] = [];
  for (const product of rows) {
    const productName = str(pick(product, "name", "product_name"));
    const variants = asArray(pick(product, "variants"));
    if (variants.length === 0) {
      // Some payloads flatten a single variant onto the product row.
      const variantId = str(pick(product, "variant_id", "id"));
      if (variantId) {
        out.push({
          variantId,
          productName,
          variantName: str(pick(product, "variant_name")),
          sku: str(pick(product, "sku")),
          price: str(pick(product, "price", "base_price")),
          image: str(pick(product, "image", "thumbnail")),
        });
      }
      continue;
    }
    for (const v of variants) {
      out.push({
        variantId: str(pick(v, "id", "variant_id")),
        productName,
        variantName: str(pick(v, "name", "variant_name")),
        sku: str(pick(v, "sku")),
        price: str(pick(v, "price", "base_price")),
        image: str(pick(v, "image", "thumbnail")),
      });
    }
  }
  return out.filter((v) => v.variantId);
}

/* ------------------------------ endpoints --------------------------- */

const suggestionTag = (orderId: string) =>
  ({ type: "Intents", id: `SUGGESTIONS-${orderId}` }) as const;

export const substitutionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // API 6 — latest verified report lines + partner + port for an order.
    getVerificationDetail: builder.query<VerificationDetail, string>({
      query: (orderId) => ({
        url: SUBSTITUTION_ENDPOINTS.VERIFICATION_DETAIL,
        method: "GET",
        params: { order_id: orderId },
      }),
      transformResponse: mapVerificationDetail,
      providesTags: (_r, _e, orderId) => [suggestionTag(orderId)],
    }),

    // API 9 — staged (unreleased) + released suggestions for an order.
    getSuggestedItems: builder.query<StagedSuggestion[], string>({
      query: (orderId) => ({
        url: SUBSTITUTION_ENDPOINTS.FETCH_SUGGESTED_ITEMS,
        method: "GET",
        params: { order_id: orderId },
      }),
      transformResponse: (res: unknown): StagedSuggestion[] => {
        const body = getProp(res, "data") ?? res;
        const rows = asArray(getProp(body, "suggestions") ?? getProp(body, "results") ?? body);
        return rows.map(mapStaged);
      },
      providesTags: (_r, _e, orderId) => [suggestionTag(orderId)],
    }),

    // API 10 — variant picker: products at a port (+ optional search).
    getSuggestionProducts: builder.query<SuggestionVariant[], { portId: string; search?: string }>({
      query: ({ portId, search }) => ({
        url: SUBSTITUTION_ENDPOINTS.SUGGESTION_PRODUCTS,
        method: "GET",
        params: { port_id: portId, search: search || undefined, page_size: 50 },
      }),
      transformResponse: mapVariants,
    }),

    // API 11 — stage an existing catalog variant as a suggestion.
    stageSuggestion: builder.mutation<unknown, { orderId: string; body: StageSuggestionPayload }>({
      query: ({ body }) => ({
        url: SUBSTITUTION_ENDPOINTS.SUGGEST,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [suggestionTag(orderId)],
    }),

    // API 12 — create a brand-new product + variant and stage it as a
    // suggestion. Endpoint wired; the create-product form is a follow-up.
    suggestNewProduct: builder.mutation<
      unknown,
      { orderId: string; body: SuggestNewProductPayload }
    >({
      query: ({ body }) => ({
        url: SUBSTITUTION_ENDPOINTS.SUGGEST_NEW_PRODUCT,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { orderId }) => [suggestionTag(orderId)],
    }),

    // API 13 — release ALL staged suggestions for the order to the sailor.
    releaseSuggestions: builder.mutation<unknown, ReleaseSuggestionsPayload>({
      query: (body) => ({
        url: SUBSTITUTION_ENDPOINTS.RELEASE_SUGGESTION,
        method: "POST",
        body,
      }),
      invalidatesTags: (_r, _e, { order_id }) => [
        suggestionTag(order_id),
        { type: "Intents", id: order_id },
        { type: "Intents", id: "PARTIAL-LIST" },
        { type: "Intents", id: "STATS" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVerificationDetailQuery,
  useGetSuggestedItemsQuery,
  useLazyGetSuggestionProductsQuery,
  useStageSuggestionMutation,
  useSuggestNewProductMutation,
  useReleaseSuggestionsMutation,
} = substitutionApi;
