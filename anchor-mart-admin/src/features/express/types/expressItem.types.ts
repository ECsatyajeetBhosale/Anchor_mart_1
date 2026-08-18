/**
 * An express order row as returned by GET /superadmin/express/orders/.
 * Dates arrive pre-formatted from the backend (e.g. "June 23, 2026, 02:18 AM").
 */
export interface ExpressOrder {
  id: string;
  order_number: string;
  /** Machine status, e.g. "delivered". */
  status: string;
  /** Human status label, e.g. "Delivered". */
  status_display: string;
  customer_name: string;
  customer_email: string;
  /** Decimal string, e.g. "2027.42". */
  total_amount: string;
  item_count: number;
  port_name: string | null;
  anchorage_name: string | null;
  /** Pre-formatted timestamp, e.g. "June 23, 2026, 02:18 AM". */
  ship_arrival_date: string | null;
  payment_completed_at: string | null;
  is_fastest_delivery: boolean;
  is_express: boolean;
  is_emergency: boolean;
  partner_allocated: boolean;
  partner_name: string | null;
  has_location_request: boolean;
  created_at: string | null;
}

/** DRF paginated envelope for the express orders list (plain `results` array). */
export interface ExpressOrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ExpressOrder[];
}

/**
 * A row of the express variant catalog (`GET /superadmin/express/items/`).
 * The endpoint returns `ProductVariantSerializer` records under `data`, so the
 * flat shape below is produced by the API transform.
 */
export interface ExpressItem {
  /** Variant UUID — the row key. */
  id: string;
  /** Parent product UUID. */
  productId: string;
  /** Product name. */
  name: string;
  /** Variant SKU. */
  sku: string;
  /** Primary image URL (falls back to the first), or "" when none. */
  imageUrl: string;
  /** Formatted price, e.g. "$120.00". */
  price: string;
  /** Attribute summary, e.g. "color: red · size: M". */
  attributes: string;
  /** Long description, or "" — shown as the row's hover title. */
  about: string;
  /**
   * Effective sourceability — the API reports this as product AND variant, so a
   * true here means the item is genuinely orderable.
   */
  adminSourceable: boolean;
  /**
   * The **variant-level** express flag. Not redundant with the row's presence
   * in this list: the list is scoped by the parent product's `catalog_type`, so
   * a variant of an express product appears here whether or not it is itself
   * flagged for express. `false` means it ships in the express catalog's
   * product but is not express-orderable on its own.
   */
  isExpress: boolean;
  /**
   * The SKU's express charge. `null` = **pending**: on an express product but
   * not sellable as express — refused by the express cart and again at the till.
   * `isExpress && expressPrice !== null` is the only Express-ready combination.
   */
  expressPrice: number | null;
  /** The product's default SKU — what a product-level express-price edit writes to. */
  isPrimary: boolean;
  isActive: boolean;
  /**
   * Whether a sailor can actually **see** this row in the express catalog.
   *
   * Server-computed from `ProductVariant.catalog_visibility_blockers()`, which
   * sits beside `is_orderable()` on the model so the admin view cannot drift
   * from the customer querysets it describes. It is not composable client-side:
   * three of its inputs (`product.is_active`, `product.is_deleted`,
   * `product.is_internal`) are not on the variant payload at all.
   */
  isSailorVisible: boolean;
  /**
   * Why not, when `isSailorVisible` is false. A **stable, add-only contract** —
   * keys are never renamed — so an unrecognised one is rendered raw rather than
   * dropped.
   */
  visibilityBlockers: string[];
  /**
   * Whether a sailor could **buy** it. Deliberately a different question from
   * visibility: a product with sourcing switched off stays browsable with an
   * unavailable badge, so it is visible and not orderable. `is_orderable()`
   * also ignores the express flag — it is the cart gate, not the browse gate.
   */
  isSailorOrderable: boolean;
}

/** Transformed express-items result: total count + UI rows. */
export interface ExpressItemListResult {
  count: number;
  items: ExpressItem[];
}

/** Query params for the express variant catalog (Flow 09 API 3). */
export interface GetExpressCatalogParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  productId?: string;
  /**
   * **Not cross-checked server-side.** Each bound is validated on its own, so an
   * inverted range (`min_price=100&max_price=1`) is a 200 with zero rows rather
   * than a 400 — unlike the customer catalog list, which rejects it. Any UI that
   * exposes these must validate the pair itself, or an operator sees "no
   * results" for what is really a typo.
   *
   * Neither is currently surfaced on the Items tab, so the trap is documented
   * rather than guarded — there is nothing yet to guard.
   */
  minPrice?: string;
  maxPrice?: string;
  /**
   * `"true"` / `"false"`, filtering on the **effective** sourceable value —
   * product AND variant, not the raw variant column. `"false"` therefore means
   * "either flag is off", which is the correct notion of "not orderable" and is
   * exactly what express checkout rejects a line for.
   */
  adminSourceable?: string;
  /** `"true"` / `"false"` — variant liveness, independent of sourceability. */
  isActive?: string;
  /**
   * `"true"` / `"false"` — the **variant's own** express flag.
   *
   * `false` is the actionable view this screen exists for: variants of express
   * products that nobody has flagged, which is exactly the set a sailor cannot
   * see. Junk is a 400, like every other boolean.
   *
   * **Naming collision worth knowing.** On `get-product-variants/` the same
   * param is a legacy alias meaning *"the parent product is express"*. Here the
   * product is already fixed by the endpoint's scope, so it means *"the variant
   * is flagged"*. One param name, two meanings, two endpoints.
   */
  isExpress?: string;
  /** Literal phrase the API expects: "low to high" | "high to low". */
  sortByPrice?: string;
  /** Same phrases as `sortByPrice`, ranked by average rating. */
  sortByPopularity?: string;
  /** "newest_first" | "oldest_first". */
  sortByRelevance?: string;
}

