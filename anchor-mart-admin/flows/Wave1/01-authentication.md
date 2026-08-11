# Flow 01 — Multi-Role Authentication & Session Management

> **OUTPUT 1 — Flow Documentation.**
> Validation findings live in a separate report:
> [`01-authentication-validation.md`](./01-authentication-validation.md).
> This document describes **what the API does**. It contains no bug reports.
>
> Index: [`../BUSINESS_FLOWS.md`](../BUSINESS_FLOWS.md)

> ⚠️ **`#NN` in source comments are issue numbers, not flow numbers.** They collide
> with this document's flow numbering throughout the codebase. Quotes below preserve
> them verbatim; do not cross-map them.

---

# Executive Summary

| | |
|---|---|
| **Flow Name** | Multi-Role Authentication & Session Management |
| **Business Objective** | Issue an authenticated API session to a sailor, admin, or delivery partner. OTP is the auth method for every role; the **admin panel additionally offers password login** (`admin/login/`) alongside its OTP flow |
| **Flow Type** | Core |
| **Primary Actors** | Customer (sailor) · Admin · Super Admin · Delivery Partner · Background System |
| **Platforms** | `SAILOR` (`/api/v1/`) · `ADMIN` (`/api/superadmin/admin/`) · `PARTNER` (`/api/partner/`) · `SYS` (Celery, threads) |
| **Django Apps** | `user` · `admin_panel` · `partner_app` · `orders` (audit only) |
| **Models** | `User`, `SigninOtp`, `WhatsappOtp`, `FcmToken`, `DeliveryPartnerProfile`, `Token`, `AuditLog`, `AuditChain` |
| **Services** | `generate_signin_otp`, **`consume_signin_otp`** (the shared verify path, 2026-08-06), `generate_whatsapp_otp`, `create_new_user`, `send_otp_email`, `record_auth_event`, `ExpiringTokenAuthentication` |
| **State Machines** | **None.** This flow drives no `Order`, `OrderItem`, or `DeliveryAssignment` transition. The OTP row lifecycle is not a declared state machine — there is no `VALID_TRANSITIONS` table and no `can_transition` guard |
| **External Integrations** | SMTP (email OTP) · Twilio (WhatsApp OTP) · FCM (token registration only — no push sent by this flow) |
| **Total APIs** | **13** (6 customer · 4 admin · 3 partner) |
| **Previous Flow** | — (entry flow; no prerequisite) |
| **Next Flow** | Flow 18 (Referral) or Flow 2 (Profile & Vessel) for a sailor · Flow 27 (Order Ownership) for an admin · Flow 28 (Partner Lifecycle) for a partner |
| **Documentation Version** | 1.5 — 2026-08-07 (FA-SEC1, shipped 2026-08-06: per-code attempt cap on the email OTP, one live code per email, per-IP scoped throttle on all six OTP endpoints, shared `consume_signin_otp` path — which closes F-15). 1.4 — 2026-07-20 (admin password login restored alongside OTP; admin OTP flow gated; sign-in OTP resend cooldown added) |
| **Documentation Status** | ✅ **Ready for frontend handoff.** 13 of 13 routes documented, verified against the running application's route table. |

---

# Phase 1 — Understand the Flow

## Business purpose

Authenticate a principal and return a DRF token. OTP is the auth method for every
role; customer, seller and delivery-partner accounts are created with
`set_unusable_password()` and have no password path.

The **admin API is the exception** (product decision, 2026-07-20): it offers **both**
password login (`admin/login/` → `AdminLogin`) **and** OTP login (`login-with-otp/` +
`verify-otp/`). Admin-tier accounts created with a real email get a generated password
emailed at creation (see Flow 31 — User Account Administration); superusers use their
`createsuperuser` password; admins without one use OTP. There is **no password reset
flow** — OTP is the standing recovery path.

The Django admin site at `/admin/` uses `django.contrib.auth`'s own password login and
is **out of scope for this flow** — that is separate from the admin *API* password
login documented here.

## Entry point

| Portal | Endpoint |
|---|---|
| Customer | `POST /api/v1/user/signin/` |
| Admin | `POST /api/superadmin/admin/login-with-otp/` |
| Partner | `POST /api/partner/signin/` |

## Exit point

| Outcome | Condition |
|---|---|
| **Success** | A DRF `Token` returned in the response body and stored by the client |
| **Teardown** | `GET …/logout/` on any portal deletes the token row |
| **Failure** | 400 bad/expired OTP · 403 blocked account · 404 unknown or wrong-role account |

## Actors

| Actor | Participation |
|---|---|
| **Customer (sailor)** | Combined sign-up + sign-in via email OTP; WhatsApp number verification as a post-login profile step |
| **Admin / Super Admin** | Sign-in via email OTP. Both tiers use the same endpoint; `role` is returned in the payload |
| **Delivery Partner** | Sign-in via email, partner ID, **or** WhatsApp OTP. Provisioned by an admin (Flow 28); never self-registers |
| **Background System** | Celery worker sends the WhatsApp OTP; a raw Python thread sends the email OTP |

## Platforms

`SAILOR` · `ADMIN` · `PARTNER` · `SYS`

## Django apps

| App | Role in this flow |
|---|---|
| `user` | Owns every model, the OTP services, the email sender, the token-expiry auth class |
| `admin_panel` | Admin sign-in views; `IsAdminUser` permission |
| `partner_app` | Partner sign-in views; `IsDeliveryPartner` permission |
| `orders` | `audit.py` only — `record_auth_event`, `record_audit_safe`, the hash chain |

## Models

| Model | File · Class | Role |
|---|---|---|
| `User` | `user/models.py` · `User` | UUID PK, `USERNAME_FIELD = "email"`, `Role` enum, `is_active`, `whatsapp_verified`, `last_login_device`, `referral_code` |
| `SigninOtp` | `user/models.py:299-327` · `SigninOtp` | Email OTP. **Keyed on the email string, not a user FK.** Fields: `email`, `otp`, `is_used`, `expires_at`, **`attempts`** (added 2026-08-06 — wrong guesses against *this* code, capped at `SIGNIN_OTP_MAX_ATTEMPTS`) |
| `WhatsappOtp` | `user/models.py:333-363` · `WhatsappOtp` | WhatsApp OTP. **Keyed on the E.164 destination number** (`whatsapp_number`) — the `user` FK was removed in migration `user/0039`. Has an `attempts` counter, capped since it was written |
| `FcmToken` | `user/models.py` · `FcmToken` | Push token; `token` is globally unique |
| `DeliveryPartnerProfile` | `user/models.py` · `DeliveryPartnerProfile` | Its existence is the authoritative "is this a real partner" check |
| `Token` | `rest_framework.authtoken` · `Token` | The credential returned |
| `AuditLog` / `AuditChain` | `orders/models.py` | Sign-in success/failure entries |

