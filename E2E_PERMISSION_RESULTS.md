# E2E pass — API permission boundary + pagination, executed

**Date:** 11 August 2026
**Mode:** §1–6 are **non-mutating** — no record was created, updated or deleted. The **addendum at
the end** is a separate write-path pass that did create and then remove test records; its scope and
cleanup are stated there.
**Companion to:** [API_INTEGRATION_AUDIT.md](./API_INTEGRATION_AUDIT.md) · [API_INTEGRATION_FIXES.md](./API_INTEGRATION_FIXES.md) · [PICKER_TRUNCATION_INVESTIGATION.md](./PICKER_TRUNCATION_INVESTIGATION.md)

Executed against the running backend as **two real accounts**, using DRF tokens already present in
the dev database:

- sub-admin — `sub.admin@anchormart.test` (role `admin`)
- super admin — `satyajeet@ecinfosolutions.com` (role `super_admin`)

**Method for staying non-mutating.** Every write probe targets a nonexistent UUID or sends an empty
body. A request the gate *denies* returns 403 before touching anything; a request the gate *allows*
falls through to validation (400) or object lookup (404) and equally changes nothing. So both
outcomes are provable without a single mutation.

The token file was deleted from the scratchpad after the run.

---

## 1. Result summary

| Check | Result |
| ----- | ------ |
| `GET /admin/me/` returns the documented shape | 🔴→✅ **Confirmed fixed** |
| Sub-admin feature list == `OPERATIONAL` | ✅ 21/21 exact match |
| Super-admin feature list == `ALL_FEATURES` | ✅ 31/31 exact match |
| Governance endpoints refuse a sub-admin | ✅ **16/16 return 403** |
| Operational endpoints admit a sub-admin | ✅ **7/7 return 400/404, never 403** |
| `page_size` over-request is silently capped | 🔴 **Reproduced** — see §4 |
| Server-side `search` filters correctly | ✅ Confirmed on partners and sailors |
| UI actually hides the controls | 🟡 **Unverified** — needs a browser or a human |

---

## 2. `GET /admin/me/` — the session-1 fix, confirmed live

Called with the sub-admin token, the endpoint returns:

```json
{
  "id": "75e6d484-6911-4b69-a38d-62802bb6c840",
  "email": "sub.admin@anchormart.test",
  "first_name": "Sub",
  "last_name": "Admin",
  "role": "admin",
  "features": ["catalog.announce", "catalog.availability", "catalog.manage", … ]
}
```

Two things this proves that static analysis could not:

1. **The path fix works.** `/superadmin/admin/me/` responds 200 with a token. The old
   `/superadmin/auth/me/` 404s.
2. **The `AdminUser` type is exactly right** — `id`, `email`, `first_name`, `last_name`, `role`,
   `features`, no more and no less. The `features` list is real, populated, and sorted.

---

## 3. The tier boundary — 16/16 denied, 7/7 admitted

### Feature lists match `ROLE_FEATURES` exactly

| | Count |
| - | ----: |
| sub-admin (`admin`) | **21** |
| super admin | **31** |
| held by super admin only | **10** |

The 10 super-only features are exactly the `GOVERNANCE` set, with nothing extra and nothing missing:

```
comms.service_broadcast · data.account_erasure · finance.config · finance.credit
finance.credit_override · finance.refund_override · governance.admin_users
governance.audit_integrity · platform.port_config · promo.coupon
```

`sub-only` is empty — the sub-admin holds no capability the super admin lacks, so the tiers nest as
the registry claims.

### Governance writes as sub-admin — all 403