/**
 * Query params for `express/stats/` — the **narrowing** subset of
 * {@link GetExpressCatalogParams}.
 *
 * Backend confirmed (2026-08-17) this is exactly the `express/items/` set: both
 * halves run the *same* filter function over the same queryset, so a param
 * cannot be honoured by the table and ignored by the cards. Unknown names are
 * dropped by both alike, and a malformed value of a known one is a 400 on both —
 * so the two can't silently disagree in either direction.
 *
 * Paging and sorting are absent on purpose: neither changes an aggregate, and
 * sending them would imply the cards follow a page.
 *
 * ⚠️ `items.total_products` counts express products **represented in the
 * filtered variant table**, so it is bounded by `total_variants` — a product
 * with no live variant is absent here, and equally unreachable from the table.
 * The unbounded product-level figure lives on `express/products/`.
 */
export type GetExpressStatsParams = Pick<
  GetExpressCatalogParams,
  | "search"
  | "categoryId"
  | "productId"
  | "minPrice"
  | "maxPrice"
  | "adminSourceable"
  | "isActive"
  | "isExpress"
> & {
  /** Per **variant** here — a SKU whose sibling is on deal does not match. */
  onDeal?: string;
  /** Read through the parent product, which is where the flag lives. */
  isTopRated?: string;
};

/**
 * Catalog half of the express stats payload — **exactly these eight keys**,
 * pinned by a backend test. The flow doc describes products and variants as two
 * separate aggregates; the API returns them flattened into one object, so they
 * are modelled as sent.
 *
 * **Mixed grain**: five product counts and three variant counts share this flat
 * object. `sourceable_products` is the product master flag alone, while
 * `sourceable_variants` is the effective AND *plus* `is_active` — so the two
 * must never be presented as a pair or read as a ratio.
 */
export interface ExpressItemStats {
  total_products?: number;
  active_products?: number;
  /** Products whose master sourceable switch is on. */
  sourceable_products?: number;
  top_rated?: number;
  on_deal?: number;
  total_variants?: number;
  active_variants?: number;
  /** Effective sourceable — product AND variant, not the raw variant column. */
  sourceable_variants?: number;
}

/**
 * Order-volume half. `total_orders` is the aggregate the backend computes and
 * the siblings are conditional counts within it, so the two must never be summed
 * together.
 *
 * **The breakdown is not exhaustive**: it does not cover every post-payment
 * status — `payment_received` falls into no bucket — so
 * `sum(buckets) <= total_orders`, often strictly. Anything rendering these as
 * parts of a whole (a stacked bar, a "total" row) must derive the remainder
 * rather than assume it is zero.
 */
export interface ExpressOrderStats {
  total_orders?: number;
  /**
   * Unpaid express orders. Added 2026-08-17 with the order split: this screen
   * is now the only place an unpaid express order appears, so the count needed
   * somewhere to live. The intents screen no longer carries express at all.
   */
  awaiting_payment?: number;
  /** Paid but not yet worked — the head of the express queue. */
  new?: number;
  in_progress?: number;
  delivered?: number;
  delivery_failed?: number;
  cancelled?: number;
  refunded?: number;
}

/**
 * `GET /superadmin/express/stats/` (Flow 09 API 4) — catalog counts and order
 * volume in one call, under two top-level keys. Every field is optional so a
 * partial response degrades to 0 rather than blanking a card.
 *
 * **Takes no query params, deliberately, and should not be made to.** One call
 * serves two tabs: `category_id` or `min_price` are meaningless for the orders
 * half, so following the Items tab's filters would make the item cards track the
 * table while the order cards described something unrelated. The cards are
 * therefore labelled whole-catalog — which is accurate rather than a hedge,
 * since `total_variants` already counts exactly the tab's unfiltered population
 * (every variant of an express product, flagged or not).
 */
export interface ExpressStats {
  items?: ExpressItemStats;
  orders?: ExpressOrderStats;
}

/**
 * Query params for `express/products/` (§2.2) — the vocabulary shared by all
 * three product catalogs (`get-products/`, `express/products/`,
 * `emergency-spares/products/`).
 *
 * No `catalog_type` / `is_express`: those are only accepted where a surface
 * serves more than one type, and this one is already scoped to express.
 *
 * Default order is `-created_at`, which also tiebreaks `sortByPrice`.
 */
export interface GetExpressProductsParams {
  page?: number;
  limit?: number;
  /** Name **or** description **or** the SKU of any live variant. */
  search?: string;
  /** Category UUID; a malformed one is a 400, not an empty list. */
  category?: string;
  isActive?: boolean;
  /** The product-level sourceable master switch. */
  adminSourceable?: boolean;
  onDeal?: boolean;
  isTopRated?: boolean;
  /**
   * Bounds read the **variants'** price, never `base_price` — that is a display
   * "from" figure, not what anyone is charged. `min > max` is a 400, as is a
   * non-numeric bound; neither degrades to an empty list.
   */
  minPrice?: string;
  maxPrice?: string;
  /** "low to high" | "high to low"; sorts on the cheapest live variant. */
  sortByPrice?: string;
}