`User.Role` values: `customer`, `seller`, `admin`, `super_admin`, `delivery_partner`.

## Services

| Callable | File · Line | Behaviour |
|---|---|---|
| `generate_signin_otp(email)` | `user/user_generics.py:20-37` | `str(randint(1000, 9999))`; creates a **new** `SigninOtp` row every call; TTL hardcoded `timedelta(minutes=5)`; calls `send_otp_email` |
| `generate_whatsapp_otp(user, cc, num)` | `user/user_generics.py:40-63` | Builds E.164, 4-digit code, TTL from `WHATSAPP_OTP_EXPIRY_MINUTES`; creates the row, then `send_whatsapp_otp.delay(otp_obj.id)` |
| `create_new_user(email, device)` | `user/user_generics.py:66-98` | `get_or_create` with `is_active=True, is_agreed_on_tnc=True, role="customer"`; assigns `referral_code` on create inside a nested try; returns `None` on any exception |
| `send_otp_email(to, otp, purpose)` | `user/email.py:33-54` | Renders `user/otp_email.html`, then dispatches on a **raw `threading.Thread`** |
| `record_auth_event(action, *, user, …)` | `orders/audit.py:260-273` | Delegates to `record_audit_safe`. Returns `None` when `user is None` — attempts against unknown emails are deliberately not audited (docstring: *"a chain is per subject, and an attempt on an unknown email has no account to chain to"*) |
| `ExpiringTokenAuthentication` | `user/auth_utils.py` | Project-wide `DEFAULT_AUTHENTICATION_CLASSES`. Returns early for `admin`/`super_admin`; all other roles expire after `getattr(settings, 'TOKEN_EXPIRY_DAYS', 30)` days from `token.created` |

## Signals

**None.** `grep -rn "receiver\|post_save" user/*.py` returns no matches and
`user/apps.py` defines no `ready()`. No part of this flow is signal-driven.

## Celery tasks

| Task | File · Line | Config |
|---|---|---|
| `user.tasks.send_whatsapp_otp(otp_id)` | `user/tasks.py:10-48` | `bind=True, max_retries=3, default_retry_delay=30`. Missing row → no-op. `is_permanent_twilio_error(exc)` → return without retry; otherwise `self.retry` |

Not on the Celery beat schedule — event-driven only.

## State machines

**None.** The only state is the OTP row's own lifecycle:

```
created (is_used=False, is_active=True)
   ├── correct + unexpired → is_used=True, is_active=False        [consumed]
   ├── expired             → is_active=False (is_expired=True on customer/admin paths)
   └── WhatsApp only: wrong code → attempts += 1
                       attempts >= WHATSAPP_OTP_MAX_ATTEMPTS → is_active=False
```

The two `mark_as_used()` implementations differ: `SigninOtp.mark_as_used()` sets
only `is_used` (`user/models.py:248-250`); `WhatsappOtp.mark_as_used()` sets
`is_used` **and** `is_active` (`user/models.py:284-287`).

## Notifications

**None.** No `Notification` row is created anywhere in this flow. The OTP itself
is the message.

## External integrations

