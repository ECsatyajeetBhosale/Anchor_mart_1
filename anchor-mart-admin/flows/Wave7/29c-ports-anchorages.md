# Flow 29c — Ports, Anchorages & Catalog Odds-and-Ends

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`29c-ports-anchorages-validation.md`](./29c-ports-anchorages-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> **This doc is self-sufficient** (Phase-3 rule): every endpoint is fully specified.
>
> Index: [`../../BUSINESS_FLOWS.md`](../../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.**

> **Part 4 of 4.** Companion parts: [29 · Catalog Structure](./29-catalog-structure.md) ·
> [29a · Merchandising & Availability](./29a-merchandising-availability.md) ·
> [29b · Marine-Emergency Spares](./29b-marine-emergency-spares.md).

---

# Executive Summary

**Where the catalog meets the map.** Parts 29–29b describe *what* AnchorMart sells. This part
describes **where it can be delivered** — the port registry — plus two endpoints that live in the
same source module but belong to other flows.

A **port** is the top-level delivery geography. Every order carries one
([`Order.port`](../../../backend/orders/models.py#L127)) and delivery partners are assigned per
port. **Products are NOT scoped by port** — see the box below. An **anchorage** is
a specific mooring spot *within* a port, and it carries the number that drives the delivery promise:
`estimated_delivery_hours`, the typical hours to physically reach a vessel there.

Four of the six endpoints here are the port CRUD. The other two are **misfiled** — they sit in
`catalog_views.py` for historical reasons but serve different flows. They are documented here
because this is where they live, and a frontend developer reading the catalog URL module will find
them.

**The single most important thing to know about this part:**

> **Anchorages have no superadmin API, and that is deliberate.** The per-anchorage
> `estimated_delivery_hours` that feeds the delivery SLA and customer ETA is **Django-admin-managed
> by design** — a product decision taken 2026-07-30, not an oversight. Rationale and the blast
> radius of the field are in §Anchorages below. Ports, by contrast, have full CRUD (§1–§4).

| | |
|---|---|
| **Endpoints documented** | 6 |
| **Source** | [`admin_panel/views/catalog_views.py`](../../../backend/admin_panel/views/catalog_views.py) · [`admin_panel/urls/catalog_urls.py`](../../../backend/admin_panel/urls/catalog_urls.py) |
| **Serializers** | [`admin_panel/serializers/catalog_serializers.py`](../../../backend/admin_panel/serializers/catalog_serializers.py) |
| **Models** | [`PortAddress`](../../../backend/catalog/models.py#L65) · [`Anchorage`](../../../backend/catalog/models.py#L90) · [`SavedProduct`](../../../backend/catalog/models.py) |
| **Auth** | `IsAuthenticated` + `IsAdminUser` (role ∈ `admin`, `super_admin`) on all 6 |
| **Verification** | Every claim below executed against the running stack — see the closing section |

---

# Concepts you need before reading the endpoints

### Port vs anchorage

```
PortAddress  "Singapore (SGSIN)"          ← admin CRUD exists (§1–§4)
   └── Anchorage  "Eastern OPL"           ← no admin API, BY DESIGN (Django admin only)
         estimated_delivery_hours = 6     ← feeds the delivery SLA + customer ETA
   └── Anchorage  "Western Anchorage"
         estimated_delivery_hours = 4
```

`Anchorage.port` is a **CASCADE** foreign key, but that cascade **never fires on the API path** — a
soft delete is an `UPDATE`, not a `DELETE`. §4 therefore deactivates the anchorages explicitly.

### What references a port

Deleting or deactivating a port is not a local change. These models point at it:

| Model | Field | `on_delete` |
|---|---|---|
| `Anchorage` | `port` | **CASCADE** |
| `Order` | `port`, `anchorage` | **PROTECT** |
| `OrderLocationReport` | `port`, `anchorage` | **PROTECT** |
| `Advertisement` | `port` | `SET_NULL` |
| `SpecialRequest` | `port`, `anchorage` | `SET_NULL` |
| `VesselProfile` | `port`, `anchorage` | `SET_NULL` |
| `ShipmentAddress` | `port`, `anchorage` | `SET_NULL` |

> ### ⛔ Products are NOT scoped by port — corrected 2026-07-30
>
> **There is no `Product` → `PortAddress` relationship.** Every sailor sees the same catalog
> regardless of which port they are at, and no endpoint in Flow 29, 29a, 29b or 3 accepts a
> port filter on products.
>
> **This document previously said the opposite** — *"products are stocked per port
> (`Product.ports` M2M — part 29 §7)"* — and listed the M2M in the table above. Both were
> wrong, and the cross-reference was broken too: part 29 §7 is the category-delete endpoint
> and `29-catalog-structure.md` never mentioned ports.
>
> **What was actually there, accurately:** one endpoint — the admin suggestion picker
> (`GetProductVariantForSuggestionView`) — did filter by port, and required `port_id`, from #24
> until commit `68a3e61` *"Remove port_id requirement from product variant suggestion API"*
> deleted both the requirement and the filter. That left `products.filter().distinct()` — a
> no-op — under the original "Filter by Port" comment. **From that commit onward nothing read
> the M2M**: no serializer exposed it, no browse or admin list consulted it, and its only
> writers were a seed and the partner-substitute helper.
>
> The column and its join table were **removed 2026-07-30** (migration `catalog/0061`), along
> with the dead filter and both write sites — finishing the decision `68a3e61` started rather
> than leaving the relationship half-present.
>
> **Port-wise products is a Build B item, gated on client approval** — "select a port, filter
> products, and it applies everywhere". It needs a fresh design when it happens; the removed
> M2M is not a head start on it. Tracked in `MD/todo.md` under Build B.
>
> Also corrected in the same pass: `admin_sourceable`'s help text on both `Product` and
> `ProductVariant` said *"cannot currently be sourced **at this port**"* — per-port language on
> a flag that has always been platform-wide.

### `is_active` and the other boolean/UUID query params

**One shared parser across all of Flow 29** (`AnchorMart/query_params.py`), as of 2026-07-30.
Before that these two endpoints assigned the raw query string straight into the ORM filter, so
Django's `BooleanField.to_python` parsed it and raised — an uncaught **500** on the lowercase
`true` that every other Flow 29 endpoint accepted. Meanwhile parts 29/29a/29b used a lenient
helper that silently turned *any* unrecognised token into `false`, returning `200` with the
**inactive** set. Both are gone (GA5 + GA16).

| Value sent | Result |
|---|---|
| `true` `1` `yes` `t` | filter on `true` |
| `false` `0` `no` `f` | filter on `false` |
| absent or blank | no filter applied |
| **anything else** | **`400`**, keyed on the parameter name |

Case-insensitive, surrounding whitespace ignored. The accepted set is the union of everything the
superseded implementations took, so **no value that previously produced a correct answer changed
behaviour** — the only change is that junk now fails loudly instead of inverting the filter or
crashing. The same applies to `?user=` / `?product=` on §5, which are validated as UUIDs.

### Soft delete

`PortAddress` extends `GenericModel`, so deletion is a flag flip (`is_deleted=True`), never a row
removal. **All four port endpoints are scoped to live rows** — §2 hides deleted ports, and §3/§4
return **404** for one (fixed 2026-07-30, GA19; previously both operated on deleted rows).

---

# Endpoints — full specification

All six require:

```
Authorization: Token <admin-token>
server-secret-key: <SERVER_SECRET_KEY>     # /api/superadmin/ is exempt, but harmless to send
```

| # | Method | Path | Purpose |
|---|---|---|---|
| 1 | `POST` | `/api/superadmin/catalog/add-port/` | Create a port |
| 2 | `GET` | `/api/superadmin/catalog/get-ports/` | List ports |
| 3 | `PUT` `PATCH` | `/api/superadmin/catalog/update-port/<port_id>/` | Update a port |
| 4 | `DELETE` | `/api/superadmin/catalog/delete-port/<port_id>/` | Soft-delete a port |
| 5 | `GET` | `/api/superadmin/catalog/get-saved-products/` | List customer wishlist rows |
| 6 | `GET` | `/api/superadmin/catalog/export-to-excel/` | Export **special requests** (flow 13) |

---

## Ports

## 1 · `POST /api/superadmin/catalog/add-port/` — Create a port

**Request**

| Field | Type | Required | Rules |
|---|---|---|---|
| `port_code` | string | ✅ | max 20 chars. **Unique across all ports, including soft-deleted ones.** |
| `port_name` | string | ✅ | max 255 |
| `country` | string | ✅ | max 100 |
| `region` | string | ✅ | max 100 |

```json
{ "port_code": "SGSIN", "port_name": "Singapore", "country": "Singapore", "region": "Asia" }
```

`is_active` is **not accepted** — a new port is always created active (model default). To create an
inactive port you must create it and then `PATCH` it (§3).

**`201 Created`** — echoes back only the four submitted fields. Note it does **not** return the
port's `id`; to get the id you must re-list (§2) or search by code.

```json
{ "port_code": "SGSIN", "port_name": "Singapore", "country": "Singapore", "region": "Asia" }
```

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"port_code": ["This field is required."], "port_name": [...], ...}` | Any required field missing |
| `400` | `{"port_code": ["port address with this port code already exists."]}` | Duplicate code — raised by the model's `unique=True` via DRF's auto `UniqueValidator`, which fires **before** the serializer's own `validate()` |
| `400` | `{"non_field_errors": ["Port already exists"]}` | The serializer's explicit duplicate check. In practice unreachable for exact duplicates (the validator above wins); reachable only if the unique index is ever relaxed |

**Audit** — writes `AuditLog.Action.PORT_CONFIG_CHANGED` with
`metadata = {"change": "created", "port_name": ..., "country": ...}`.

---

## 2 · `GET /api/superadmin/catalog/get-ports/` — List ports

Lists ports where `is_deleted=False`. Ordered by **`port_name` ascending** (model `Meta.ordering`).

| Query param | Type | Allowed values | Default | Meaning |
|---|---|---|---|---|
| `search` | string | free text | — | Case-insensitive OR across **`port_name`**, **`country`**, **`region`**. **`port_code` is not searched.** |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | unset = no filter | See the `is_active` note above |
| `page` | int | ≥ 1 | 1 | |
| `page_size` | int | 1–50 | 10 | |

**`200 OK`** — note the nested `results.data` shape (the paginator wraps a dict, not a list):

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": {
    "message": "Ports fetched successfully",
    "data": [
      {
        "id": "3f2a...-...",
        "port_code": "SGSIN",
        "port_name": "Singapore",
        "country": "Singapore",
        "region": "Asia",
        "is_active": true,
        "created_at": "30 Jul 2026, 04:12 PM",
        "updated_at": "30 Jul 2026, 04:12 PM"
      }
    ]
  }
}
```

The serializer uses `exclude`, so **every non-excluded model field is emitted** — if a field is
added to `PortAddress` it appears here automatically. Excluded: `is_deleted`, `deleted_at`,
`deleted_reason`, `deleted_by`.

**Errors**

| Status | Body | When |
|---|---|---|
| `404` | `{"detail": "Invalid page."}` | `page` beyond the last page (DRF paginator) |
| `400` | `{"is_active": ["Must be a boolean. Expected one of: …"]}` | `is_active` is not a recognised boolean |

An empty result set returns **`200`** with `count: 0` and `data: []`, not a 404. (The view has an
`else: 404 "No ports found"` branch, but `paginate_queryset` returns a list rather than `None`
whenever pagination is configured, so that branch is unreachable.)

---

## 3 · `PUT` / `PATCH` `/api/superadmin/catalog/update-port/<uuid:port_id>/` — Update a port

A DRF `UpdateAPIView`. **`PUT` and `PATCH` are not equivalent here**, unlike the rest of the admin
API:

| Method | Behaviour |
|---|---|
| `PATCH` | Partial. Send only the fields you want to change. |
| `PUT` | **Full replace — all four of `port_code`, `port_name`, `country`, `region` are required.** Omitting any returns `400`. |

> The project convention (CLAUDE.md §4a) is that update endpoints treat both verbs as partial.
> This endpoint predates that and does not. **Use `PATCH`.**

**Request** — any subset (for `PATCH`):

| Field | Type | Rules |
|---|---|---|
| `port_code` | string | max 20, unique |
| `port_name` | string | max 255 |
| `country` | string | max 100 |
| `region` | string | max 100 |
| `is_active` | bool | ✅ writable here (unlike §1) |

**`200 OK`** — returns the five serializer fields only (no `id`, no timestamps):

```json
{ "port_code": "SGSIN", "port_name": "Singapore", "country": "Singapore",
  "region": "Asia", "is_active": false }
```

**Lookup scope** — scoped to live rows (`is_deleted=False`), so a soft-deleted port's id returns
**404** (fixed 2026-07-30, GA19). Previously this returned `200` and could even set
`is_active=true` on a deleted port, leaving an `is_deleted=True, is_active=True` row that §2
could not show and no endpoint could undo.

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"port_code": ["This field is required."], ...}` | `PUT` with an incomplete body |
| `400` | `{"port_code": ["port address with this port code already exists."]}` | Code collides with another port |
| `404` | `{"detail": "No PortAddress matches the given query."}` | Unknown id |
| `404` | — | `port_id` is not a valid UUID (URL converter rejects it before the view) |

**Audit** — writes `PORT_CONFIG_CHANGED` **only if something actually changed**, with a per-field
diff. The snapshot covers all five business fields — `port_code`, `port_name`, `country`, `region`,
`is_active`. (`port_code` was missing until GA3/GA18, 2026-07-30, so a rename produced no audit row
at all.)

```json
{"change": "updated",
 "changed": {"is_active": {"from": true, "to": false}}}
```

---

## 4 · `DELETE /api/superadmin/catalog/delete-port/<uuid:port_id>/` — Soft-delete a port

Sets `is_deleted=True`, `is_active=False`, `deleted_at=now()`, `deleted_by=<caller>`.

**`200 OK`** — `deactivated_anchorages` is always present; the message only mentions it when
non-zero, so the previous exact string is preserved for a port with no anchorages.

```json
{ "message": "Port deleted successfully. 2 anchorages deactivated.",
  "deactivated_anchorages": 2 }
```

**Deleting an already-deleted port returns `404`** (fixed 2026-07-30, GA19). Previously the lookup
had no `is_deleted=False` filter, so a repeat delete returned `200` and overwrote
`deleted_at`/`deleted_by` — losing the record of who first deleted it.

**Cascades to its anchorages** (GA17 / CROSS-FLOW-6, 2026-07-30). No guard — the delete always
succeeds — but it is no longer silent about what it changed:

- **Live anchorages are deactivated** (`is_active=False`, **not** soft-deleted, so the change is
  reversible). `Anchorage.port` declares `on_delete=CASCADE`, which reads as though this were
  handled; it is not, because a soft delete is an `UPDATE`. The count is returned in the response and
  recorded in the audit metadata as `deactivated_anchorages`.
- **The customer endpoint stops offering them** — `GET /api/catalog/get-anchorages-list/?port_id=…`
  filters `is_active=True`, so deactivated anchorages drop out. Previously they were still served.
- **Downstream writes now reject the dead port and its anchorages** — order creation, vessel
  profiles / shipment addresses, and location reports all filter `is_deleted=False, is_active=True`
  on both the port and the anchorage. Three of those five call sites previously did not.
- **Existing orders are unaffected** — `Order.port` is `PROTECT` and the row is never removed.
- **No check on open orders, stocked products or assigned partners** — deleting a port with live
  orders is still permitted.

**Errors**

| Status | Body | When |
|---|---|---|
| `404` | `{"message": "Port not found"}` | Unknown id, **or a port that is already soft-deleted** |
| `404` | — | `port_id` not a valid UUID (URL converter) |
| `500` | `{"message": "<raw exception text>"}` | Any other error — a bare `except Exception` returns `str(e)` to the client |

**Audit** — writes `PORT_CONFIG_CHANGED` with `{"change": "deleted", "port_name": ...}`.

---

## Anchorages

**There is no `/api/superadmin/` anchorage endpoint.** Verified against the live route table: of the
14 routes mentioning `anchorage`, 13 are Django-admin-site pages and 1 is customer-facing.

| What exists | Where | Who can use it |
|---|---|---|
| Django admin CRUD | `/admin/catalog/anchorage/` (changelist / add / change / delete / history) | Anyone with `is_staff` and a Django-admin session — **not** an admin-panel API token |
| `GET /api/catalog/get-anchorages-list/?port_id=<uuid>` | [`catalog/views.py`](../../../backend/catalog/views.py#L152) — `GetAnchoragesView` | **Customers** (`IsAuthenticated`, no admin gate). Read-only. `port_id` is required → `400` without it |
| `manage.py add_anchorages` | [`catalog/management/commands/add_anchorages.py`](../../../backend/catalog/management/commands/add_anchorages.py) | Shell access only. Seeds anchorages per port code and gives any port without one a default |

**Consequence for the admin panel:** `estimated_delivery_hours` — the per-anchorage delivery
difficulty added to the base SLA in `DeliveryPolicy.calculate_deadline()` and surfaced to customers
as the ETA — is **not settable from the admin panel**. Changing a delivery promise for a mooring
requires a Django-admin session.

> ### ✅ This is a decision, not a gap — do not file it again
>
> **Anchorage delivery difficulty is Django-admin-managed by design** (product decision,
> 2026-07-30; tracked as **GA15**, closed).
>
> **Why:** the field needs occasional *correction*, not routine operation. It currently has **no
> producer at all** — a live check found **17 anchorages, 0 with a value set**, every one falling
> back to the global `DELIVERY_DEFAULT_ANCHORAGE_HOURS` (6, env-overridable) — and nothing has been
> reported as blocked on it. The gap was found by inspection, not by anyone hitting it. A full CRUD
> surface for a field with that usage profile is disproportionate, and the Django admin is a
> legitimate answer for low-frequency, staff-only data maintenance.
>
> **Blast radius, if you do revisit it:** read by exactly one function —
> `delivery_policy.anchorage_hours()` (`orders/delivery_policy.py:36-40`), called from
> `calculate_deadline()` and the customer ETA range. It does **not** reach partner assignment and
> does **not** reach pricing. So building the CRUD would affect delivery deadlines and the
> customer-facing ETA, nothing else.
>
> **Revisit if** anchorage difficulty becomes a routine operational lever — per-port SLA tuning, an
> ops-facing dashboard, or a customer-visible ETA that ops needs to adjust without a deploy.

The frontend can still *read* anchorages for a port via the customer endpoint above (note it is not
admin-gated), but there is no editing affordance for `estimated_delivery_hours`.

---

## Endpoints filed here that belong to other flows

## 5 · `GET /api/superadmin/catalog/get-saved-products/` — Customer wishlist rows

Lists `SavedProduct` rows — the "saved / wishlist" entries customers create against products.
Belongs to the customer-engagement surface rather than catalog administration; it lives in
`catalog_views.py`.

> ✅ **Fixed 2026-07-30 (GA14).** This endpoint previously returned **`500` on every request that
> would contain at least one row**, and `200` only when the result set was empty — it worked on an
> empty database and failed on a real one. `SavedProductSerializer` declared
> `image = SerializerMethodField()` but omitted `"image"` from `Meta.fields`; DRF asserts on that
> while building the field list, which it does lazily on the first row serialized. The field is now
> in `fields`, `get_image` resolves through the product's related `ProductImage` rows, and a
> `product_name` was added so the list is readable. Locked by
> `admin_panel/tests/test_saved_products_admin.py`.

Filters `is_deleted=False`. Ordered by **`-created_at`** (model `Meta.ordering`).

| Query param | Type | Allowed values | Meaning |
|---|---|---|---|
| `search` | string | free text | Case-insensitive match on **`product__name`** |
| `is_active` | string | `true` `1` `yes` `t` / `false` `0` `no` `f` (case-insensitive); **anything else → 400** | Filter by the row's active flag |
| `user` | UUID | well-formed UUID; **anything else → 400** | Exact `user_id` match |
| `product` | UUID | well-formed UUID; **anything else → 400** | Exact `product_id` match |
| `page` / `page_size` | int | 1–50 | |

**`200 OK`**

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": {
    "message": "Saved products fetched successfully",
    "data": [
      {
        "id": "9c1f...-...",
        "user": "Arun Pillai",
        "product": "7ab3...-...",
        "product_name": "Mooring Rope",
        "image": "https://.../product_images/rope.jpg",
        "created_at": "30 Jul 2026, 04:12 PM",
        "updated_at": "30 Jul 2026, 04:12 PM"
      }
    ]
  }
}
```

`product` is the product's UUID; `product_name` and `image` are included so a row is renderable
without a second lookup (the endpoint lets you *search* by product name, so returning only the UUID
made the result unusable).

**Errors** — `404 {"detail": "Invalid page."}` for an out-of-range page; **`400`** keyed on the
offending parameter for a malformed `user`, `product` or `is_active` value (GA16, fixed
2026-07-30 — these previously returned 500).

---

## 6 · `GET /api/superadmin/catalog/export-to-excel/` — Export special requests

> ⚠️ **Misfiled, and misleadingly named.** Despite living under `/catalog/` this endpoint exports
> **`SpecialRequest`** rows and nothing else. It is **flow 13** (Special Requests / Special
> Interest), not flow 29. There is **no catalog export** anywhere in the API. Documented here
> because this is where a developer reading `catalog_urls.py` will find it.

| Query param | Type | Allowed values | Meaning |
|---|---|---|---|
| `status` | string | any value in `SpecialRequest.Status.values` | Filter rows by request status. Omit for all |

**`200 OK`** — a binary `.xlsx` download, **not** JSON:

```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="special_requests.xlsx"
```

Worksheet `Special Interests`, bold header row, auto-sized columns (capped at 60 chars), ordered by
`-created_at`:

| Col | Header | Source |
|---|---|---|
| A | `ID` | `str(request.id)` |
| B | `User Email` | `user.email` |
| C | `User Name` | `first_name + " " + last_name`, falling back to `user.email` |
| D | `Product Name` | `product_name` |
| E | `Description` | `description` |
| F | `Quantity` | `quantity` |
| G | `Max Budget` | `float(max_budget or 0)` |
| H | `Currency` | `currency` |
| I | `Status` | `status` |
| J | `Admin Response` | `admin_response` |
| K | `Created At` | `%Y-%m-%d %H:%M:%S` |

**Caching and concurrency** — the generated workbook is cached for **5 minutes** under
`special_request_excel_export_<status|all>`. A second request within that window gets the cached
bytes, so **an export can be up to 5 minutes stale**. A 60-second cache lock provides
thundering-herd protection: if another request is already generating, this one sleeps 1s, re-checks
the cache, and if it is still empty returns:

**`202 Accepted`**

```json
{ "message": "Export is currently being generated. Please retry in a moment." }
```

Rows are streamed through a `Paginator` in batches of 1000 to bound memory, and the queryset uses
`select_related("user").only(...)`.

**Errors**

| Status | Body | When |
|---|---|---|
| `400` | `{"message": "Invalid status filter"}` | `status` not in `SpecialRequest.Status.values` |
| `500` | `{"message": "<raw exception text>"}` | Generation failure — bare `except Exception` returning `str(e)` |

---

# How Flow 29c connects

| Consumer | What it uses |
|---|---|
| **Order placement** (flow 5) | `Order.port` / `Order.anchorage`; the anchorage's `estimated_delivery_hours` feeds `DeliveryPolicy.calculate_deadline()` |
| **Product stocking** (part 29 §7) | `Product.ports` M2M — a product is orderable only at ports it is stocked at |
| **Partner assignment** (flow 11) | Partners carry port capabilities; `AdminAddPartnerSerializer` scopes its port choices to `is_deleted=False` |
| **Vessel profiles / shipment addresses** (flow 3) | `VesselProfile.port/anchorage`, `ShipmentAddress.port/anchorage` |
| **Special requests** (flow 13) | `SpecialRequest.port/anchorage`, plus §6's export |
| **Advertisements** (flow 18) | `Advertisement.port` |
| **Audit** (#32) | All three port writes emit `PORT_CONFIG_CHANGED` |

---

# Verification

Every behavioural claim in this document was executed against the running stack rather than read off
the source. The following were confirmed by response, not inference:

- The `is_active` value matrix in the concepts section — `?is_active=true` raising vs
  `?is_active=True` returning `200` — was confirmed both end-to-end through the endpoint and
  directly against `BooleanField.to_python`.
- `PUT` with a partial body returning `400`, and `PATCH` with the same body returning `200`.
- `PATCH` against a soft-deleted port returning `200`.
- `DELETE` against an already-deleted port returning `200 "Port deleted successfully"`.
- Duplicate `port_code` producing the model-level unique message, not the serializer's
  `"Port already exists"`.
- `?page=99` returning `404 "Invalid page."`.
- §6 returning `Content-Disposition: attachment; filename="special_requests.xlsx"` and
  `?status=bogus` returning `400`.
- The absence of admin anchorage routes was confirmed against the live route table, not `urls.py`.