```
POST   /superadmin/promotion/coupons/add/                     403
PATCH  /superadmin/promotion/coupons/update/{nil}/            403
DELETE /superadmin/promotion/coupons/delete/{nil}/            403
POST   /superadmin/promotion/coupons/assignments/add/         403
DELETE /superadmin/promotion/coupons/assignments/999999/      403
POST   /superadmin/promotion/bonus-points/add/                403
DELETE /superadmin/promotion/delete-bonus-points/             403
PATCH  /superadmin/promotion/loyalty/config/update/           403
POST   /superadmin/catalog/add-port/                          403
PUT    /superadmin/catalog/update-port/{nil}/                 403
DELETE /superadmin/catalog/delete-port/{nil}/                 403
PUT    /superadmin/admin/users/{nil}/update/                  403
PATCH  /superadmin/admin/users/{nil}/status/                  403
POST   /superadmin/admin/users/{nil}/reset-password/          403
DELETE /superadmin/admin/users/{nil}/delete/                  403
DELETE /superadmin/sailors/sailor/{nil}/delete/               403
```

**Every control hidden in F2 corresponds to an endpoint that genuinely refuses a sub-admin.** No
control was hidden that shouldn't have been.

### Operational writes as sub-admin — none blocked

```
POST   /superadmin/categories/add-category/                   400   (validation, not permission)
DELETE /superadmin/categories/delete-category/{nil}/          404   (object lookup)
POST   /superadmin/products/add-product/                      400
DELETE /superadmin/products/delete-product/{nil}/             404
POST   /superadmin/products/set-admin-sourceable/{nil}/       400
POST   /superadmin/promotion/deals/add/                       400
POST   /superadmin/ship-agents/create/                        400
```

Not one 403. This is the **positive** half of the proof, and it settles the original
`canManageCatalog` finding empirically: a sub-admin *is* entitled to create and delete categories
and products, so the old `canManageCatalog: isSuperAdmin` was hiding controls the server would have
accepted. Leaving Deals and ship-agents ungated was likewise correct.

---

## 4. The pagination cap — reproduced

Previously argued from the DRF source; now observed:

| Endpoint | Total rows | `page_size=100` returned | Status |
| -------- | ---------: | -----------------------: | ------ |
| `/superadmin/product-variants/get-product-variants/` | **60** | **50** | 200 OK |
| `/superadmin/orders/orders/` | **700** | **50** | 200 OK |
| `/superadmin/product-variants/…?page_size=50` | 60 | 50 | 200 OK |
| `/superadmin/product-variants/…?page_size=10` | 60 | 10 | 200 OK |

**Asking for 100 returns 50, with HTTP 200 and no warning of any kind.** The `count` field still
reports the true total (60, 700), which is exactly why the bug was invisible: a caller reading
`count` sees the right number while holding only 50 rows.

This confirms F1 as a reproduced defect rather than a contract inference, and confirms the
`limit: 100` picker analysis in the companion document by the same mechanism.

> Note on today's data: the sailors list (45) and general products (36) currently sit *below* 50, so
> those two specific pickers would not truncate on this dev snapshot. The mechanism is proven and
> both datasets grow; the fix stands.

---

## 5. Server-side search — works

| Query | Result |
| ----- | ------ |
| `/superadmin/partner/list/?page_size=50` | `count = 13` |
| `…&search=DP-SEED-VERIFY` | `count = 1`, 1 row |
| `/superadmin/sailors/sailors-list/?search=zzz-no-such-sailor` | `count = 0` |

Filtering happens server-side and `count` reflects the filtered set — so the pagination maths in the
rewritten `PartnersPage` (`ceil(count / 50)`) is correct under search.

---

## 6. What is still unverified

**🟡 UI rendering.** Everything above proves the *server* behaves as F2 assumes. It does not prove
the buttons are actually absent from the screen for a sub-admin — only that the code path is gated
and that the endpoints behind them would refuse. There is no browser automation in this session, so
this needs either a person logging in as `sub.admin@anchormart.test` and looking, or a browser tool.

Specifically worth eyeballing:
- Rewards → coupon create / edit / delete / configure-points hidden; **Deals tab still fully usable**
- Rewards → Bonus Points: grant and clear hidden, table still visible
- Ports → add / edit / delete hidden, directory still readable
- Account Management → admin-user drawer read-only, footer shows "Close" not "Cancel/Save"
- Products & Categories → create/delete **visible** (sub-admins are entitled — regression check)

**🟡 Write-path flows.** Create → response → cache invalidation → list refresh was not exercised,
because that mutates. That is the natural next pass if you want it, and it needs your go-ahead.