| Integration | Invoked by | Delivery model |
|---|---|---|
| **SMTP** | `send_otp_email` → `send_email_with_template` | Raw `threading.Thread`, fire-and-forget, no retry, no ledger record |
| **Twilio** | `user.tasks.send_whatsapp_otp` → `user/whatsapp.py::send_whatsapp_message` | Celery; permanent errors return, transient errors retry ×3 |
| **FCM** | Registration only (API #4) | No push is sent by this flow |

---

# Phase 2 — Discover the Complete Flow

Three portals, one shared OTP infrastructure. They diverge on identifier
resolution, gating, and token semantics — not on mechanism.

## Sequence diagram

The diagram shows the OTP path for all three portals. The **admin portal has a second,
single-step method — password login (API 10)** — that stands in for the admin OTP
request+verify pair:

```
ADMIN (alternative)
─────
POST /admin/login/  { email, password }
  │ role gate → 403 + AUDIT
  │ is_active gate → 403 + AUDIT
  │ check_password → 401 + AUDIT
  │ get_or_create (stable token)
  ▼ issue Token + AUDIT (method=password)
{token, user{email,role}} ──▶ Flow 27
```

```
CUSTOMER                          ADMIN (OTP)                    PARTNER
────────                          ─────                          ───────
POST /user/signin/                POST /admin/login-with-otp/    POST /partner/signin/
  │ role gate → 404                 │ role gate → 404              │ resolve email|partner_id|whatsapp
  │ is_active gate → 403            │ is_active gate → 403         │ _is_partner() → 404
  │                                 │                              │ is_active gate → 403
  ├─ generate_signin_otp ───────────┴──────────────────────────────┤ email → generate_signin_otp
  │                                                                │ whatsapp → generate_whatsapp_otp
  ▼                                                                ▼
[SMTP thread]                                              [Celery → Twilio]
  │                                                                │
POST /user/verify-signin-otp/    POST /admin/verify-otp/       POST /partner/verify-otp/
  │ match newest unused OTP        │ match unused OTP (.first())  │ match newest unused OTP
  │ expiry → 400                   │ expiry → 400                 │ expiry → 400 + deactivate
  │ role gate → 404 + AUDIT        │ role gate → 403 + AUDIT      │ is_active → 403 + AUDIT
  │ is_active gate → 403 + AUDIT   │ is_active → 403 + revoke tok │ never creates a user
  │ create_new_user(get_or_create) │ user must exist → else 500   │
  │ DELETE all prior tokens        │ get_or_create (stable token) │ DELETE all prior tokens
  │ issue Token + AUDIT            │ issue Token + AUDIT          │ issue Token + AUDIT
  ▼                                ▼                              ▼
{token, show_referral_screen,    {token, user{email,role}}      {token, partner{…}}
 user{email,role}}
  │
POST /user/add-fcm-token/  ← customer only
  │
  ├─ show_referral_screen=true ──────▶ Flow 18 (Referral)
  └─ vessel_profile_completed=false ─▶ Flow 2 (Profile & Vessel)

SIDE BRANCH — WhatsApp number verification (customer, post-login profile step):
POST /user/whatsapp/send-otp/   → 60s cooldown → Celery → Twilio
POST /user/whatsapp/verify-otp/ → 5-attempt cap → user.whatsapp_verified = True

TEARDOWN (all three portals, unauthenticated GET):
GET …/logout/ → delete Token by header key
```

## API sequence table

| Step | Platform | API | Purpose | Next Step |
|---|---|---|---|---|
| 1 | SAILOR | `POST /api/v1/user/signin/` | Request email OTP; gate role + `is_active` before sending | 2 |
| 2 | SAILOR | `POST /api/v1/user/verify-signin-otp/` | Verify OTP, create account if new, issue token | 3 |
| 3 | SAILOR | `POST /api/v1/user/add-fcm-token/` | Register device for push | Flow 18 or Flow 2 |
| 4 | SAILOR | `GET /api/v1/user/logout/` | Delete token; optionally unregister device | — (terminal) |
| 5 | SAILOR | `POST /api/v1/user/whatsapp/send-otp/` | Send WhatsApp verification code (side branch, post-login) | 6 |
| 6 | SAILOR | `POST /api/v1/user/whatsapp/verify-otp/` | Mark number verified | — (terminal) |
| 7 | ADMIN | `POST /api/superadmin/admin/login-with-otp/` | Request admin email OTP | 8 |
| 8 | ADMIN | `POST /api/superadmin/admin/verify-otp/` | Verify OTP, issue non-expiring admin token | Flow 27 |
| 9 | ADMIN | `GET /api/superadmin/admin/logout/` | Delete token | — (terminal) |
| 10 | ADMIN | `POST /api/superadmin/admin/login/` | Password login — email + password → token | Flow 27 |
| 11 | PARTNER | `POST /api/partner/signin/` | Request OTP over email/partner-ID or WhatsApp | 12 |
| 12 | PARTNER | `POST /api/partner/verify-otp/` | Verify OTP, issue token, return partner brief | Flow 28 |
| 13 | PARTNER | `GET /api/partner/logout/` | Delete token | — (terminal) |

## Cross-portal consequence

`SigninOtp` is keyed on the **email string**, with no user FK and no portal or
purpose discriminator (`user/models.py:233-234`). A code minted at
`/api/v1/user/signin/` satisfies the lookup at `/api/superadmin/admin/verify-otp/`
and vice versa. **The role gate at verify is the only separation between portals —
not OTP isolation.**

---

# Phase 3 — API Documentation

## Flow-wide conventions

Applied to every endpoint below unless the entry says otherwise.

**Headers**

| Header | Applies to | Notes |
|---|---|---|
| `Content-Type: application/json` | All POST endpoints | |
| `server-secret-key: <SERVER_SECRET_KEY>` | `/api/v1/…` and `/api/partner/…` | Enforced by `ServerSecurityMiddleware`. **`/api/superadmin/…` is exempt** |
| `Authorization: Token <key>` | Endpoints marked "Token" under Authentication, plus all three logout endpoints (which parse it without authenticating) | |

**Format**
- OTP is a **4-digit numeric string**. Email OTP TTL is hardcoded **5 minutes**
  (`user_generics.py:33`); WhatsApp TTL is `WHATSAPP_OTP_EXPIRY_MINUTES` (default 5).
- **No endpoint in this flow takes a path parameter.** Where "Path Parameters"
  says *None*, the URL is literal.
- **Error bodies are not uniform.** These are hand-rolled views; some branches
  return `{"error": …}`, others `{"message": …}`, occasionally for the same status
  in the same view. Partner endpoints validate through serializers and return DRF
  shapes. **Branch on the HTTP status, never on the key.**
- `NON_FIELD_ERRORS_KEY` is `"message"` (`settings.py:198`), so DRF non-field
  errors surface under `message`, not the DRF default `non_field_errors`.

### Two independent 429s guard the OTP endpoints — the client must handle both

*Added 2026-08-06 (FA-SEC1). Both are new except the resend cooldown.*

| # | Guard | Scope | Applies to | Response |
|---|---|---|---|---|
| 1 | **Resend cooldown** — `SIGNIN_OTP_RESEND_COOLDOWN_SECONDS`, default **120 s** | Per **email** | The three *request* endpoints (APIs 1, 7, 11) | **429** `{"error": "An OTP was already sent. Please wait N seconds before requesting another."}` |
| 2 | **Per-code attempt cap** — `SIGNIN_OTP_MAX_ATTEMPTS`, default **5** | Per **code** | The three *verify* endpoints (APIs 2, 8, 12) | **429**, wording per portal (see each API) |
| 3 | **DRF scoped rate throttle** — `ScopedRateThrottle` | Per **client IP** | All six above | **429** `{"detail": "Request was throttled. Expected available in N seconds."}` |

**Guard 3 is a different body shape from 1 and 2 — `detail`, not `error`/`message`.**
It is DRF's own, produced *before* the view runs, so none of the per-endpoint tables
below can produce it. A client that reads `response.error` on a 429 will show a blank
message when the throttle fires. Rates come from `DEFAULT_THROTTLE_RATES`
(`settings.py`): `otp_request` **10/min**, `otp_verify` **20/min**, both overridable via
`THROTTLE_OTP_REQUEST` / `THROTTLE_OTP_VERIFY`, and both **disabled under the test
runner** (throttle state is cached per IP and every test request comes from 127.0.0.1).

⚠️ **The IP scope matters for this product specifically.** A whole crew shares one
satellite uplink, so an entire vessel signs in from a single public IP. The rates are set
to survive that and are explicitly *not* the primary control — the per-code cap (guard 2)
is what makes guessing infeasible.

**Requesting a new code now revokes the old one.** `generate_signin_otp`
(`user_generics.py:39-41`) deactivates every live `SigninOtp` for the email before
inserting the new one. Previously several codes could be live at once (the 120 s cooldown
is shorter than the 5-minute TTL); now the newest code is the *only* one that verifies,
and an older code returns "incorrect or already used" rather than silently working.

---

## API 1 · Request a customer sign-in OTP

| Field | Value |
|---|---|
| **Purpose** | Dispatch a one-time code to an email address |
| **Business Reason** | Combined sign-up and sign-in. A new email is a legitimate registration; an existing one must belong to an active customer |
| **Endpoint** | `/api/v1/user/signin/` |
| **Method** | `POST` |
| **Authentication** | None — `UserSignin` declares no authentication classes |
| **Permissions** | Open |
| **Headers** | `Content-Type`, `server-secret-key` |
| **Path Parameters** | None |
| **Query Parameters** | None |

**Request Body**
```json
{ "email": "sailor@example.com" }
```

**Success Response — 200**
```json
{ "message": "Otp is sent to your email" }
```

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Email is required"}` | Missing, empty, or not a `str` |
| 404 | `{"error": "No customer account found for this email. Please contact support."}` | Email exists, `role != customer` |
| 403 | `{"error": "Your account has been blocked. Please contact support."}` | Email exists, `is_active is False` |
| 429 | `{"error": "An OTP was already sent. Please wait N seconds before requesting another."}` | A sign-in OTP was requested for this email within the resend cooldown (`SIGNIN_OTP_RESEND_COOLDOWN_SECONDS`, default **120 s**). `N` is the seconds remaining |
| 429 | `{"detail": "Request was throttled. Expected available in N seconds."}` | **Per-IP** `otp_request` throttle (10/min) — a different body shape, see the conventions above |
| 500 | `{"error": "<str(exception)>"}` | Unhandled exception |

**Validation Rules** (`user/views.py` · `UserSignin.post`)
- `email` required and must be a `str`.
- Normalised `email.strip().lower()`; lookup is `email__iexact`.
- Role and `is_active` gates run **before** the OTP is generated.
- **Resend cooldown**: a new sign-in OTP is refused (429) if one was issued for this
  email within the last 120 s. Applies to every user type.
- **Per-IP throttle** (`throttle_scope = "otp_request"`) runs before all of the above.

**Database Changes** — one `SigninOtp` INSERT per call (none on a 429), **plus an UPDATE
deactivating every previously live `SigninOtp` for this email** (`is_active=False`) — so
at most one code per email is ever live. Changed 2026-08-06; previously no existing row
was invalidated.
**Notifications Triggered** — None.
**Background Tasks Triggered** — None (email dispatches on a raw thread, not Celery).
**State Changes** — None.
**Next API** — API 2.
**Related APIs** — API 7, API 11 (same `generate_signin_otp` service, other portals).

---

## API 2 · Verify the customer OTP

| Field | Value |
|---|---|
| **Purpose** | Exchange a valid OTP for a token, creating the account if new |
| **Business Reason** | The only path by which a sailor account comes into existence |
| **Endpoint** | `/api/v1/user/verify-signin-otp/` |
| **Method** | `POST` |
| **Authentication** | None |
| **Permissions** | Open |
| **Headers** | `Content-Type`, `server-secret-key` |
| **Path Parameters** | None |
| **Query Parameters** | None |

**Request Body**
```json
{
  "email": "sailor@example.com",
  "otp": "4821",
  "device": "iPhone 15 Pro / iOS 18.2"
}
```
`device` is optional free text, persisted to `user.last_login_device`.

**Success Response — 200**
```json
{
  "message": "Otp is verified",
  "token": "9f2c1b7a4e8d3f6a0b5c9e2d7f1a4b8c3e6d9f02",
  "show_referral_screen": true,
  "user": { "email": "sailor@example.com", "role": "customer" }
}
```
`show_referral_screen` = `is_new_user and not user.referred_by_id`. True only on
the call that created the account; never true on a later sign-in.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Email and OTP are required"}` | Either field missing |
| 400 | `{"message": "Otp is incorrect or already used"}` | Wrong code, **or** no live code at all for this email |
| 400 | `{"message": "Otp is expired"}` | The live code is past `expires_at` |
| **429** | `{"message": "Too many incorrect attempts. Please request a new OTP."}` | **New 2026-08-06** — 5 wrong guesses against this code. The code is **burned**; the sailor must request a new one |
| 429 | `{"detail": "Request was throttled. Expected available in N seconds."}` | **Per-IP** `otp_verify` throttle (20/min) — a different body shape |
| 404 | `{"error": "No customer account found…"}` | Valid OTP, `role != customer` |
| 403 | `{"error": "Your account has been blocked…"}` | Valid OTP, `is_active is False` |
| 500 | `{"error": "User could not be created or retrieved"}` | `create_new_user` returned `None` |
| 500 | `{"error": "Something went wrong. Please try again."}` | Unhandled exception |

**Validation Rules** (`user/views.py` · `VerifySigninOtp.post`; shared consume path in
`user/user_generics.py` · `consume_signin_otp`)
- `email` and `otp` both required.
- OTP lookup **no longer filters on the submitted code**. It resolves the newest live row
  for the email (`email__iexact`, `is_used=False`, `is_active=True`, `-created_at`) and
  *then* compares — which is what makes an attempt countable at all. Under the old shape
  a wrong guess matched no row, so there was nothing to charge an attempt against.
- **Attempt cap**: each wrong guess increments `SigninOtp.attempts`; at
  `SIGNIN_OTP_MAX_ATTEMPTS` (5) the row is deactivated and the endpoint answers 429.
  Mirrors the cap the WhatsApp path has always enforced.
- `expires_at > now()`; otherwise the row is deactivated and 400 "expired".
- Role and `is_active` re-checked **after** OTP validity, before token issue.

> **Same rule, three response shapes.** `consume_signin_otp` raises a machine-readable
> code (`no_active` / `too_many_attempts` / `expired` / `incorrect`) and each portal maps
> it onto its own existing wording — deliberately, so three shipped API contracts did not
> silently change. The customer and admin portals answer `{"message": …}`; the partner
> portal answers `{"error": …}`. **Branch on the status, not the key.**

**Database Changes**
1. `SigninOtp` → `is_used=True`, `is_active=False`, `is_expired=False`; on a **wrong**
   guess instead, `attempts` UPDATE (and `is_active=False` once the cap is reached)
2. `User` INSERT (new) or `last_login_device` UPDATE (existing)
3. On create: `referral_code` UPDATE
4. `Token` — **all** rows for the user DELETEd, then one created (single session)
5. `AuditLog` + `AuditChain` — `LOGIN_SUCCEEDED`, or `LOGIN_FAILED` on the 404/403 paths

**Notifications Triggered** — None.
**Background Tasks Triggered** — None.
**State Changes** — OTP consumed. No order-domain state.
**Next API** — API 3, then Flow 18 or Flow 2.
**Related APIs** — API 1, API 8, API 12.

---

## API 3 · Customer logout

| Field | Value |
|---|---|
| **Purpose** | Delete the token and optionally unregister the device |
| **Business Reason** | Not stated in code — the view carries no docstring |
| **Endpoint** | `/api/v1/user/logout/` |
| **Method** | `GET` |
| **Authentication** | **None** — `authentication_classes = []` (`user/views.py:160`) |
| **Permissions** | **None** — `permission_classes = []` (`user/views.py:159`) |
| **Headers** | `Authorization: Token <key>` (parsed manually, not authenticated), `server-secret-key` |
| **Path Parameters** | None |
| **Query Parameters** | `fcm_token` *(optional)* — also accepted in the body |

**Request**
```
GET /api/v1/user/logout/?fcm_token=<device-push-token>
Authorization: Token 9f2c1b7a...
server-secret-key: <SERVER_SECRET_KEY>
```

**Success Response — 200**
```json
{ "message": "User is logged out" }
```
Always 200 — including with no header and no matching token.

**Error Responses** — 500 `{"error": "<str(exception)>"}` only.

**Validation Rules** — None. The header is matched with `startswith("Token ")` and split.

**Database Changes** — `Token` DELETE by key; `FcmToken` DELETE by token string
when supplied. `FcmToken.token` is globally unique, so this targets exactly one device.
**Notifications / Background Tasks / State Changes** — None. **No audit entry is written.**
**Next API** — None (terminal).
**Related APIs** — API 4, API 9, API 13.

---

## API 4 · Register a push token

| Field | Value |
|---|---|
| **Purpose** | Bind this device's FCM token to the caller |
| **Business Reason** | Prerequisite for every push in Flow 21; without it a user receives in-app rows but no push |
| **Endpoint** | `/api/v1/user/add-fcm-token/` |
| **Method** | `POST` |
| **Authentication** | Token |
| **Permissions** | `IsAuthenticated` |
| **Headers** | `Content-Type`, `Authorization`, `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body** — `{ "fcm_token": "e7Qk...:APA91bH..." }`
**Success Response — 200** — `{ "message": "FCM token is added successfully" }`
**Error Responses** — 400 `{"error": "FCM token is required"}` · 500 `{"error": "<str(exception)>"}`

**Validation Rules** (`user/views.py` · `AddFcmToken.post` · 316-333) — `fcm_token` presence only.

**Database Changes** — `get_or_create(token=…, defaults={'user': request.user})`.
**If the row already exists under a different user it is reassigned to the caller**
(`user/views.py:327-329`) — deliberate device-handover behaviour for a shared device.
**Notifications / Background Tasks / State Changes** — None.
**Next API** — None. **Related APIs** — API 2, API 3.

---

## API 5 · Send a WhatsApp verification OTP

| Field | Value |
|---|---|
| **Purpose** | Prove the caller controls a WhatsApp number |
| **Business Reason** | Profile verification, **not** authentication — issues no token. Gates WhatsApp delivery in Flow 22 |
| **Endpoint** | `/api/v1/user/whatsapp/send-otp/` |
| **Method** | `POST` |
| **Authentication** | Token |
| **Permissions** | `IsAuthenticated` |
| **Headers** | `Content-Type`, `Authorization`, `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body**
```json
{ "country_code": "+91", "whatsapp_number": "9876543210" }
```
`country_code` falls back to the value already on the profile when omitted.

**Success Response — 200** — `{ "message": "OTP sent to your WhatsApp number" }`

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "WhatsApp number is required"}` | Missing number |
| 400 | `{"error": "Country code is required"}` | None supplied and none on profile |
| 429 | `{"error": "Please wait up to 60 seconds before requesting another OTP."}` | Resend inside `WHATSAPP_OTP_RESEND_COOLDOWN_SECONDS` |
| 500 | `{"error": "Something went wrong. Please try again."}` | Unhandled exception |

**Validation Rules** (`user/views.py` · `SendWhatsappOtp.post` · 218-249) — as above.

**Database Changes** — `User` UPDATE `country_code`, `whatsapp_number`,
`whatsapp_verified=False` (the unverified number is persisted so it survives a
resend and can be echoed back); `WhatsappOtp` INSERT.
**Notifications Triggered** — None.
**Background Tasks Triggered** — `user.tasks.send_whatsapp_otp.delay(otp_obj.id)`.
**State Changes** — `whatsapp_verified` forced to `False`.
**Next API** — API 6. **Related APIs** — API 11 (partner WhatsApp sign-in reuses `generate_whatsapp_otp`).

---

## API 6 · Verify the WhatsApp OTP

| Field | Value |
|---|---|
| **Purpose** | Mark the number verified |
| **Business Reason** | Only a verified number receives WhatsApp messages in Flow 22 |
| **Endpoint** | `/api/v1/user/whatsapp/verify-otp/` |
| **Method** | `POST` |
| **Authentication** | Token |
| **Permissions** | `IsAuthenticated` |
| **Headers** | `Content-Type`, `Authorization`, `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body** — `{ "otp": "7391" }`
**Success Response — 200** — `{ "message": "WhatsApp number verified successfully" }`

