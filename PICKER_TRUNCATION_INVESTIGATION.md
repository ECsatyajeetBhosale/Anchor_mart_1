# Read-only investigation — the 13 `limit: 100` picker callers, and the partner port-search question

**Date:** 11 August 2026
**Companion to:** [API_INTEGRATION_AUDIT.md](./API_INTEGRATION_AUDIT.md) · [API_INTEGRATION_FIXES.md](./API_INTEGRATION_FIXES.md)
**Code changed: none.** This is an investigation only. No frontend or backend file was modified.

---

## 1. Headline

Two facts reframe the whole problem, and both are good news:

**All five endpoints behind these pickers already support server-side `search`.** Nothing here is
blocked on the backend — the "Backend support required" bucket is **empty**.

**All five frontend query hooks already forward a `search` param.** So no API-layer change is
needed either; every fix is component-only.

And there is already a **working precedent for the fix** in this codebase:
`OrderHandoverDialog.tsx:146-160` puts a `<Search debounceMs={300}>` above a `<DropdownSelect>` and
feeds the term into the query server-side. No new shared component has to be designed — the pattern
exists and can be copied.

---

## 2. Verdict table

| # | Caller | Entity | Verdict |
| - | ------ | ------ | ------- |
| 1 | `rewards/components/BonusPointsTab.tsx:74` | Sailors | **Fix now** |
| 2 | `rewards/components/CouponAssignmentsTab.tsx:47` | Sailors | **Fix now** |
| 3 | `rewards/components/DealFormDrawer.tsx:61` | Products | **Fix now** |
| 4 | `analytics/hooks/useProductSales.ts:25` | Products | **UX decision required** |
| 5 | `rewards/components/DealFormDrawer.tsx:67` | Variants (scoped to 1 product) | No issue |
| 6 | `products/components/ProductsPage.tsx:86` | Categories (general) | No issue — monitor |
| 7 | `products/components/ProductAddDrawer.tsx:87` | Categories (general) | No issue — monitor |
| 8 | `products/components/ProductEditDrawer.tsx:118` | Categories (general) | No issue — monitor |
| 9 | `special-requests/components/GenerateBillDialog.tsx:57` | Categories (general) | No issue — monitor¹ |
| 10 | `intents/components/SuggestReplacementPanel.tsx:81` | Categories (general) | No issue — monitor |
| 11 | `spares/components/SparesPage.tsx:117` | Categories (marine) | No issue |
| 12 | `spares/components/SpareProductAddDrawer.tsx:57` | Categories (marine) | No issue |
| 13 | `spares/components/SpareProductEditDrawer.tsx:57` | Categories (marine) | No issue |

**Fix now: 3 · UX decision: 1 · No issue: 9 · Backend support required: 0**

¹ See §6 — this one also filters client-side on a field the server can filter on.

---

## 3. Backend capability matrix (the evidence)

Every one of these views inherits `CustomPagination` (`max_page_size = 50`), so `limit: 100`
returns **at most 50 rows, with no error**.

| Endpoint | View | Cap | Server `search` matches | Other server filters |
| -------- | ---- | --- | ----------------------- | -------------------- |
| `/superadmin/sailors/sailors-list/` | `ListSailorsView` | 50 | `first_name`, `last_name`, `email`, `whatsapp_number` | `status` |
| `/superadmin/products/get-products/` | `ListGeneralProductsView` → `BaseListProductsView` | 50 | `name` (icontains) | `catalog_type`, `category`, `is_active`, `is_express`, `is_top_rated`, `on_deal` |
| `/superadmin/product-variants/get-product-variants/` | `ListVariantsView` | 50 | `search` | `product`, `catalog_type`, `is_active`, `is_express` |
| `/superadmin/categories/get-categories/` | `ListGeneralCategoriesView` → `BaseListCategoriesView` | 50 | `name` (icontains) | `is_active` |
| `/superadmin/emergency-spares/categories/` | `ListEmergencySpareCategoriesView` → `BaseListCategoriesView` | 50 | `name` (icontains) | `is_active` |

Frontend hooks already forwarding `search`: `sailorApi.ts:203`, `productApi.ts:58`,
`variantApi.ts:109`, `categoryApi.ts:29`, `emergencyCategoryApi.ts:31`.

---

## 4. Dataset sizes — measured, not assumed

Read-only counts from the **local dev database**. Dev data is a signal about shape, not a
prediction of production volume; the reasoning column is what carries the verdict.

| Entity | Dev count | Reasoning |
| ------ | --------: | --------- |
| Users, role `customer` (= sailors) | **50** | Already at the cap. Sailors are the platform's end users — the one entity guaranteed to grow without bound. |
| Products (live) | **50** | Already at the cap. A marine-supply catalog grows steadily. |
| Product variants (live) | 60 total, **max 3 per product** | The picker is scoped to one product. A single product exceeding 50 SKUs is implausible here. |
| Categories, `general` (live) | **9** | A curated taxonomy an admin maintains by hand. Slow-growing; 50 is a long way off. |
| Categories, `marine_emergency` (live) | **6** | As above, smaller still. |

Both entities that are **already at 50 in a dev seed** are the two that land in "Fix now". That is
not a coincidence — the seed was sized to a realistic page, and real deployments start above it.