**⚪ One UX wrinkle, not a bug.** In `DealFormDrawer`, editing a deal whose product falls outside the
first 50 will show the product select empty until the admin searches for it — the selected id is set
but its option is not in the fetched page. Pre-existing, unchanged by the fix, and only reachable
above 50 products. Fixing it means fetching the selected product by id alongside the page; I have
not done that.

---

# Addendum — write-path E2E (executed 11 Aug 2026)

Full create → update → list → delete cycles run against the live backend with the **exact payloads
the frontend constructs**, as the **sub-admin** token. All test records were removed afterwards and
their absence verified (`count: 0` for both entity types).

## Ship agents — `directory.ship_agent` (operational)

| Step | Request | Result |
| ---- | ------- | ------ |
| Create | `POST /ship-agents/create/` with `ShipAgentPayload` | **201** — response matches the `ShipAgent` type field-for-field, incl. pre-formatted `created_at` |
| Update | `PATCH /ship-agents/{id}/update/` with `ShipAgentPayload` | **200** — `name`, `mobile`, `company` all applied |
| List | `GET /ship-agents/?search=` | envelope `{count, next, previous, results: [...]}`, `results` a **plain array** — matches `ShipAgentListResponse` |
| Delete | `DELETE /ship-agents/{id}/delete/` | **200** `{"message": "Ship agent deleted."}`, row gone from the list |

### F6 confirmed by execution, not inference

Sending the **Postman-documented** update body against the same record:

```
PATCH {"phone_number": "509876543", "contact_person": "Faisal Rahman (Ops Manager)"}
→ HTTP 200
→ name, mobile, company, email: ALL UNCHANGED
```

**A silent no-op that reports success.** DRF drops the unknown keys and returns the untouched record
with 200 OK. Anyone working from the collection would believe the update applied. The frontend's
payload is correct; the collection is wrong. 🟠 → 🔴 **Confirmed bug in the Postman collection.**

## Categories — `catalog.manage` (operational)

| Step | Request | Result |
| ---- | ------- | ------ |
| Create | `POST /categories/add-category/` with `AddCategoryPayload` | **201 as a sub-admin** |
| Update | `PATCH /categories/update-category/{id}/` with `UpdateCategoryPayload` | **200**, `is_active: false` applied |
| List | `GET /categories/get-categories/?search=` | envelope `{count, next, previous, results: {message, data}}` — the **nested** shape, matching `data?.results?.data` and `unwrapList` |
| Delete | `DELETE /categories/delete-category/{id}/` | **200** `{"message": "Category deleted successfully", "deactivated_products": 0}` |

Two things this settles:

1. **A sub-admin can create and delete categories — 201/200, no 403.** This is the original
   `canManageCatalog` finding proven end to end: the pre-fix UI hid controls the server accepts.
2. **The cascade field is real.** `deactivated_products` is present on the delete response, which is
   what `CategoriesPage.tsx:106` reads to warn the admin. Confirmed on the wire.

## One observation, correctly attributed

The `image` field returns an **absolute URL built from the backend's media host**, not the stored
path that was sent:

```
sent:     "category_images/example.jpg"
returned: "https://bd05-….ngrok-free.app/media/category_images/example.jpg"
```

That host is a **stale ngrok tunnel**, so category thumbnails will not load in this environment. This
is **backend/environment media configuration, not a frontend defect** — the frontend renders what the
API returns, and `toStoredPath` correctly converts the URL back to a path when seeding the edit form
(`CategoryEditDrawer.tsx:65`), so the round-trip is safe.

⚪ Minor, for the backlog only: `categoryColumns.tsx:25` renders `<img src={image}>` with no `onError`
fallback, so an unreachable URL shows a broken-image glyph rather than falling back to the
`IconCategory` placeholder that already exists for the empty case. Cosmetic; not reported as a bug.

## Not yet exercised

Deals, coupons/rewards (super-admin governance), orders/billing, and delivery/assignment write flows.
These touch money and order state, so they need a deliberate go-ahead and a named test order rather
than an ad-hoc record.