**Error Responses** — all 400

| Body | Condition |
|---|---|
| `{"error": "OTP is required"}` | Missing field |
| `{"error": "No active OTP found. Please request a new one."}` | No unused active row for this user |
| `{"error": "Too many incorrect attempts. Please request a new OTP."}` | `attempts >= WHATSAPP_OTP_MAX_ATTEMPTS` (5); row deactivated |
| `{"message": "OTP has expired"}` | Past expiry; row deactivated |
| `{"message": "OTP is incorrect"}` | Wrong code; `attempts` incremented |

**Validation Rules** (`user/views.py` · `VerifyWhatsappOtp.post` · 265-305) — newest
unused active `WhatsappOtp` for this user; attempt cap, then expiry, then code match.

**Database Changes** — `WhatsappOtp` → `is_used=True, is_active=False` via
`mark_as_used()`, or `attempts` UPDATE on a wrong code; `User.whatsapp_verified = True`.
**Notifications / Background Tasks** — None.
**State Changes** — `whatsapp_verified` → `True`.
**Next API** — None. **Related APIs** — API 5.

**Tunables** — `WHATSAPP_OTP_EXPIRY_MINUTES` (5), `WHATSAPP_OTP_MAX_ATTEMPTS` (5),
`WHATSAPP_OTP_RESEND_COOLDOWN_SECONDS` (60) — all in `settings.py:385-387`.

