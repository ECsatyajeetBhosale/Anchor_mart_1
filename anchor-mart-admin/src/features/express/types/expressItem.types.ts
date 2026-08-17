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
