import { toStoredPath } from "@/features/media";
import { PRODUCT_ENDPOINTS, VARIANT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddVariantPayload,
  GetVariantsParams,
  ProductVariant,
  UpdateVariantPayload,
  VariantListResult,
} from "../types/variant.types";

/** Safe property read off an unknown value. */
function getProp(value: unknown, key: string): unknown {
  return value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined;
}

/** Returns the value when it's an array, otherwise null. */
function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

/** First present key off an object, coerced to a trimmed string; else "". */
function pick(obj: unknown, ...keys: string[]): string {
  for (const k of keys) {
    const v = getProp(obj, k);
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number") return String(v);
  }
  return "";
}

/**
 * Normalises the `images` field to the media-root relative paths write payloads
 * expect.
 *
 * Two shapes have to be flattened — bare strings and `{ image }` objects — and
 * the value is then run through {@link toStoredPath}, because reads come back
 * as absolute CloudFront URLs. Without that last step an edit would PATCH
 * `https://cdn…/media/variant_images/x.png` straight back, and the serializer's
 * directory-prefix check rejects it with a 400.
 */
function toImagePaths(value: unknown): string[] {
  const rows = asArray(value);
  if (!rows) return [];
  return rows
    .map((row) => (typeof row === "string" ? row : pick(row, "image", "image_url", "url")))
    .map(toStoredPath)
    .filter((s): s is string => Boolean(s));
}

/**
 * Absolute URL of the primary image (falling back to the first), for rendering.
 * Unlike {@link toImagePaths} this keeps the URL intact — it never round-trips
 * to the API, so the stored-path normalisation would only break the `<img>`.
 */
function primaryImageUrl(value: unknown): string {
  const rows = asArray(value);
  if (!rows?.length) return "";
  const primary = rows.find((row) => getProp(row, "is_primary") === true) ?? rows[0];
  return typeof primary === "string" ? primary : pick(primary, "image", "image_url", "url");
}

/** Maps a raw variant record onto the flat UI row. */
function toVariant(raw: unknown, index: number): ProductVariant {
  const product = getProp(raw, "product");
  const attrs = getProp(raw, "attributes");
  return {
    id: pick(raw, "id", "variant_id") || `variant-${index}`,
    // `product` is a UUID string on write payloads and a nested object on reads.
    productId: typeof product === "string" ? product : pick(product, "id"),
    productName: pick(raw, "product_name") || pick(product, "name") || "-",
    sku: pick(raw, "sku") || "-",
    price: Number(getProp(raw, "price") ?? 0),
    attributes:
      attrs && typeof attrs === "object" && !Array.isArray(attrs)
        ? (attrs as Record<string, unknown>)
        : {},
    images: toImagePaths(getProp(raw, "images")),
    imageUrl: primaryImageUrl(getProp(raw, "images")),
    isActive: getProp(raw, "is_active") !== false,
    isExpress: getProp(raw, "is_express") === true,
    adminSourceable: getProp(raw, "admin_sourceable") !== false,
  };
}

/** Extracts rows + total from whichever envelope the endpoint returns. */
function extractList(res: unknown): { count: number; rows: unknown[] } {
  const results = getProp(res, "results");
  const rows =
    asArray(getProp(results, "data")) ??
    asArray(results) ??
    asArray(getProp(res, "data")) ??
    asArray(res) ??
    [];
  const countRaw = getProp(res, "count") ?? getProp(results, "count");
  return { count: typeof countRaw === "number" ? countRaw : rows.length, rows };
}

export const variantApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVariants: builder.query<VariantListResult, GetVariantsParams>({
      query: (params) => ({
        url: VARIANT_ENDPOINTS.GET_VARIANTS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          product: params.productId || undefined,
        },
      }),
      transformResponse: (res: unknown): VariantListResult => {
        const { count, rows } = extractList(res);
        return { count, variants: rows.map(toVariant) };
      },
      providesTags: (result) =>
        result?.variants
          ? [
              ...result.variants.map(({ id }) => ({ type: "Variants" as const, id })),
              { type: "Variants", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Variants", id: "PARTIAL-LIST" }],
    }),

    /** Detail by `product_variant_id` query param (not a path segment). */
    getVariant: builder.query<ProductVariant, string>({
      query: (variantId) => ({
        url: VARIANT_ENDPOINTS.GET_VARIANT,
        method: "GET",
        params: { product_variant_id: variantId },
      }),
      transformResponse: (res: unknown): ProductVariant => {
        const node = getProp(res, "data") ?? res;
        return toVariant(node, 0);
      },
      providesTags: (_r, _e, id) => [{ type: "Variants", id }],
    }),

    createVariant: builder.mutation<unknown, AddVariantPayload>({
      query: (body) => ({ url: VARIANT_ENDPOINTS.ADD_VARIANT, method: "POST", body }),
      // A new SKU changes the parent product's variant count, so the product
      // list and stats are refreshed alongside the variant list.
      invalidatesTags: (_r, _e, { product }) => [
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "Products", id: product },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),

    updateVariant: builder.mutation<unknown, { id: string; body: UpdateVariantPayload }>({
      query: ({ id, body }) => ({
        url: VARIANT_ENDPOINTS.UPDATE_VARIANT(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "Products", id: "PARTIAL-LIST" },
      ],
    }),

    deleteVariant: builder.mutation<unknown, string>({
      query: (id) => ({ url: VARIANT_ENDPOINTS.DELETE_VARIANT(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),

    /** Variant-level express flag. Also moves the express catalog counts. */
    setVariantExpress: builder.mutation<unknown, { id: string; isExpress: boolean }>({
      query: ({ id, isExpress }) => ({
        url: VARIANT_ENDPOINTS.SET_EXPRESS(id),
        method: "POST",
        body: { is_express: isExpress },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
        { type: "ExpressItems", id: "STATS" },
      ],
    }),

    /**
     * Variant-level sourceability. Two routes exist for this — the canonical
     * `/product-variants/set-admin-sourceable/` and a mirror under
     * `/products/product-variants/`. The former is used; `useProductsNamespace`
     * switches to the mirror if a deployment only exposes that one.
     */
    setVariantSourceable: builder.mutation<
      unknown,
      { id: string; adminSourceable: boolean; useProductsNamespace?: boolean }
    >({
      query: ({ id, adminSourceable, useProductsNamespace }) => ({
        url: useProductsNamespace
          ? PRODUCT_ENDPOINTS.SET_VARIANT_ADMIN_SOURCEABLE(id)
          : VARIANT_ENDPOINTS.SET_ADMIN_SOURCEABLE(id),
        method: "POST",
        body: { admin_sourceable: adminSourceable },
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetVariantsQuery,
  useGetVariantQuery,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useDeleteVariantMutation,
  useSetVariantExpressMutation,
  useSetVariantSourceableMutation,
} = variantApi;