---

## API 7 · Request an admin OTP

| Field | Value |
|---|---|
| **Purpose** | Dispatch a one-time code to an admin's email |
| **Business Reason** | One of two admin sign-in methods (the other is password login, API 10); also the recovery path for admins without a password |
| **Endpoint** | `/api/superadmin/admin/login-with-otp/` |
| **Method** | `POST` |
| **Authentication** | None |
| **Permissions** | Open |
| **Headers** | `Content-Type` only — **`server-secret-key` is not required**; `/api/superadmin/` is middleware-exempt |
| **Path / Query Parameters** | None |

**Request Body** — `{ "email": "ops@anchormart.example" }`
**Success Response — 200** — `{ "message": "Otp is sent to your email" }`

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Email is required"}` | Missing / empty email |
| 404 | `{"error": "No admin account found for this email. Please contact support."}` | Email unknown **or** not an `admin`/`super_admin` (one message — existence is not revealed) |
| 403 | `{"error": "Your account has been blocked. Please contact support."}` | Account is an admin but `is_active is False` |
| 429 | `{"error": "An OTP was already sent. Please wait N seconds before requesting another."}` | Within the 120 s resend cooldown |
| 429 | `{"detail": "Request was throttled. Expected available in N seconds."}` | **Per-IP** `otp_request` throttle (10/min) — a different body shape |
| 500 | `{"error": "<str(exception)>"}` | Unhandled exception |

