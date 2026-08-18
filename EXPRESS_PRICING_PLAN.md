# Express pricing — frontend plan

Plan of record for the 2026-08-18 express-pricing change: express is now a **second price
list**, not a delivery option on the regular price.

**Status:** awaiting go-ahead. Nothing implemented.

Source: `help folder/EXPRESS_PRICING_API.md`.

---

## 1 · The model, in one box

```
catalog_type = express        →  the PRODUCT is on the Express shelf
is_express + express_price    →  this SKU is sellable as Express
```

Two statements, not one. A SKU of an express product with no express price is **pending**:
hidden from the express shelf, and refused by the express cart and order (§4). So a product can
sit on the shelf with nothing on it that anyone can buy.

Three new fields: `Product.express_base_price`, `ProductVariant.express_price` (the
authoritative charge), `ProductVariant.is_primary` (the SKU a product-level price edit writes
to).

---

## 2 · ⚠️ Already broken — this ships first

The feature you asked for is currently **non-functional**, and two more paths 400 with it.

| # | What | Why |
|---|---|---|
| **B1** | **"Change catalog" → Express 400s every time** | [SetCatalogTypeDialog.tsx](anchor-mart-admin/src/features/products/components/SetCatalogTypeDialog.tsx) sends `{catalog_type}` and, for marine, `{category}`. `express_price` is now **required** moving TO express (§1.2). Its own comment still says moving to express "asks for nothing, deliberately" |
| **B2** | **Flagging a SKU express 400s** | `setVariantExpress` sends `{is_express: true}` only; the price now travels with the flag (§1.3) |
| **B3** | **The dialog will misreport the outcome** | It branches on `express_variants.flagged === 0`. That key is gone — the response now returns `ready` / `pending_price` (§1.2) |
| **B4** | **Un-flagging a SKU may 400** | The Express Items toggle sends `is_express: false`; §1.3 says that "must not be sent". See Q1 — this is the one I cannot resolve from the doc |

B1 is the headline: the Express Products screen, the express stat card and the whole express
catalog are reachable, but **nothing can be put on the shelf**.

---

## 3 · Missing capability — the pending state is invisible

Nothing in the admin can currently see or fix a pending SKU.

| # | Gap | Consequence |
|---|---|---|
| **M1** | `express_price` and `is_primary` are absent from the entire variants feature — types, columns, forms | No screen can show which SKUs are Express-ready, which are pending, or which one a product-level price edit will hit |
| **M2** | Variant add form has no express price field | Every SKU added to an express product lands **pending**, silently (§1.4) |
| **M3** | Variant edit form has no express price and no promote-to-primary | The per-SKU re-pricing path (§2) does not exist in the UI |
| **M4** | `no_express_price` is unmapped in `VISIBILITY_BLOCKER` | Renders as the raw key. The map deliberately prints unknown keys raw, so it degrades honestly — but this is exactly the blocker that now matters most |
| **M5** | `express_base_price` is on every product row and shown nowhere | The express catalog's price is invisible on the list |
| **M6** | `new_primary_variant_id` from delete-variant is ignored | Deleting the primary silently re-points which SKU a product-level edit writes to |

---

## 4 · The work

### Phase 1 — restore the move to express *(fixes B1, B3)*

1. `SetCatalogTypeResult`: replace `express_variants.flagged` with `ready` / `pending_price` /
   `live_total` / `unflagged_by_this_call`; add `priced_by_this_call[]` and
   `awaiting_express_price[]` (`{variant_id, sku, regular_price}`).
2. `setProductCatalogType`: accept `expressPrice` and an optional `expressPrices` map.
3. **SetCatalogTypeDialog** — the substance of this phase:
   - Selecting Express reveals a **required** Express Price input (the product-level figure).
   - The dialog already loads the product; list its live variants with a per-SKU express price
     input, seeded blank, sending `express_prices` for those filled in.
   - Show each SKU's `regular_price` beside its input as **context, not a default** — §1.2 is
     explicit that it is neither a proposed price nor a sign of sellability.
   - Single-variant products (42 of 51 live) collapse to just the one field.
   - On success, report honestly from the new response: "1 of 3 variants is Express-ready. 2
     require an Express price." Do **not** call it done when `pending_price > 0`.