---

## 5. The three "Fix now" cases

Each is a confirmed user-facing omission: the record exists, the server would return it, and the
admin cannot select it.

### 5.1 · Grant bonus points to a sailor — `BonusPointsTab.tsx:74`

```ts
useGetSailorsQuery({ page: 1, limit: 100 }, { skip: !grantOpen })
```

Requests 100, receives 50, renders them into a plain `DropdownSelect`. **An admin cannot grant
points to the 51st sailor.** With 50 customers already seeded, this fails on essentially any real
deployment. The action is also financial (`finance.credit`), so silently missing recipients is worse
than an inconvenience.

*Smallest safe fix:* add `<Search>` above the existing `DropdownSelect` and pass the term as
`search` into the query, exactly as `OrderHandoverDialog.tsx:146-160` does. No API change, no new
component.

### 5.2 · Assign a coupon to a sailor — `CouponAssignmentsTab.tsx:47`

Identical shape and identical fix. **An admin cannot assign a private coupon to the 51st sailor.**

### 5.3 · Choose the product for a Deal of the Day — `DealFormDrawer.tsx:61`

```ts
useGetProductsQuery({ page: 1, limit: 100 }, { skip: !isOpen })
```

The comment above it reads *"A generous page so the picker isn't silently truncated to one page"* —
the intent was explicitly to avoid this bug, and the cap defeats it. With 50 products already in
dev, **a deal cannot be created for the 51st product.**

*Smallest safe fix:* same pattern. Note the variant picker directly beneath it (line 67) is fine —
it is scoped by `product` and bounded.

---

## 6. The one UX decision

**`useProductSales.ts:25`** — the analytics product filter.

Same truncation, but a different question. The other two are *"select the record I mean"*; this one
is *"filter a chart"*. Options:

- a searchable picker, as above; or
- restrict it to the products that actually appear in the sales data being charted, which is a
  bounded set and arguably the more useful list; or
- leave it — an analyst filtering the top-50 catalog may be entirely adequate.

I have no evidence about which admins want. **Not a bug to fix blindly — a product call.**

**Also worth noting (minor, `GenerateBillDialog.tsx:57`):** it fetches 100 categories then filters
`c.scope === "general" && c.is_active` in the browser. The endpoint is already general-scope-only,
and `is_active` is a *server-side* filter it could pass instead. That compounds truncation — the 50
rows that arrive are narrowed further, so the visible option count can be well under 50 even when
more valid categories exist. `SuggestReplacementPanel.tsx:81` already does this correctly by passing
`isActive: true`. Small, safe, and independent of the picker question.

---

## 7. Partner port-search — accidental, not a requirement

You asked whether `port` matching was a genuine product requirement or incidental. **The evidence
says incidental.** Four independent signals, none of which relies on my judgement about what admins
want:

1. **The copy never promised it.** The placeholder is `"Search partners..."`. Pages in this codebase
   that mean a specific field set say so — `"Search by customer, email or order id…"`,
   `"Search admins by name or email…"`. Partners does not.
2. **It was there from the file's first commit.** `pt.p.toLowerCase()` is present in all five
   commits that touch `PartnersPage.tsx`, back to the initial migration. It was never added as a
   deliberate improvement; it arrived with the scaffold's "filter across the displayed columns"
   shape.
3. **Every other list page searches server-side, and always has.** `SailorsPage` has *no* client
   filter in any commit in its history. Partners was the outlier, not the standard.
4. **The only other client-side filter in the codebase is documented as a deliberate exception.**
   `ChatMonitorPage.tsx:77` says *"No list endpoint documents a `search` param, so filtering is
   client-side"* — a considered choice made because the server could not help. Partners had
   server-side `search` available the whole time and simply did not use it.

**Recommendation: do not ask the backend for `port` search on the strength of this.** It was never a
stated capability, and the field is visible in the table's Port column, so an admin can still see
it. If port filtering turns out to be genuinely wanted, the better request is a `port` **filter**
(a dropdown of ports) rather than free-text matching inside a name search — that is what
`AdminAssignablePartners` already does with `port_id`.

---

## 8. Suggested sequencing

1. **The three "Fix now" pickers** — one shared pattern, three components, no API or backend work.
2. **`GenerateBillDialog` server-side `is_active`** — trivial, independent.
3. **Live admin / sub-admin E2E pass** — as you said, this is now worth more than further static
   analysis. It is the only way to confirm the F2 permission hiding and the F1 server-side search
   actually behave, and it needs credentials I do not have.
4. **`useProductSales`** — after the E2E pass, once you know whether analysts hit the limit.
5. **Build-system cleanup (F5)** — separate commit, as agreed.

---

## 9. Method and limitations

- Endpoint→view mapping read from `admin_panel/urls/*.py`; paginators and query params read from
  the view and base-class source.
- Counts obtained from the local dev database with read-only ORM queries.
- **Nothing was exercised through the UI.** I have no admin credentials, so no picker was actually
  opened and no truncation was observed live. Every claim above is derived from source and from row
  counts. The one assumption carried throughout — that DRF caps rather than rejects an over-large
  `page_size` — is verified directly in the installed library
  (`rest_framework/pagination.py:256-263` → `_positive_int` line 30, `min(ret, cutoff)`).