**Validation Rules** (`admin_panel/views/admin_views.py` · `AdminLoginOtp.post`)
— email required; looked up `email__iexact`. **Gates `role` and `is_active` before any
OTP is generated** (added 2026-07-20): a non-admin, unknown, or blocked account never
receives an admin OTP. No OTP is sent on any error path. Mirrors API 1 (customer signin).

**Database Changes** — `SigninOtp` INSERT (only on success), plus the UPDATE that
deactivates any previously live code for the email (2026-08-06).
**Notifications / Background Tasks / State Changes** — None.
**Next API** — API 8. **Related APIs** — API 1.

---

## API 8 · Verify the admin OTP

| Field | Value |
|---|---|
| **Purpose** | Exchange a valid OTP for an admin token |
| **Business Reason** | Establishes the admin session that Flow 27 ownership checks depend on |
| **Endpoint** | `/api/superadmin/admin/verify-otp/` |
| **Method** | `POST` |
| **Authentication** | None |
| **Permissions** | Open |
| **Headers** | `Content-Type` only |
| **Path / Query Parameters** | None |

**Request Body**
```json
{ "email": "ops@anchormart.example", "otp": "5107", "device": "Chrome 133 / macOS" }
```
> `device` is read from the payload (`admin_views.py:98`) but **never persisted** —
> unlike APIs 2 and 12, which write it to `last_login_device`.

**Success Response — 200**
```json
{
  "message": "Otp is verified",
  "token": "3a7f1c9e5b2d8f04a6c1e9b7d3f5a802c4e6b9d1",
  "user": { "email": "ops@anchormart.example", "role": "super_admin" }
}
```
`role` is `admin` (operational sub-admin tier) or `super_admin`. The distinction
drives order ownership (Flow 27) and audit visibility (Flow 34); it is **not**
enforced by `IsAdminUser`, which treats both identically.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Email and OTP are required"}` | Either missing |
| 400 | `{"message": "Otp is incorrect or already used"}` | Wrong code, or no live code for this email |
| 400 | `{"message": "Otp is expired"}` | Past expiry |
| **429** | `{"message": "Too many incorrect attempts. Please request a new OTP."}` | **New 2026-08-06** — 5 wrong guesses against this code; the code is burned |
| 429 | `{"detail": "Request was throttled. Expected available in N seconds."}` | **Per-IP** `otp_verify` throttle (20/min) — a different body shape |
| 403 | `{"error": "User is not admin"}` | Valid OTP, role not `admin`/`super_admin` — audited `wrong_role` |
| 403 | `{"error": "Your account has been blocked. Please contact support."}` | Valid OTP, but `is_active is False` — audited `blocked`; **any existing token for the user is deleted** |
| 500 | `{"error": "User could not be created or retrieved"}` | Valid OTP, no account for that email |

**Validation Rules** (`admin_panel/views/admin_views.py` · `AdminVerifyOtp.post`)
- `email` and `otp` required.
- Verification now runs through the shared `consume_signin_otp` path (same as APIs 2 and
  12), which brings the **5-guess per-code cap** to this portal and fixes two admin-only
  defects: the lookup was `email=email` — **case-sensitive**, while the request step
  stored whatever case the admin typed (validation finding **F-15**, now closed) — and it
  ignored `is_active`, so a code retired by a later request still verified here.
- **Role and `is_active` both checked** (is_active added 2026-07-20). A blocked admin
  presenting an OTP issued before the block is refused **and has their token(s) revoked**,
  so a session predating the block dies immediately.

**Database Changes** — `SigninOtp` consumed; on success `Token` via **`get_or_create`**
(stable token, concurrent admin sessions permitted); on the blocked path **`Token` DELETE**
for the user. `AuditLog` `LOGIN_SUCCEEDED`, or `LOGIN_FAILED` with
`reason: "wrong_role" | "blocked"`.

**Token lifetime** — admin and super_admin tokens **never expire** (`user/auth_utils.py`).
**Notifications / Background Tasks / State Changes** — None.
**Next API** — Flow 27 (claim an order before any write).
**Related APIs** — API 2, API 12.

---

## API 9 · Admin logout

| Field | Value |
|---|---|
| **Purpose** | Delete the token |
| **Business Reason** | Not stated in code — the view carries no docstring. Behaviourally identical to API 3 and API 13 |
| **Endpoint** | `/api/superadmin/admin/logout/` |
| **Method** | `GET` |
| **Authentication / Permissions** | None / None — both lists empty (`admin_views.py:61-62`) |
| **Headers** | `Authorization: Token <key>` (parsed, not authenticated) |
| **Path / Query Parameters** | None |

**Success Response — 200** — `{ "message": "Admin is logged out" }`
**Error Responses** — 500 `{"error": "<str(exception)>"}`
**Database Changes** — `Token` DELETE by key. **No audit entry.**
**Next API** — None. **Related APIs** — API 3, API 13.

