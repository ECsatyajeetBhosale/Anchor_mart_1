import { toStoredPath } from "@/features/media";
import { VARIANT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import { allImageUrls, primaryImageUrl } from "../lib/variantImage";
import type {
  AddVariantPayload,
  DeleteVariantResult,
  GetVariantsParams,
  ProductVariant,
  SetVariantExpressResult,
  SetVariantSourceableResult,
  UpdateVariantPayload,
  UpdateVariantResult,
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
    /**
     * Kept nullable rather than coerced to 0: `null` means "not sold as
     * express", and 0 would read as free. The floor is 0.01, so the two can
     * never be confused downstream.
     */
    expressPrice:
      getProp(raw, "express_price") === null || getProp(raw, "express_price") === undefined
        ? null
        : Number(getProp(raw, "express_price")),
    isPrimary: getProp(raw, "is_primary") === true,
    attributes:
      attrs && typeof attrs === "object" && !Array.isArray(attrs)
        ? (attrs as Record<string, unknown>)
        : {},
    images: toImagePaths(getProp(raw, "images")),
    imageUrls: allImageUrls(getProp(raw, "images")),
    imageUrl: primaryImageUrl(getProp(raw, "images")),
    isActive: getProp(raw, "is_active") !== false,
    isExpress: getProp(raw, "is_express") === true,
    adminSourceable: getProp(raw, "admin_sourceable") !== false,
    // Inherited from the parent and read-only. Kept because both `set-express/`
    // and deleting the last express variant rewrite it — this is where a variant
    // toggle moving its product between shelves becomes visible.
    catalogType: pick(raw, "catalog_type"),
    aboutProduct: pick(raw, "about_product"),
    createdAt: pick(raw, "created_at"),
    updatedAt: pick(raw, "updated_at"),
    // Defaults to visible when absent, so a deployment predating these fields
    // does not paint every row with a blocker it never reported.
    isSailorVisible: getProp(raw, "is_sailor_visible") !== false,
    visibilityBlockers: (asArray(getProp(raw, "sailor_visibility_blockers")) ?? [])
      .map((b) => (typeof b === "string" ? b : ""))
      .filter(Boolean),
    isSailorOrderable: getProp(raw, "is_sailor_orderable") !== false,
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
        // `page_size`, not `limit` — a raw `limit` is silently ignored and
        // yields the default 10. `admin_sourceable` is deliberately never sent:
        // the endpoint ignores it rather than rejecting it, so it would look
        // like a working filter while returning everything.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          product: params.productId || undefined,
          is_active: params.isActive === undefined ? undefined : String(params.isActive),
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

    updateVariant: builder.mutation<
      UpdateVariantResult,
      { id: string; body: UpdateVariantPayload }
    >({
      query: ({ id, body }) => ({
        url: VARIANT_ENDPOINTS.UPDATE_VARIANT(id),
        method: "PATCH",
        body,
      }),
      /**
       * Read for its `cascades` block: this endpoint can move a *second* object
       * (deactivating the last express-ready SKU demotes its product), and until
       * 2026-08-18 the response was the variant alone, so that went unreported.
       */
      transformResponse: (res: unknown): UpdateVariantResult => {
        const c = getProp(res, "cascades");
        return {
          cascades: {
            productId: pick(c, "product_id") || null,
            productCatalogType: pick(c, "product_catalog_type") || null,
            productCascaded: getProp(c, "product_cascaded") === true,
            sourceProductId: pick(c, "source_product_id") || null,
            sourceProductCatalogType: pick(c, "source_product_catalog_type") || null,
            sourceProductCascaded: getProp(c, "source_product_cascaded") === true,
            sourceNewPrimaryVariantId: pick(c, "source_new_primary_variant_id") || null,
          },
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "Products", id: "PARTIAL-LIST" },
      ],
    }),

    /**
     * Soft-deletes a variant (`is_deleted`, `is_active=False`, stamped).
     *
     * **Guarded**: deleting a product's only variant is a 400 — "Add another
     * variant first, or delete the product." That guard is what stops the delete
     * path from producing a zero-variant product, which would vanish from every
     * sailor-facing list. It is an app-level count rather than a DB constraint,
     * so two concurrent deletes of the last two variants can both see a sibling
     * and both proceed (the RC-4 pattern; logged, not fixed here).
     *
     * **Also demotes the product's catalog** when the variant deleted was the
     * last express one — the same invariant `set-express/` maintains, which this
     * path did not honour until 2026-08-17. Hence the cascade fields on the
     * response and the Products invalidation below.
     *
     * No guard for open orders, carts or live deals: a deal on the deleted
     * variant silently drops out of `on_deal`, and cart rows survive but stop
     * being orderable.
     */
    deleteVariant: builder.mutation<DeleteVariantResult, string>({
      query: (id) => ({ url: VARIANT_ENDPOINTS.DELETE_VARIANT(id), method: "DELETE" }),
      transformResponse: (res: unknown): DeleteVariantResult => ({
        message: pick(res, "message"),
        productCatalogType: pick(res, "product_catalog_type") || null,
        productCascaded: getProp(res, "product_cascaded") === true,
        newPrimaryVariantId: pick(res, "new_primary_variant_id") || null,
      }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
        // The product may have just been demoted off the express shelf.
        { type: "ExpressItems", id: "CATALOG-LIST" },
        { type: "ExpressItems", id: "STATS" },
      ],
    }),

    /**
     * Variant-level express flag — **and the product's catalog with it**.
     *
     * Flagging a variant express up-cascades its product to
     * `catalog_type=express`; un-flagging the last express variant demotes the
     * product back to `regular` or `marine_emergency`, per its category scope.
     * So this is a product-level write wearing a variant-level name, and the
     * response reports the resulting `product_catalog_type` plus whether this
     * call is what moved it.
     *
     * The Products caches were **not** invalidated here until 2026-08-17, so the
     * products list and stats went stale behind every express toggle. The
     * sourceable mutation below always got this right, which is what made the
     * omission findable.
     */
    /**
     * The **only** way to make a SKU sellable as express — the price travels
     * with the flag.
     *
     * Flagging on needs an `expressPrice` unless the SKU already carries one
     * (re-send it to change the price). Un-flagging **clears** the price, so a
     * price must not be sent with `false` — that is its own 400 — and
     * re-enabling later means quoting it again.
     */
    setVariantExpress: builder.mutation<
      SetVariantExpressResult,
      { id: string; isExpress: boolean; expressPrice?: string }
    >({
      query: ({ id, isExpress, expressPrice }) => ({
        url: VARIANT_ENDPOINTS.SET_EXPRESS(id),
        method: "POST",
        body: {
          is_express: isExpress,
          // Only ever alongside `true`; with `false` it is a 400.
          ...(isExpress && expressPrice ? { express_price: expressPrice } : {}),
        },
      }),
      transformResponse: (res: unknown, _meta, { isExpress }): SetVariantExpressResult => ({
        message: pick(res, "message"),
        // Fall back to what was requested so an older deployment still yields a
        // usable result rather than a silent `false`.
        isExpress:
          typeof getProp(res, "is_express") === "boolean"
            ? (getProp(res, "is_express") as boolean)
            : isExpress,
        expressPrice:
          getProp(res, "express_price") === null || getProp(res, "express_price") === undefined
            ? null
            : Number(getProp(res, "express_price")),
        // Null rather than "" when absent — "the API didn't say" is not a catalog.
        productCatalogType: pick(res, "product_catalog_type") || null,
        productExpressBasePrice:
          getProp(res, "product_express_base_price") === null ||
          getProp(res, "product_express_base_price") === undefined
            ? null
            : Number(getProp(res, "product_express_base_price")),
        productCascaded: getProp(res, "product_cascaded") === true,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
        { type: "ExpressItems", id: "STATS" },
        // This write can change `product.catalog_type`, which moves the product
        // between the catalog filters and the per-type stat cards.
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
      ],
    }),

    /**
     * Variant-level sourceability, at `/product-variants/set-admin-sourceable/`
     * (Flow 29a §5). A mirror under `/products/product-variants/` (Flow 17 §3)
     * was once documented and reachable through a `useProductsNamespace` escape
     * hatch; no caller ever passed it, and the backend serves no such route —
     * it 404s while the canonical path 401s — so both are gone.
     *
     * **The response reports the up-cascade** (Flow 29a §5, added GA11/GA12 on
     * 2026-07-30): setting a variant sourceable also turns the *product's*
     * master switch on when it was off, since a sourceable variant implies a
     * sourceable product. Before those fields existed a UI built to this
     * contract showed a stale product row after a cascade — which is why the
     * product caches are invalidated below and not only the variant ones.
     *
     * The cascade is **up-only**: setting a variant `false` never touches the
     * product, so `productAdminSourceable` can come back `true` on a call that
     * turned the variant off.
     */
    setVariantSourceable: builder.mutation<
      SetVariantSourceableResult,
      { id: string; adminSourceable: boolean }
    >({
      query: ({ id, adminSourceable }) => ({
        url: VARIANT_ENDPOINTS.SET_ADMIN_SOURCEABLE(id),
        method: "POST",
        body: { admin_sourceable: adminSourceable },
      }),
      transformResponse: (
        res: unknown,
        _meta,
        { adminSourceable },
      ): SetVariantSourceableResult => ({
        message: pick(res, "message"),
        // Fall back to what was just requested, so a deployment predating
        // GA11/GA12 still yields a usable result rather than a silent `false`.
        adminSourceable:
          typeof getProp(res, "admin_sourceable") === "boolean"
            ? (getProp(res, "admin_sourceable") as boolean)
            : adminSourceable,
        // "Always present, cascade or not" — but null rather than false when a
        // response omits it, so "the API didn't say" is not read as "off".
        productAdminSourceable:
          typeof getProp(res, "product_admin_sourceable") === "boolean"
            ? (getProp(res, "product_admin_sourceable") as boolean)
            : null,
        // True only when *this* call is what turned the product master on.
        productCascaded: getProp(res, "product_cascaded") === true,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Variants", id },
        { type: "Variants", id: "PARTIAL-LIST" },
        { type: "ExpressItems", id: "CATALOG-LIST" },
        // The product master may have just flipped underneath us.
        { type: "Products", id: "PARTIAL-LIST" },
        { type: "Products", id: "STATS" },
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