4. Moving **away** from express: send no price (a 400 if sent), and say that it clears every
   variant's express price — irreversibly, per §1.2.

### Phase 2 — per-SKU express pricing *(fixes B2, M1, M2, M3)*

5. Variant types + transform: `express_price`, `is_primary`.
6. `setVariantExpress`: send `{is_express: true, express_price}`; surface the new
   `product_express_base_price` in the toast when the up-cascade filled the product's figure.
7. Variant **add** form: optional Express Price, shown only when the parent is express, with the
   consequence stated inline — omit it and the SKU is created pending, not sellable.
8. Variant **edit** form: Express Price (only while flagged), and **Set as primary**
   (`is_primary: true`; `false` is refused — promote another SKU instead).
9. Variants drawer: a **Primary** badge, and Express-ready / Pending state per row.

### Phase 3 — make the pending state visible *(fixes M4, M5, M6)*

10. Map `no_express_price` in `VISIBILITY_BLOCKER` — "No express price yet", distinct from
    "Not flagged express". Different causes, different fixes.
11. Express Items tab: a **Pending** filter preset (`?is_express=false`) as the worklist, and a
    "Set express price" row action calling `set-express/`.
12. `express_base_price` as a column on the express product list.
13. Surface `new_primary_variant_id` after deleting a primary variant.

### Phase 4 — verify

`tsc --noEmit`, `biome check`, build; then manually: move a multi-variant product to express and
confirm the pending count is reported; price a pending SKU; move it back and confirm the prices
clear.

---

## 5 · Questions for backend

**Q1 — blocking for B4.** §1.3 says `is_express: false` "must not be sent" to `set-express/`.
The Express Items screen has a toggle that un-flags a SKU today. Is `false` now rejected, and if
so what is the un-flag path — or does it still work and the line only means the price is cleared
as a side effect? I will not change that toggle until this is answered.

**Q2.** §2 says `update-product-variant/` takes `express_price` "only while the SKU is flagged
express", and §4 says to finish a pending SKU with `set-express/`. Confirm: pricing a *pending*
SKU must go through `set-express/`, and `update-product-variant/` is only for re-pricing an
already-ready one?

**Q3.** `express_prices` in §1.2 is keyed by `variant_id`. Does it accept SKUs that are already
Express-ready (re-pricing them in the same call), or only pending ones?

---

## 6 · Decision for product

**How much should the move-to-express dialog ask for?**

- **A — price everything up front** (recommended): the dialog lists every live variant and lets
  the admin price them in one pass. Matches `express_prices` being in the API for exactly this,
  and a product can reach the shelf fully sellable in one action.
- **B — primary only, finish later**: one field, then work the pending list on the Express Items
  screen. Smaller build; leaves products on the shelf part-sellable in the meantime.

A is the recommendation because of what pending *means* now (§4): the SKU is refused at the cart
and at the till. Shipping B means the normal outcome of "set this product to express" is a
product a sailor cannot buy.

---

## 7 · Risks

| Risk | Note |
|---|---|
| One product-level price cannot price a variant list | The backend refuses to guess (§1.2), and so should the UI — no pre-filling an express price from the regular one |
| `regular_price` looks like a suggestion | It is context only. Label it, never seed the input with it |
| Leaving express is destructive | It clears every variant's express price with no undo — the dialog must say so before, not after |
| Data already backfilled | Migrations `0067–0069` set every express variant's price from `price` and `is_primary` on the oldest live variant, so existing rows are already Express-ready — the pending state will mostly appear on **new** SKUs |