---

## API 10 · Admin password login

| Field | Value |
|---|---|
| **Purpose** | Exchange an admin's email + password for a token |
| **Business Reason** | One of two admin sign-in methods, restored 2026-07-20 (reversing the #37 retirement). Lets admins log in without waiting for an OTP; superusers use their `createsuperuser` password, panel-created admins use the password emailed at creation |
| **Endpoint** | `/api/superadmin/admin/login/` |
| **Method** | `POST` |
| **Authentication** | None |
| **Permissions** | Open |
| **Headers** | `Content-Type` only — `/api/superadmin/` is middleware-exempt from `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body**
```json
{ "email": "ops@anchormart.example", "password": "Xk7mfpq2ntbe" }
```

**Success Response — 200**
```json
{
  "message": "Admin login successful",
  "token": "3a7f1c9e5b2d8f04a6c1e9b7d3f5a802c4e6b9d1",
  "user": { "email": "ops@anchormart.example", "role": "super_admin" }
}
```

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"error": "Email and password are required"}` | Either field missing |
| 404 | `{"error": "User not found"}` | No account for that email |
| 403 | `{"error": "User is not admin"}` | Account exists, role not `admin`/`super_admin` — audited `wrong_role` |
| 403 | `{"error": "Your account has been blocked. Please contact support."}` | `is_active is False` — audited `blocked` |
| 401 | `{"error": "Invalid password"}` | Wrong password — audited `bad_password` |
| 500 | `{"error": "<str(exception)>"}` | Unhandled exception |

**Validation Rules** (`admin_panel/views/admin_views.py` · `AdminLogin.post`)
- `email` and `password` required.
- Email normalised `strip().lower()`; lookup `email__iexact`.
- **Gate order:** role → `is_active` → `check_password`. Role and active are checked
  **before** the password so a non-admin or blocked account is never turned into a
  password oracle.

**Database Changes** — `Token` via `get_or_create` (stable token, matching the OTP
path, so a second client does not invalidate the first); `AuditLog` `LOGIN_SUCCEEDED`
with `method: "password"`, or `LOGIN_FAILED` with `reason: wrong_role | blocked |
bad_password`.
**Notifications / Background Tasks / State Changes** — None.
**Next API** — Flow 27 (claim an order before any write).
**Related APIs** — API 7, API 8 (the OTP alternative); Flow 31 (where the admin's
password is generated and emailed).

---

## API 11 · Request a partner OTP

| Field | Value |
|---|---|
| **Purpose** | Dispatch a code over the partner's preferred channel |
| **Business Reason** | Partners are admin-provisioned (Flow 28) and never self-register, so this endpoint must never create anything |
| **Endpoint** | `/api/partner/signin/` |
| **Method** | `POST` |
| **Authentication / Permissions** | None / Open (`permission_classes = []`, `authentication_classes = []`) |
| **Headers** | `Content-Type`, `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body** — send **either** identifier; **WhatsApp wins when both are
supplied** (`auth_views.py` · `_resolve` · 60-70).
```json
{ "email": "DP-00124" }
```
```json
{ "whatsapp": "9876543210" }
```
`email` accepts a registered address **or** a partner ID such as `DP-00124`,
matched `partner_id__iexact` against `DeliveryPartnerProfile`.

**Success Response — 200**
```json
{ "message": "OTP sent via email.", "channel": "email", "destination": "d*****@anchormart.example" }
```
```json
{ "message": "OTP sent via whatsapp.", "channel": "whatsapp", "destination": "******3210" }
```
`destination` is masked (`_mask_email` / `_mask_phone`, last 4 digits) so the app
can show *where* the code went without leaking the contact. Echo it on the OTP screen.

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"message": ["Provide either email/partner ID or a WhatsApp number to sign in."]}` | Neither identifier — DRF, keyed `message` per `NON_FIELD_ERRORS_KEY` |
| 404 | `{"error": "Account not found or not yet activated. Please contact your admin."}` | Identifier does not resolve to a provisioned partner |
| 403 | `{"error": "Your account has been blocked. Please contact your admin."}` | `is_active is False` |
| 400 | `{"error": "No WhatsApp number on file. Please use email instead."}` | WhatsApp channel chosen, no number registered |
| 429 | `{"error": "An OTP was already sent. Please wait N seconds before requesting another."}` | **Email channel only** — within the 120 s resend cooldown. (The WhatsApp channel has its own separate handling.) |
| 429 | `{"detail": "Request was throttled. Expected available in N seconds."}` | **Per-IP** `otp_request` throttle (10/min) — a different body shape, and it fires on **both** channels |

> The 404 message is **identical for every unresolved identifier** — unknown email,
> unknown partner ID, correct email but wrong role, missing profile. The code states
> this is deliberate. Never surface anything that distinguishes these cases.

**Validation Rules** (`partner_app/views/auth_views.py` · `PartnerSignin.post` · 86-128)
- Serializer requires at least one identifier.
- `_is_partner(user)` = `role == DELIVERY_PARTNER` **and**
  `hasattr(user, "delivery_partner_profile")`.
- `is_active` checked before any OTP is generated.

**Database Changes** — `SigninOtp` or `WhatsappOtp` INSERT.
**Background Tasks Triggered** — WhatsApp channel only: `send_whatsapp_otp.delay(...)`.
**Notifications / State Changes** — None.
**Next API** — API 12. **Related APIs** — API 1, API 5.

---

## API 12 · Verify the partner OTP

| Field | Value |
|---|---|
| **Purpose** | Exchange a valid OTP for a partner token |
| **Business Reason** | Establishes the session that scopes every partner action to their own `DeliveryAssignment` rows |
| **Endpoint** | `/api/partner/verify-otp/` |
| **Method** | `POST` |
| **Authentication / Permissions** | None / Open |
| **Headers** | `Content-Type`, `server-secret-key` |
| **Path / Query Parameters** | None |

**Request Body** — resend the **same identifier** used at API 11 so the channel
resolves identically.
```json
{ "email": "DP-00124", "otp": "6248", "device": "Samsung A54 / Android 14" }
```

**Success Response — 200**
```json
{
  "message": "OTP verified.",
  "token": "c8b2f6a1d94e70b3f5a8c2e6d0b4f7a9c3e5d18b",
  "partner": {
    "id": "0d3f2c1a-9b8e-4d7c-a6f5-1e2b3c4d5e6f",
    "partner_id": "DP-00124",
    "name": "Ravi Kumar",
    "email": "ravi@anchormart.example",
    "port": "Port of Singapore",
    "is_available": true,
    "can_verify": true,
    "can_deliver": false
  }
}
```
`name` falls back to the email when no first/last name is set; `port` is `null`
when no port is assigned.

> **`can_verify` / `can_deliver` added 2026-08-03.** They ride on the sign-in response — not only
> on `GET /api/partner/profile/` — so the app knows which screens to render **before its first
> render**. Serving them from the profile endpoint alone would leave the app blind between sign-in
> and its first profile fetch, showing the wrong tabs and then silently correcting itself.
> A partner may be verify-only, deliver-only, or **both** (the default, and the common case).
> Screen-by-screen rules: [`../../PARTNER_CAPABILITY_FRONTEND_GUIDE.md`](../../PARTNER_CAPABILITY_FRONTEND_GUIDE.md) ·
> assignment behaviour: [Flow 28](../Wave2/28-delivery-partner-lifecycle.md).

**Error Responses**

| Status | Body | Condition |
|---|---|---|
| 400 | `{"otp": ["This field is required."]}` | Missing OTP — DRF field error |
| 400 | `{"message": ["Provide either email/partner ID or a WhatsApp number to verify."]}` | Neither identifier |
| 404 | `{"error": "Account not found or not yet activated. Please contact your admin."}` | Unresolved identifier |
| 403 | `{"error": "Your account has been blocked. Please contact your admin."}` | `is_active is False` |
| 400 | `{"error": "OTP is incorrect or already used."}` | Wrong code, or no live code |
| 400 | `{"error": "OTP has expired."}` | Past expiry; row deactivated |
| **429** | `{"error": "Too many incorrect attempts. Please request a new OTP."}` | **Email channel: new 2026-08-06** — 5 wrong guesses against this code; the code is burned. The WhatsApp channel has always had this cap, with its own wording (see API 6) |
| 429 | `{"detail": "Request was throttled. Expected available in N seconds."}` | **Per-IP** `otp_verify` throttle (20/min) — a different body shape |

**Validation Rules** (`partner_app/views/auth_views.py` · `PartnerVerifyOtp.post`)
— identifier resolves → `_is_partner` → `is_active` → OTP check on the resolved channel
→ expiry.

> **The two channels take different code paths, deliberately.** The **email** branch goes
> through the shared `consume_signin_otp` (resolve the newest live code, then compare), so
> the 5-guess cap is identical across all three portals. The **WhatsApp** branch keeps its
> own lookup that matches on the submitted code, because there the scoping key is the
> destination *number*, not the email — a different shape that already had its own cap.
> Consequence for the client: a wrong WhatsApp code and a wrong email code can return the
> same 400 wording but are counted by different mechanisms.

**Database Changes** — OTP consumed via `mark_as_used()`; `last_login_device` UPDATE
when `device` supplied; **all** prior `Token` rows DELETEd then one created (single
session); `AuditLog` `LOGIN_SUCCEEDED` with `channel` in metadata, or `LOGIN_FAILED`
with `reason: "blocked"`.

> **This endpoint never creates a user.** An unknown identifier is always 404 —
> asserted by `test_verify_otp_does_not_create_user`.

**Notifications / Background Tasks / State Changes** — None.
**Next API** — Flow 28 (availability toggle, then the assignment queue).
**Related APIs** — API 2, API 8, API 11.

---

## API 13 · Partner logout

| Field | Value |
|---|---|
| **Purpose** | Delete the token |
| **Business Reason** | Not stated in code — the docstring reads only *"Invalidate the partner's token."* Behaviourally identical to API 3 and API 9 |
| **Endpoint** | `/api/partner/logout/` |
| **Method** | `GET` |
| **Authentication / Permissions** | None / None (`auth_views.py:226-227`) |
| **Headers** | `Authorization: Token <key>` (parsed, not authenticated), `server-secret-key` |
| **Path / Query Parameters** | None |

**Success Response — 200** — `{ "message": "Partner logged out." }`
**Database Changes** — `Token` DELETE by key. **No audit entry.**
**Next API** — None. **Related APIs** — API 3, API 9.

---

## What happens next

| Condition | Continue to |
|---|---|
| `show_referral_screen = true` | **Flow 18** — Referral & Loyalty Points Earning |
| `vessel_profile_completed = false` (from `GET /user/get-profile/`) | **Flow 2** — Profile, Vessel & Account Management |
| Partner signed in | **Flow 28** — availability toggle, then the assignment queue |
| Admin signed in | **Flow 27** — claim an order before any write |

---

## Source reference

| Concern | File |
|---|---|
| Customer sign-in / verify / logout / FCM / WhatsApp OTP | [`user/views.py`](../../backend/user/views.py) |
| OTP generation, user creation, referral code | [`user/user_generics.py`](../../backend/user/user_generics.py) |
| OTP email sender (raw thread) | [`user/email.py`](../../backend/user/email.py) |
| WhatsApp OTP Celery task | [`user/tasks.py`](../../backend/user/tasks.py) |
| Token expiry policy | [`user/auth_utils.py`](../../backend/user/auth_utils.py) |
| `SigninOtp`, `WhatsappOtp`, `FcmToken`, `User` | [`user/models.py`](../../backend/user/models.py) |
| Admin password login / OTP request / verify / logout | [`admin_panel/views/admin_views.py`](../../backend/admin_panel/views/admin_views.py) |
| Admin password generation on creation | [`admin_panel/serializers/admin_serializers.py`](../../backend/admin_panel/serializers/admin_serializers.py) (`generate_admin_initial_password`) |
| Admin role permission | [`admin_panel/admin_auth_utils.py`](../../backend/admin_panel/admin_auth_utils.py) |
| Partner sign-in / verify / logout | [`partner_app/views/auth_views.py`](../../backend/partner_app/views/auth_views.py) |
| Partner payload validation | [`partner_app/serializers/auth_serializers.py`](../../backend/partner_app/serializers/auth_serializers.py) |
| Partner role permission | [`partner_app/permissions.py`](../../backend/partner_app/permissions.py) |
| Auth audit events | [`orders/audit.py`](../../backend/orders/audit.py) |
| DRF config, OTP constants | [`AnchorMart/settings.py`](../../backend/AnchorMart/settings.py) |
