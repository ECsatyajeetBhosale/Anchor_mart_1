/**
 * All user-facing display strings.
 * Keep UI text here to support future i18n.
 * Never hardcode display strings inside components.
 */
export const MESSAGES = {
  AUTH: {
    LOGIN_TITLE: "Welcome back",
    LOGIN_SUB: "Sign in to your admin account",
    EMAIL_LABEL: "Email Address",
    EMAIL_PLACEHOLDER: "admin@anchormart.io",
    PASSWORD_LABEL: "Password",
    PASSWORD_PLACEHOLDER: "Enter your password",
    LOGIN_BUTTON: "Sign In",
    LOGGING_IN: "Signing in…",
    INVALID_CREDENTIALS: "Invalid email or password. Please try again.",
    NETWORK_ERROR: "Unable to connect. Please check your connection.",
    OTP: {
      // Step A — email
      EMAIL_STEP_TITLE: "Sign in with OTP",
      EMAIL_STEP_SUB: "We'll email you a 4-digit code to verify it's you.",
      SEND_BUTTON: "Send OTP",
      SENDING: "Sending…",
      // Step B — code
      CODE_STEP_TITLE: "Enter your code",
      CODE_STEP_SUB: "We sent a 4-digit code to",
      CODE_LABEL: "4-Digit Verification Code",
      VERIFY_BUTTON: "Verify & Sign In",
      VERIFYING: "Verifying…",
      RESEND: "Resend OTP",
      RESEND_IN: (seconds: number) => `Resend OTP in ${seconds}s`,
      CHANGE_EMAIL: "Use a different email",
      // Cross-links between the two sign-in methods
      PREFER_OTP: "Prefer a one-time code?",
      USE_OTP_LINK: "Sign in with OTP",
      PREFER_PASSWORD: "Have your password?",
      USE_PASSWORD_LINK: "Sign in with password",
      OTP_SENT: "Code sent to your email",
      // Errors — mapped from HTTP status, never from the response key
      EMAIL_REQUIRED: "Email is required",
      OTP_REQUIRED: "Enter the 4-digit code sent to your email",
      NO_ACCOUNT: "No admin account found for this email. Please contact support.",
      BLOCKED: "Your account has been blocked. Please contact support.",
      NOT_ADMIN: "This account can't access the admin console. Please contact support.",
      GENERIC_ERROR: "Something went wrong, please try again.",
      EXPIRED_HINT: "That code has expired. Request a new one to continue.",
    },
  },
  DASHBOARD: {
    /**
     * The hero sentence — the only line on this screen that says what to *do*
     * rather than what exists, which is why it is now the heading.
     *
     * It replaced a hardcoded "Welcome back, Super Admin": that string was not
     * read from the session at all, so it greeted a sub-admin as a super admin
     * while the sidebar two inches below correctly showed `admin`. On a console
     * where role decides what you may do, a heading that misstates it is worse
     * than no heading.
     *
     * Counts are pluralised. The formatted stats are localised strings, so this
     * takes the raw numbers — reading the formatted ones is what produced
     * "1 verifications to review".
     *
     * The pending-intents clause was dropped on 2026-08-19 with the stat it
     * read: `pending_intents` left `dashboard/stats/` when the
     * `pending_intent` status was retired. Keeping the clause would have held
     * the whole sentence at "Loading today's figures…" forever, since it only
     * renders once every figure has arrived.
     */
    HERO: {
      EYEBROW: (date: string) => `Operations Dashboard · ${date}`,
      LOADING: "Loading today's figures…",
      SUMMARY: (verifications: number, inFlight: number) =>
        [
          `${verifications} ${verifications === 1 ? "verification" : "verifications"} to review`,
          `${inFlight.toLocaleString()} ${inFlight === 1 ? "order" : "orders"} in flight`,
        ].join(", "),
    },

    TITLE: "Operations Dashboard",
    TOTAL_SAILORS: "Total Sailors",
    ACTIVE_PARTNERS: "Active Partners",
    ORDERS_TODAY: "Orders Today",
    REVENUE_TODAY: "Revenue Today",
    IN_PROGRESS: "In Progress",
    CANCELLED: "Cancelled",
    LOADING: "Loading dashboard…",
    ERROR: "Failed to load dashboard data. Please try again.",
    LIVE_ORDERS_EMPTY: "No live orders for this period",
    // Header chrome
    REFRESH: "Refresh",
    EXPORT: "Export",
    REPORT_EXPORTED: "Report exported",
    // Period toggle
    PERIOD: {
      TODAY: "Today",
      WEEK: "Week",
      MONTH: "Month",
    },
    DATE_RANGE_PLACEHOLDER: "Custom range",
    // The API returns snapshots and period counts in one payload; only three of
    // the fields respond to this filter, so the board says which.
    PERIOD_NOTE:
      "Orders, Cancelled and Refunded follow this period — every other tile is live now.",
    /** Heading over the three tiles the period toggle moves. */
    PERIOD_GROUP: "This Period",
    /**
     * The board is grouped by **what you do with a number**, not by which
     * endpoint returned it. Seventeen equally-weighted tiles in three unlabelled
     * runs read as one wall; these say which run is which, and the order puts
     * work that is waiting above counts that are merely true.
     */
    ATTENTION_GROUP: "Needs Attention",
    WORK_GROUP: "Open Queues",
    CATALOG_GROUP: "Catalog & People",
    // KPI stat-card labels
    STATS: {
      TOTAL_SAILORS: "Total Sailors",
      ACTIVE_PARTNERS: "Active Partners",
      ORDERS: "Orders",
      INTENTS_RECEIVED: "Intents Received",
      IN_PROGRESS: "In Progress",
      CANCELLED: "Cancelled",
      PENDING_INTENTS: "Pending Intents",
    },
    // Live Orders card
    LIVE_ORDERS: "Live Orders",
    REALTIME: "Real-time",
    VIEW_ALL: "View all",
    VIEW_ALL_ORDERS: "View all orders",
    SHOWING_ORDERS: (shown: number, total: number) => `Showing ${shown} of ${total} orders`,
    UNASSIGNED: "Unassigned",
    LIVE_ORDERS_COLUMNS: {
      ORDER_ID: "Order ID",
      SAILOR: "Sailor",
      SHIP_PORT: "Ship / Port",
      PARTNER: "Partner",
      STATUS: "Status",
      TOTAL: "Total",
    },
    VIEW_DETAIL: "View detail",
    // Operations orders section (searchable / port- and status-filterable list)
    ORDERS_SECTION: {
      TITLE: "All Orders",
      SEARCH_PLACEHOLDER: "Search by customer, email or order id…",
      ALL_STATUSES: "All statuses",
      ALL_PORTS: "All ports",
      EMPTY: "No orders match the current filters.",
      FETCH_ERROR: "Failed to load orders.",
      // Labels for the `order_status` values the endpoint accepts
      STATUS: {
        INTENT_RECEIVED: "Intent Received",
        INTENT_REJECTED: "Intent Rejected",
        SOURCING: "Sourcing",
        PAYMENT_PENDING: "Payment Pending",
        CONFIRMED: "Confirmed",
        PARTNER_ASSIGNED: "Partner Assigned",
        ITEMS_COLLECTED: "Items Collected",
        AT_PORT: "At Port",
        AT_BERTH: "At Berth",
        DELIVERED: "Delivered",
        CANCELLED: "Cancelled",
        REFUNDED: "Refunded",
      },
    },
    // Revenue chart card
    REVENUE_TITLE: "Revenue — Last 14 Days",
    REVENUE_EXPORTED: "Revenue CSV exported",
    REVENUE_EMPTY: "No revenue data for this period",
    CHART_MODE: {
      DAILY: "Daily",
      WEEKLY: "Weekly",
    },
    WEEKLY_LOADING: "Weekly view loading…",
    METRICS: {
      TOTAL: "Total",
      AVG_DAY: "Avg / Day",
      PEAK_DAY: "Peak Day",
      GROWTH: "Growth",
    },
    // Top Products card
    TOP_PRODUCTS: "Top Products",
    TOP_PRODUCTS_EMPTY: "No product sales for this period",
    // Active Partners card
    ACTIVE_PARTNERS_TITLE: "Active Partners",
    ACTIVE_PARTNERS_EMPTY: "No active partners right now",
    WEEKLY_EARNINGS: "Weekly partner earnings",
    PARTNER_FREE: "free",
    PARTNER_ACTIVE: (count: number) => `${count} active`,
    // Action Required card
    ACTION_REQUIRED: "Action Required",
    ACTION_REQUIRED_EMPTY: "Nothing needs attention right now",
    ACTIONS_OPEN: (count: number) => `${count} open`,
    ACTION_PENDING: (count: number) => `${count} pending`,
    ACTION_BUTTONS: {
      REVIEW: "Review",
      VERIFY: "Verify",
      COLLECT: "Collect",
      APPROVE: "Approve",
    },
  },
  ANALYTICS: {
    TITLE: "Analytics & Insights",
    ERROR: "Failed to load analytics data. Please try again.",
    EMPTY: "No data for this period",
    // Period pill toggle
    PERIOD: {
      D7: "7 Days",
      D30: "30 Days",
      QUARTER: "Quarter",
      YEAR: "Year",
    },
    // KPI stat-card labels
    STATS: {
      MONTHLY_REVENUE: "Monthly Revenue",
      TOTAL_ORDERS: "Total Orders",
      ACTIVE_SAILORS: "Active Sailors",
    },
    // Chart cards
    SALES_TREND: "Sales Trend (Daily)",
    ORDERS_BY_CATEGORY: "Orders by Category",
    PRODUCT_SALES: "Product-wise Sales",
    /** Picker placeholder — no product has been explicitly chosen. */
    PRODUCT_PLACEHOLDER: "Select a product",
    /** Prefixes the auto-picked product's name in the card title. */
    PRODUCT_TOP_PREFIX: "Top product ·",
    /** Shown when the charted product has been soft-deleted. Its sales still
     *  count — the endpoint reports history, and delisting does not undo it. */
    PRODUCT_DELISTED: "Delisted",
    // The catalog-type labels moved to COMMON.PRODUCT_PICKER when the deal form
    // adopted the same control — both pickers must offer the same three types.
    PRODUCT_METRICS: {
      REVENUE_7D: "Revenue (7d)",
      UNITS_SOLD: "Units Sold",
      GROWTH: "Growth",
    },
    UNITS_SUFFIX: (n: number) => `${n} units`,
    ORDERS_SUFFIX: (n: number) => `${n} orders`,
  },
  SAILORS: {
    // Page chrome
    TITLE: "Sailors Management",
    SEARCH_PLACEHOLDER: "Search sailors...",
    ADD_SAILOR: "Add Sailor",
    EDIT_SAILOR: "Edit Sailor",
    SAILOR_ADDED: "Sailor added successfully",
    SAILOR_UPDATED: "Sailor updated successfully",
    SAILOR_BLOCKED: "Sailor blocked",
    BLOCK_CONFIRM_TITLE: "Block Sailor",
    BLOCK_CONFIRM_MSG: "This sailor will lose app access immediately.",
    EMPTY: "No sailors found",
    EMPTY_FILTERED: "No sailors match the current filters.",
    FETCH_ERROR: "Failed to load sailors.",
    // Status dropdown — the only status control (values map to the API's
    // `?status=` param, which also accepts "new").
    STATUS_FILTER: {
      ALL: "All Status",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      NEW: "New",
    },
    // KPI cards
    STATS: {
      TOTAL: "Total Sailors",
      LOYALTY: "Loyalty Pts Issued",
      REFERRALS: "Referrals (Month)",
    },
    // Table
    COLUMNS: {
      SAILOR: "Sailor",
      CONTACT: "Contact",
      JOINED: "Joined",
      ORDERS: "Orders",
      LOYALTY: "Loyalty Pts",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    ACTIONS: {
      VIEW: "View",
      EDIT: "Edit",
    },
    PTS_SUFFIX: " pts",
    // Read-only detail drawer
    DETAIL: {
      TITLE: "Sailor Details",
      SUBTITLE: "Profile, contact & activity overview",
      LOADING: "Loading latest details…",
      CONTACT_SECTION: "Contact Details",
      EMAIL: "Email",
      CONTACT: "Contact",
      JOINED: "Joined",
      SHIP: "Ship / IMO",
      ACTIVITY_SECTION: "Activity",
      ORDERS: "Orders",
      LOYALTY: "Loyalty Pts",
      CART: "Cart Items",
      WISHLIST: "Wishlist",
      CLOSE: "Close",
      MESSAGE: "Message",
      EDIT: "Edit",
    },
    // Add / edit drawers
    FORM: {
      ADD_TITLE: "Add New Sailor",
      ADD_SUBTITLE: "Register a new sailor to the platform",
      EDIT_TITLE: "Edit Sailor",
      EDIT_SUBTITLE: "Update sailor account details",
      FIRST_NAME: "First Name",
      FIRST_NAME_PLACEHOLDER: "e.g. Abhishek",
      LAST_NAME: "Last Name",
      LAST_NAME_PLACEHOLDER: "e.g. Nadurbar",
      COUNTRY_CODE: "Country Code",
      COUNTRY_CODE_PLACEHOLDER: "91",
      WHATSAPP: "WhatsApp Number",
      WHATSAPP_PLACEHOLDER: "8790091840",
      EMAIL: "Email Address",
      EMAIL_PLACEHOLDER: "sailor@email.com",
      ACCOUNT_STATUS: "Account Status",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      // No blanket "these fields are required" string: the sailor form now
      // reports per-field errors from `lib/validation` under each input.
      CANCEL: "Cancel",
      ADD_SUBMIT: "Add Sailor",
      ADDING: "Adding…",
      EDIT_SUBMIT: "Save Changes",
      SAVING: "Saving…",
      ADD_SUCCESS: "New sailor registered successfully",
      EDIT_SUCCESS: "Sailor profile updated successfully",
      SAVE_ERROR: "Could not save the sailor. Please try again.",
    },
  },
  // Open sailor carts (pre-checkout) shown beneath the Orders table.
  CARTS: {
    TITLE: "Open Carts",
    SUBTITLE:
      "Sailor baskets not yet checked out. Value is summed from live variant prices — carts store no total of their own.",
    EMPTY: "No open carts.",
    FETCH_ERROR: "Failed to load open carts.",
    DASH: "—",
    COLUMNS: {
      SAILOR: "Sailor",
      /** The SKUs in the cart — what the sailor picked. */
      ITEMS: "Items",
      /** Summed units across those SKUs — how many pieces, not how many rows. */
      QUANTITY: "Quantity",
      VALUE: "Cart Value",
      STATUS: "Status",
    },
    TYPE_EXPRESS: "Express",
    // Only express is distinguishable — the payload carries no catalog_type, so
    // regular and marine-emergency can't be told apart.
    SKU_OVERFLOW: (n: number) => `+${n}`,
    STATUS_READY: "Ready",
    // A cart holding an unorderable line looks fine to the sailor until
    // checkout refuses the whole basket — this is usually why one is stalled.
    STATUS_BLOCKED: (n: number) => `${n} unavailable`,
    BLOCKED_TITLE: (n: number) =>
      `${n} item(s) can no longer be ordered — checkout will refuse this cart until they're removed.`,
  },
  ORDERS: {
    // Page chrome
    TITLE: "Orders Management",
    // Tabs — post-payment orders vs pre-checkout baskets. Two different
    // lifecycles, so they get their own surfaces rather than one long scroll.
    TABS: {
      ORDERS: "Orders",
      CARTS: "Open Carts",
    },
    SUBTITLE_COUNT: "184 orders today",
    SUBTITLE_TAGLINE: "Full lifecycle visibility",
    SEARCH_PLACEHOLDER: "Search orders…",
    DATE_RANGE: "Date Range",
    // Row flag — an unactioned location report is waiting on the admin.
    LOCATION_REQUEST: "Location Change",
    /**
     * An unpaid delivery surcharge is blocking handover — the partner's own
     * endpoint refuses with "Delivery is on hold". Not the same signal as
     * LOCATION_REQUEST above, which only says a move was reported.
     */
    DELIVERY_ON_HOLD: "Delivery on hold",
    /**
     * The one worklist on this screen nothing else surfaces: partially
     * delivered *and* the vessel has gone, so the rest can never arrive and
     * only a refund closes it. Two orders sat in it for sixteen days.
     */
    SAILED_WORKLIST: "Vessel sailed · refund owed",
    SAILED_WORKLIST_HINT:
      "Partially delivered orders whose vessel has departed. The remainder can no longer be delivered — refund the undelivered value.",
    HOLD_HINT:
      "The sailor has an unpaid delivery surcharge for the new location. The partner cannot hand over until it is paid.",
    /** Shown only once delivery has concluded and something is actually owed. */
    UNDELIVERED_VALUE: (amount: string) => `${amount} undelivered`,
    // Flow 10 API 10 — picking-slip PDF
    SLIP: "Picking Slip",
    SLIP_DOWNLOADING: "Preparing…",
    SLIP_FAILED: "Could not download the picking slip.",
    SLIP_FILENAME: (ref: string) => `picking-slip-${ref || "order"}.pdf`,
    // Flow 28 API 13 — assignment history
    ASSIGNMENT_HISTORY: "Assignment History",
    ASSIGNMENT_HISTORY_EMPTY: "No previous assignments.",
    ASSIGNMENT_HISTORY_LOADING: "Loading history…",
    // Detail drawer chrome (shared `OrderDetailDrawer`)
    DRAWER: {
      TITLE: (ref: string) => `Order ${ref}`,
      // The drawer's depth is split across tabs rather than one long scroll —
      // same shape as the intent review drawer.
      TABS: {
        OVERVIEW: "Overview",
        ITEMS: (n: number) => (n > 0 ? `Items & Pricing · ${n}` : "Items & Pricing"),
        FULFILMENT: "Fulfilment",
      },
      ORDER_INFO: "Order Information",
      // Labels the first declined charge attempt under the payment line. Later
      // attempts repeat with a blank label so the block reads as one list.
      PAYMENT_DECLINED: "Payment Declined",
      // Review layout (Flow 14) — mirrors the intent review drawer so the two
      // screens read as the same product. Worded for a placed order: the
      // intents drawer says "Created Intent on", this one says "Order Date".
      COPY_REF: "Copy order number",
      SUMMARY: {
        TOTAL: "Order Total",
        ITEMS: "Items",
        ORDER_DATE: "Order Date",
        PORT: "Port",
        ARRIVAL: "Ship Arrival",
      },
      CUSTOMER_INFO: "Customer Information",
      VESSEL_SHIPPING: "Vessel & Shipping",
      ORDER_SUMMARY: "Order Summary",
      NOTES: "Notes",
      NO_NOTES: "No notes.",
      NO_EMAIL: "No email on file",
      NO_PHONE: "No phone on file",
      VESSEL: "Vessel",
      IMO: "IMO Number",
      PORT: "Port",
      ANCHORAGE: "Anchorage / Terminal",
      ARRIVAL: "Arrival Date",
      EXPECTED_DEPARTURE: "Expected Departure",
      ORDER_DATE: "Order Date",
      EXPRESS: "Express",
      EMERGENCY: "Emergency",
      SAILOR: "Sailor",
      SOURCE: "Order Source",
      INTENT_REF: "Intent Ref",
      SHIP_IMO: "Ship / IMO",
      TERMINAL: "Terminal",
      ANCHORAGE_CHANGE: "Anchorage Change",
      PARTNER: "Delivery Partner",
      PAYMENT: "Payment",
      COUPON: "Coupon",
      COUPON_NONE: "None",
      ITEMS: "Items",
      NO_ITEMS: "No items",
      // Same column set as the intents review table, minus Availability —
      // that is a pre-payment verification signal and is settled by the time an
      // order reaches this drawer.
      ITEM_COLUMNS: {
        ITEM: "Item",
        QTY: "Qty",
        UNIT: "Unit Price",
        SUBTOTAL: "Subtotal",
      },
      ORDER_TOTAL: "Order Total",
      // Written out so a multi-quantity row can't be misread — the figure beside
      // the quantity is the unit price, not the line total.
      LINE_MATH: (qty: number, unitPrice: string) => `${qty} × ${unitPrice} each`,
      PRICING: "Price Breakdown",
      SUBTOTAL: "Subtotal",
      SHIPPING_FEE: "Shipping Fee",
      TAX: "Tax",
      PLATFORM_FEE: "Platform Fee",
      DISCOUNT: "Coupon Discount",
      LOYALTY: "Loyalty Discount",
      LOYALTY_WITH_POINTS: (pts: number) => `Loyalty Discount (${pts} pts)`,
      COUPON_APPLIED: (code: string) => `Coupon applied: ${code}`,
    },
    EMPTY: "No orders found",
    EMPTY_FILTERED: "No orders match the current filters.",
    FETCH_ERROR: "Failed to load orders. Please try again.",
    // Status dropdown filter. Only `ALL` is a literal — the rest of the options
    // are the canonical post-payment labels from `lib/orderStatuses.ts`.
    STATUS_FILTER: {
      ALL: "All Status",
    },
    // KPI cards. The stats endpoint's field names aren't pinned by an example
    // in the API collection, so each card reads a list of candidate keys.
    STATS: {
      // Lifecycle buckets — mutually exclusive, and they reconcile:
      // confirmed + in_transit + delivered + failed + cancelled + refunded == total
      // (less the sub-second `payment_received` transient, which belongs to no bucket).
      /** The population, rendered as the page heading rather than a card. */
      TOTAL: "Total Orders",
      TOTAL_SUMMARY: (n: number) => `${n.toLocaleString()} ${n === 1 ? "order" : "orders"}`,
      CONFIRMED: "Confirmed",
      IN_TRANSIT: "In Transit",
      DELIVERED: "Delivered",
      FAILED: "Delivery Failed",
      CANCELLED: "Cancelled",
      REFUNDED: "Refunded",
      // Dimensions, NOT buckets: these cross-cut every status above and an order
      // may be both, so they are shown apart and must never be added to the total.
    },
    /**
     * Order-type filter. These are queries, not a partition — `is_express` and
     * `is_emergency` are independent, an order may be both, and the counts
     * therefore do not sum to the total. "Regular" is the complement of both.
     */
    TYPE_FILTER: {
      LABEL: "Order Type",
      ALL: "All",
      EXPRESS: "Express",
      EMERGENCY: "Marine Emergency",
      REGULAR: "Regular",
      /**
       * Not a filter option — there is no `?is_fastest_delivery=` on any list.
       * It sits here beside the other two flags because the same badge row
       * renders it, and it is worded as the express screen words it.
       */
      FASTEST: "Fastest",
      /** Count is omitted while the figure is still loading. */
      OPTION: (label: string, count?: number) =>
        count === undefined ? label : `${label} · ${count.toLocaleString()}`,
    },
    ACTION_VIEW: "View",
    // Table
    COLUMNS: {
      ORDER_ID: "Order ID",
      SAILOR: "Sailor",
      ITEMS: "Items",
      TYPE: "Type",
      SHIP_TERMINAL: "Ship / Terminal",
      CHANGED_ANCHORAGE: "Changed Anchorage",
      PARTNER: "Partner",
      PAYMENT: "Payment",
      COUPON: "Coupon",
      TOTAL: "Total",
      STATUS: "Status",
      // The column shows which admin is accountable for the row, so it is
      // named for the relationship rather than for possession.
      OWNER: "Managed By",
      ACTIONS: "Actions",
    },
    ACTIONS: {
      VIEW: "View",
      MESSAGE: "Message",
      CANCEL: "Cancel",
      REASSIGN: "Reassign",
      CANCEL_ORDER: "Cancel Order",
      REFUND: "Refund",
    },
    UNASSIGNED: "Unassigned",
    // Toasts & confirm
    MESSAGE_SENT: (sailor: string) => `Message sent to ${sailor}`,
    CANCEL_CONFIRM_TITLE: "Cancel Order",
    CANCEL_CONFIRM_MSG:
      "This will cancel the order and trigger refund processing. This cannot be undone.",
    CANCEL_CONFIRM_CONFIRM: "Cancel Order",
    // Cancel-order reason popup (Flow 12 §2 — `reason` is required)
    CANCEL_DIALOG: {
      TITLE: "Cancel Order",
      DESCRIPTION: (ref: string) =>
        `Tell the sailor why order ${ref} is being cancelled. This only applies to orders that haven't been paid — a paid order must be refunded instead.`,
      REASON_LABEL: "Reason for cancellation",
      REASON_PLACEHOLDER: "e.g. Sailor unreachable and the vessel has sailed",
      REASON_REQUIRED: "A reason is required — tell the sailor why the order is being cancelled.",
      REASON_HINT: "Stored with the order; shown to the sailor. Keep it under 50 characters.",
      CONFIRM: "Cancel Order",
      CANCELLING: "Cancelling…",
      KEEP: "Keep Order",
    },
    CANCEL_SUCCESS: "Order cancelled",
    CANCEL_ERROR: "Failed to cancel the order. Please try again.",
    ORDER_CANCELLED: (id: string) => `Order ${id} has been cancelled`,
    PARTNER_REASSIGNED: "Partner reassigned successfully",
    // Flow 12 §3–4 — refund a paid order (full, or partial when partially
    // delivered). The quote is a side-effect-free preview of the same policy.
    REFUND_DIALOG: {
      TITLE: "Refund Order",
      DESCRIPTION: (ref: string) => `Return money on order ${ref}.`,
      LOADING_QUOTE: "Checking the refund policy…",
      QUOTE_ERROR: "Could not load the refund preview.",
      POLICY: "Policy",
      ALLOWED: "Refund allowed",
      BLOCKED: "Refund not allowed",
      INITIAL: "Initial payment",
      DELTAS: "Delivery surcharges",
      TOTAL: "Total refund",
      MODE_FULL: "Full refund",
      MODE_PARTIAL: "Partial refund",
      MODE_PARTIAL_HINT: "Only available while the order is partially delivered.",
      AMOUNT_LABEL: "Amount to refund ($)",
      AMOUNT_PLACEHOLDER: "0.00",
      AMOUNT_HINT: "Must be greater than 0 and no more than the remaining refundable amount.",
      AMOUNT_REQUIRED: "Enter the amount to refund.",
      REASON_LABEL: "Reason for refund",
      REASON_PLACEHOLDER: "e.g. Delivery failed — goods never reached the vessel",
      REASON_REQUIRED: "A reason is required — it is recorded and shown to the sailor.",
      OVERRIDE_LABEL: "Override the cancellation window",
      OVERRIDE_HINT: "Forces a refund past the auto-approval window.",
      CONFIRM: "Issue Refund",
      REFUNDING: "Refunding…",
      CANCEL: "Close",
      SUCCESS: (amount: string) => `Refunded $${amount}.`,
      FAILED: "Could not process the refund. Please try again.",
    },
    // Flow 11 — location changes and delivery surcharges (deltas).
    LOCATION: {
      SECTION: "Location Changes",
      NONE: "No location changes reported.",
      KIND_DELTA: "Surcharge",
      KIND_REBILL: "Re-bill",
      REPORTED: (at: string) => `Reported ${at}`,
      MOVED_TO: "Moved to",
      ARRIVAL: "Arrival",
      DEPARTURE: "Departure",
      DISMISS: "Dismiss",
      DISMISSING: "Dismissing…",
      APPLY: "Apply",
      APPLYING: "Applying…",
      RAISE: "Price It",
      DISMISSED: "Report dismissed.",
      APPLIED: "Location applied — re-price the bill with Update Bill.",
      ACTION_FAILED: "Could not update the report. Please try again.",
      DISMISS_REASON_LABEL: "Reason (optional)",
      DISMISS_REASON_PLACEHOLDER: "e.g. Duplicate report — same anchorage",
    },
    DELTA: {
      SECTION: "Delivery Surcharges",
      NONE: "No surcharges raised.",
      BASELINE: "Baseline shipping",
      SURCHARGE: "Surcharge",
      NEW_SHIPPING: "New shipping",
      PAYABLE: "Payable",
      DUE: "Due",
      HOLD_NOTICE: "An unpaid surcharge is holding final delivery.",
      WITHDRAW: "Withdraw",
      WITHDRAWING: "Withdrawing…",
      WITHDRAWN: "Surcharge withdrawn — the delivery hold is lifted.",
      WITHDRAW_FAILED: "Could not withdraw the surcharge. Please try again.",
      // Raise-delta popup (Flow 11 §3)
      RAISE_TITLE: "Price the Location Change",
      RAISE_DESCRIPTION: (ref: string) =>
        `Set the delivery surcharge for order ${ref}. The order is relocated immediately; payment settles the cost, not the location.`,
      AMOUNT_LABEL: "Surcharge amount ($)",
      AMOUNT_PLACEHOLDER: "0.00",
      AMOUNT_HINT: "The extra charge, not a new shipping total. Must be greater than 0.",
      AMOUNT_REQUIRED: "Enter a surcharge greater than 0.",
      NOTE_LABEL: "Note to the sailor",
      NOTE_PLACEHOLDER: "e.g. Ship moved to a farther anchorage",
      NOTE_REQUIRED: "A note is required — the sailor sees it alongside the charge.",
      RAISE_CONFIRM: "Raise Surcharge",
      RAISING: "Raising…",
      RAISED: (amount: string) => `Surcharge of $${amount} raised — the sailor has been notified.`,
      RAISE_FAILED: "Could not raise the surcharge. Please try again.",
      CANCEL: "Cancel",
    },
    // Flow 28 · APIs 11–12 — assign (or reassign) a delivery partner to a paid
    // order. Assignment moves the order to `partner_assigned`.
    ASSIGN_PARTNER: {
      /** Filter box inside the partner picker — shared with the intents review. */
      PARTNER_SEARCH: "Search partners…",
      SECTION: "Delivery Partner",
      NONE: "No delivery partner assigned",
      // The partner's own account of a failed delivery, shown beside them.
      FAILURE_REASON: "Delivery Failed",
      // Wording comes from the backend's requirement flags, not from whether an
      // assignment exists: a finished verification leaves an active assignment
      // behind, and calling the first delivery assignment a "reassignment"
      // is what made that look like the order already had a deliverer.
      ASSIGN_DELIVERY: "Assign Delivery Partner",
      ASSIGN_VERIFICATION: "Assign Verification Partner",
      NEEDS_DELIVERY: "This order is waiting for a delivery partner (can_deliver).",
      NEEDS_VERIFIER: "This order is waiting for a verification partner (can_verify).",
      NO_REQUIREMENT: "No partner is outstanding on this order.",
      REQUIREMENT_UNKNOWN:
        "This response did not include needs_verifier_partner / needs_delivery_partner, so the outstanding requirement is unknown. It is not inferred from the status or from partner_allocated — report this to the backend.",
      PICK_PLACEHOLDER: "Select a delivery partner…",
      PICK_LOADING: "Loading partners…",
      PICK_EMPTY: "No delivery partners available",
      ASSIGN: "Assign",
      ASSIGNING: "Assigning…",
      REASSIGN: "Reassign",
      REASSIGNING: "Reassigning…",
      MANAGE_ORDER: "Manage Order",
      CLAIMING: "Claiming…",
      CLAIM_SUCCESS: "Order claimed — you can now assign a delivery partner",
      SELECT_FIRST: "Select a delivery partner first.",
      ASSIGNED: (partner: string) => `${partner} assigned — the order is now with the partner.`,
      REASSIGNED: (partner: string) => `Order reassigned to ${partner}.`,
      SAME_PARTNER: "That partner already holds this order.",
      FAILED: "Could not assign the partner. Please try again.",
      // 409 requires_confirmation — the order is held by a different partner.
      CONFIRM_REASSIGN:
        "This order is already assigned to another partner. Click Reassign again to confirm.",
      /**
       * 403 — the capability guard on `DeliveryAssignment` itself (Flow 28 GL1).
       * The partner is not qualified for the kind of work this order needs, so
       * the fix is a different partner, not a retry.
       */
      WRONG_CAPABILITY:
        "That partner is not qualified for the work this order needs. Pick a partner with the right capability.",
      // Gate / disabled hints
      CLAIM_FIRST: "Claim this order (Manage Order) before assigning a partner.",
      OTHER_ADMIN: "This order is managed by another admin.",
      CLOSED: "This order is closed — a delivery partner can no longer be assigned.",
      UNPAID: "A delivery partner can only be assigned once the order is paid.",
    },
    // Flow 02 · API 17 — bind/clear a ship agent on an order.
    SHIP_AGENT: {
      SECTION: "Ship Agent",
      NONE: "No agent assigned",
      PICK_PLACEHOLDER: "Select a ship agent…",
      ASSIGN: "Assign",
      UPDATE: "Update Agent",
      CLEAR: "Clear",
      LOADING: "Saving…",
      ASSIGNED: "Ship agent updated",
      CLEARED: "Ship agent cleared",
      MANAGE_ORDER: "Manage Order",
      CLAIMING: "Claiming…",
      CLAIM_SUCCESS: "Order claimed — you can now assign a ship agent",
      // Gate / disabled hints
      CLAIM_FIRST: "Claim this order (Manage Order) before changing its ship agent.",
      CLOSED: "This order is closed — its ship agent can no longer be changed.",
      OTHER_ADMIN: "This order is managed by another admin.",
    },
  },
  INTENTS: {
    // Page chrome
    TITLE: "Intent Requests",
    SUBTITLE: "Sailor order intents pending review & confirmation",
    SEARCH_PLACEHOLDER: "Search intents…",
    ALL_STATUS: "All Status",
    EMPTY: "No intents match the current filters.",
    EMPTY_ITEMS: "No items listed for this intent.",
    FETCH_ERROR: "Failed to load intents.",
    ITEM_IMAGE_ALT: "Item",
    ACTION_REVIEW: "Review",
    // Status legend (info popup explaining every lifecycle status)
    STATUS_LEGEND: {
      SITUATIONS_TITLE: "Situations",
      SITUATIONS_DESCRIPTION:
        "Not statuses of their own — each is one half of a status above, split by who owes the next move. The badge on a row shows the situation's label rather than the status's.",
      SPLIT_OF: (status: string) => `Half of ${status}`,
      OPEN_LABEL: "What do these statuses mean?",
      TITLE: "Order Status Guide",
      DESCRIPTION: "The 18 order lifecycle statuses, in order, and what each means.",
      ACTOR: "Acts next",
      CLOSE: "Got it",
    },
    // Descriptive filter views (not real statuses) accepted by the intents endpoint.
    STATUS_VIEW: {
      READY_TO_BILL: "Ready to Bill",
      AWAITING_CUSTOMER: "Awaiting Customer",
    },
    // Status filter options (values map 1:1 to the API `status` query param)
    STATUS_FILTER: {
      INTENT_RECEIVED: "Intent Received",
      SOURCING: "Sourcing",
      VERIFICATION_SUBMITTED: "Verification Submitted",
      PARTNER_VERIFYING: "Partner Verifying",
      PAYMENT_PENDING: "Payment Pending",
      PENDING_CUSTOMER_RESPONSE: "Pending Customer Response",
      PENDING_INTENT: "Pending Intent",
      INTENT_REJECTED: "Intent Rejected",
    },
    // KPI card labels. Contextual by design — the card says "Total Intents"
    // while the property behind it stays `total`, the name the API uses.
    STATS: {
      // The buckets are NOT assumed to add up to `total`: the endpoint's own
      // contract says several of them (cancelled, confirmed_today) describe a
      // different part of the lifecycle. Nothing here is derived by summing.
      /** The population, rendered as the page heading rather than a card. */
      TOTAL: "Total Intents",
      OPEN_SUMMARY: (n: number) => `${n.toLocaleString()} open ${n === 1 ? "intent" : "intents"}`,
      /** Parent bucket; `awaiting_customer` + `ready_to_bill` are inside it. */
      SUBSTITUTIONS: "Substitutions",
      NEW: "New Intents",
      SOURCING: "In Sourcing",
      VERIFICATION: "In Verification",
      // `substitution_needed` counts the whole `pending_customer_response`
      // bucket, of which these two are the halves — released-and-waiting versus
      // customer-confirmed. The parent card is not shown: it was labelled
      // "Substitutions Needed", which is not what it counted, and it could never
      // agree with the per-row substitution flag (that fires a stage earlier, at
      // `verification_submitted`).
      AWAITING_CUSTOMER: "Awaiting Customer",
      READY_TO_BILL: "Ready to Bill",
      AWAITING_PAYMENT: "Awaiting Payment",
      // Outside the funnel total: `rejected` is a terminal off-ramp, and
      // `confirmed_today` is a time-scoped count of orders that have left it.
      CONFIRMED_TODAY: "Confirmed Today",
      REJECTED: "Rejected",
      /**
       * Qualified deliberately. "Cancelled" means different things on the two
       * screens and both are correct: here it is the derived filter for UNPAID
       * cancellations, while the orders screen's is the raw `cancelled` status
       * over a paid-only population. The counts differ by two orders of
       * magnitude (67 vs 1), so someone comparing the screens will notice —
       * better that the label answers the question than invites it.
       */
      CANCELLED: "Cancelled (Unpaid)",
    },
    /**
     * Order-type filter — same control and semantics as the orders screen.
     * Counts come from `type_counts`, computed over the open funnel without the
     * type filter, and are consumed exactly as sent: `all` is read, never
     * derived from `emergency + regular`.
     */
    TYPE_FILTER: {
      LABEL: "Order Type",
      ALL: "All",
      EXPRESS: "Express",
      EMERGENCY: "Marine Emergency",
      REGULAR: "Regular",
      OPTION: (label: string, count?: number) =>
        count === undefined ? label : `${label} · ${count.toLocaleString()}`,
    },
    /**
     * The delivery-move sub-flow (`location_change`), stated in the terms the
     * admin acts in rather than the API's state names.
     *
     * Only `report_pending` asks anything of this desk — price the move or
     * dismiss it. The `delta_*` states need a completed initial payment, so
     * they belong to the orders screen and appear here only in the window
     * between a bill being paid and the row leaving; they are worded as status,
     * not as a prompt.
     */
    LOCATION_CHANGE: {
      REPORT_PENDING: "Location change · needs review",
      REPORT_DISMISSED: "Location change dismissed",
      DELTA_PENDING: (amount: string) => `Location surcharge ${amount} · unpaid`,
      DELTA_INITIATED: (amount: string) => `Location surcharge ${amount} · paying`,
      /** Used when the API sends a `delta_*` state without its amount. */
      DELTA_NO_AMOUNT: "Location surcharge raised",
    },
    // Table columns
    COLUMNS: {
      SAILOR: "Sailor",
      ITEMS: "Items Requested",
      TYPE: "Type",
      SHIP: "Ship",
      ARRIVAL: "Arrival",
      DEPARTURE: "Departure",
      SUBMITTED: "Submitted",
      STATUS: "Status",
      // The column shows which admin is accountable for the row, so it is
      // named for the relationship rather than for possession.
      OWNER: "Managed By",
      ACTIONS: "Actions",
    },
    // Order ownership (Flow 27) — claiming is the precondition for any write
    OWNERSHIP: {
      UNASSIGNED: "Unassigned",
      MANAGE: "Manage Order",
      CLAIMING: "Claiming…",
      MANAGED_BY: (name: string) => `Managed by ${name}`,
      YOU: "You",
      CLAIMED: (ref: string) => `You are now managing ${ref}`,
      CLAIM_FAILED: "Could not claim this order. Please try again.",
      // 409 — the response names the current owner so we can too
      HELD_BY: (name: string) => `Already being handled by ${name}`,
      HELD_BY_UNKNOWN: "This order is already being handled by another admin.",
      // Why the footer actions are disabled
      CLAIM_FIRST: "Claim this order before responding to the intent.",
      OWNED_BY_OTHER: (name: string) => `${name} owns this order — ask them to hand it over.`,
      SUPER_ADMIN_OVERRIDE: "Admin — you can act on this order without claiming it.",
      /**
       * Handover — reassign to another admin, or release back to the pool.
       *
       * Both were unbuildable until the API grew `assignable-admins/` and
       * `release/`: reassign had no way to source an `admin_id`, and there was
       * no release endpoint at all, so an order claimed by mistake could only
       * be pushed onto a colleague.
       */
      HANDOVER: {
        TITLE: "Hand Over Order",
        SUBTITLE: (ref: string) => `Change who is accountable for ${ref}.`,
        REASSIGN_SECTION: "Reassign to another admin",
        REASSIGN_HINT:
          "The new owner can perform every gated write on this order. You lose that access unless you are an admin.",
        PICKER_LABEL: "New Owner",
        PICKER_PLACEHOLDER: "Select an admin…",
        SEARCH_PLACEHOLDER: "Search admins by name or email…",
        NO_ADMINS: "No active admins match that search.",
        LOADING_ADMINS: "Loading admins…",
        REASSIGN: "Reassign",
        REASSIGNING: "Reassigning…",
        REASSIGNED: (name: string) => `Order reassigned to ${name}.`,
        REASSIGN_FAILED: "Could not reassign this order.",
        /**
         * The unassigned wording. Same dialog, same endpoint — but with no
         * current owner the action is not a *hand over*, and calling it one
         * asks the reader to picture a transfer from nobody.
         */
        /** Tooltip on the Unassigned chip in the table. */
        ASSIGN_TITLE: "Assign this order to an operator",
        ASSIGN_DIALOG_TITLE: "Assign Order",
        ASSIGN_SUBTITLE: (ref: string) => `Choose who is accountable for ${ref}.`,
        ASSIGN_SECTION: "Assign to an operator",
        ASSIGN_HINT:
          "Nobody is accountable for this order yet. Whoever you pick becomes its owner and can perform every gated write on it.",
        ASSIGN_PICKER_LABEL: "Managed By",
        ASSIGN: "Assign",
        ASSIGNING: "Assigning…",
        ASSIGNED: (name: string) => `Order assigned to ${name}.`,
        ASSIGN_FAILED: "Could not assign this order.",
        RELEASE_SECTION: "Release to the unassigned pool",
        RELEASE_HINT:
          "The undo for picking up an order by mistake. Nobody is accountable until another admin claims it.",
        RELEASE: "Release Order",
        RELEASING: "Releasing…",
        RELEASED: "Order released. It is unassigned, and its chat is with the admins.",
        /**
         * The picker clamps at the paginator's own ceiling of 50 and DRF clamps
         * silently above it, so a larger roster would truncate with no sign.
         * `count` reports the true total, which is what makes the gap visible
         * without a second request.
         */
        PICKER_TRUNCATED: (shown: number, total: number) =>
          `Showing ${shown} of ${total} admins — search to narrow the list.`,
        RELEASE_FAILED: "Could not release this order.",
        CONFIRM_RELEASE_TITLE: "Release this order?",
        /**
         * Names the chat consequence, which is the part that surprises people.
         *
         * Releasing does not merely drop accountability — order-chat access
         * derives from `assigned_admin` live, so an unassigned order's thread is
         * visible to **admins only**. The releaser loses sight of it too, and a
         * sailor writing in notifies every active admin. That makes release an
         * escalation rather than a tidy-up, and it is worth saying before the
         * click rather than discovering it from a thread that vanished.
         */
        CONFIRM_RELEASE_MESSAGE:
          "It returns to the unassigned pool and nobody is accountable for it until an admin claims it — any admin can, including you. Its order chat goes with it: while unassigned, only admins can see the thread, so you will stop seeing it too.",
        // Reassign is the owner-or-super-admin rule, which is narrower than the
        // write gate — say which one is missing rather than "not allowed".
        NOT_OWNER: "Only the current owner or an admin can hand this order over.",
        /**
         * Only an Operator reaches this — an Admin may assign any order, so for
         * them the picker renders instead. Reassign needs a current owner to
         * match the caller against, and an unassigned order has none.
         */
        UNASSIGNED_NOTICE:
          "This order is unassigned, so there is no owner to hand it over from. Claim it to take it on yourself.",
      },
    },
    // Review modal
    REVIEW: {
      TITLE: "Review Intent Request",
      REJECT: "Reject",
      /** Only offered where a report exists to dispute and a partner to re-ask. */
      REVERIFY: "Re-verify",
      /**
       * The terminal action once substitutions are released — reject is refused
       * from there and the API names cancel in its own error. Never shown
       * beside Reject; the two split the funnel between them.
       */
      CANCEL_ORDER: "Cancel Order",
      // Primary action: hand the (claimed) order to a delivery partner (Flow 28).
      ASSIGN: "Assign",
      // Primary action once everything is verified available (Flow 7 create-bill:
      // sets fees, notifies the sailor to pay in-app — no Stripe link).
      BILL: "Create Bill",
      SAILOR: "Sailor",
      IMO: "IMO Number",
      TERMINAL: "Terminal",
      ARRIVAL: "Arrival Date",
      REQUESTED_ITEMS: "Requested Items",
      // This drawer is the sourcing/verification surface, so the partner it
      // assigns is a `can_verify` one. Both labels used to say "Delivery
      // Partner", which is the wrong capability for every action on this screen.
      ASSIGN_VERIFICATION_SECTION: "Assign Verification Partner",
      ASSIGN_VERIFICATION: "Assign Verification Partner",
      REASSIGN_SECTION: "Reassign Verification Partner",
      REASSIGN: "Reassign",
      REASSIGNING: "Reassigning…",
      REASSIGN_HINT: "A partner is verifying — reassign to a different partner if needed.",
      QTY: (q: number) => `Qty: ${q}`,
      AVAILABLE: "Available",
      /** Nobody has verified this line yet — distinct from "unavailable". */
      UNVERIFIED: "Unverified",
      /** `requested_qty - available_qty` from the verification, not the item's
       *  current quantity. */
      SHORT_BY: (n: number) => `Short by ${n}`,
      UNAVAILABLE: "Unavailable",
      CHECKING: "Checking…",
      PARTNER_LABEL: "Assign to Partner",
      PARTNER_PLACEHOLDER: "Select a delivery partner…",
      PARTNER_LOADING: "Loading partners…",
      PARTNER_EMPTY: "No delivery partners available",
      DELIVER_BY: "Deliver by (optional)",
      DELIVER_BY_HINT: "Leave blank to let the system compute the SLA date.",
      ASSIGNING: "Assigning…",
      // Drawer detail sections (order detail API)
      LOADING: "Loading order details…",
      ERROR: "Could not load order details.",
      RETRY: "Retry",
      // Section headings
      ORDER_SUMMARY: "Order Summary",
      CUSTOMER_INFO: "Customer Information",
      VESSEL_SHIPPING: "Vessel & Shipping",
      PRICING: "Pricing Breakdown",
      // Pre-bill substitute for the breakdown. The backend's subtotal/tax/
      // discount/total are a real 0 until Create Bill runs, so showing them
      // as facts contradicts the priced line items directly above.
      ESTIMATED_TOTAL: "Estimated Total",
      ESTIMATED_HINT:
        "Indicative value of the available items. Shipping, tax and discounts are set when you create the bill.",
      PAYMENT_INFO: "Payment Information",
      DELIVERY_PARTNER: "Delivery Partner",
      NOTES_SECTION: "Notes",
      // Field labels
      EMAIL: "Email",
      PHONE: "Phone",
      VESSEL: "Vessel",
      PORT: "Port",
      ANCHORAGE: "Anchorage / Terminal",
      EXPECTED_DEPARTURE: "Expected Departure",
      ORDER_DATE: "Order Date",
      SUBTOTAL: "Subtotal",
      SHIPPING_FEE: "Shipping Fee",
      TAX: "Tax",
      DISCOUNT: "Discount",
      TOTAL: "Total",
      PAYMENT_STATUS: "Payment Status",
      PAYMENT_METHOD: "Payment Method",
      COUPON: "Coupon Applied",
      PARTNER_NAME: "Partner",
      PARTNER_STATUS_LABEL: "Status",
      EXPRESS: "Express",
      EMERGENCY: "Emergency",
      NO_ITEMS: "No items in this order.",
      NO_PARTNER: "Not yet assigned",
      NO_NOTES: "No notes.",
      UNIT_PRICE: (p: string) => `@ ${p}`,
      ITEM_SUBTOTAL: (s: string) => s,
      SKU: (sku: string) => `SKU: ${sku}`,
      // ── Drawer information architecture (summary strip + tabs) ──────────
      TABS: {
        OVERVIEW: "Overview",
        ITEMS: (n: number) => (n > 0 ? `Items & Pricing · ${n}` : "Items & Pricing"),
        FULFILMENT: "Fulfilment",
      },
      // Summary strip — the at-a-glance facts above the tabs
      SUMMARY: {
        TOTAL: "Order Total",
        // Shown instead of "$0.00" before a bill exists — see UNBILLED_STATUSES.
        NOT_PRICED: "Not priced yet",
        ITEMS: "Items",
        SUBMITTED: "Created Intent on",
        PORT: "Port",
        ARRIVAL: "Ship Arrival",
      },
      // Lifecycle rail — grouped stages of the pre-delivery journey
      STAGES: {
        RECEIVED: "Received",
        SOURCING: "Sourcing",
        VERIFYING: "Verifying",
        REVIEWED: "Reviewed",
        BILLING: "Billing",
        CONFIRMED: "Confirmed",
      },
      STAGE_OF: (current: number, total: number) => `Stage ${current} of ${total}`,
      TERMINAL_NOTICE: (label: string) => `${label} — this order is closed.`,
      // Colour key for the progress rail — the segment colours carry meaning, so
      // they are explained rather than left to be inferred.
      RAIL_LEGEND: {
        OPEN_LABEL: "What do these colours mean?",
        TITLE: "Timeline colours",
        DONE: "Completed",
        DONE_HINT: "This step has already happened.",
        ACTIVE: "In progress",
        ACTIVE_HINT: "Where the order sits right now.",
        PENDING: "Not started",
        PENDING_HINT: "Still ahead of this order.",
        CLOSED: "Closed",
        CLOSED_HINT: "Rejected, cancelled or refunded — the bar is replaced by a red notice.",
      },
      // Next-step / blocked callout above the tabs
      NEXT_STEP: "Next step",
      BLOCKED: "Action blocked",
      // Items table columns
      ITEM_COLUMNS: {
        ITEM: "Item",
        QTY: "Qty",
        UNIT: "Unit Price",
        SUBTOTAL: "Subtotal",
        AVAILABILITY: "Availability",
      },
      NO_EMAIL: "No email on file",
      NO_PHONE: "No phone on file",
      NO_VERIFICATION: "No verification report yet — nothing to substitute.",
      // Flow 28 API 16 — live milestone ladder
      TIMELINE_SECTION: "Order Timeline",
      TIMELINE_LOADING: "Loading timeline…",
      TIMELINE_EMPTY: "No milestones recorded yet.",
      // Flow 07 API 2 — re-price a bill that is already pending
      UPDATE_BILL: "Update Bill",
      COPY_REF: "Copy order number",
      COPIED: "Order number copied",
    },
    // Reject-intent popup (Flow 05 API 6 — reason is required)
    REJECT_DIALOG: {
      TITLE: "Reject Intent",
      DESCRIPTION: (ref: string) =>
        `Tell the sailor why order ${ref} can't be fulfilled. This is terminal and cannot be undone.`,
      REASON_LABEL: "Reason for rejection",
      REASON_PLACEHOLDER: "e.g. Nothing sourceable at this port",
      REASON_REQUIRED: "A reason is required — tell the sailor why their order can't be fulfilled.",
      CONFIRM: "Reject Intent",
      REJECTING: "Rejecting…",
      CANCEL: "Cancel",
    },
    /**
     * Send-back-for-re-verification popup (§4.3b). `reason` is required and
     * reaches the partner, so it is worded as an instruction to them rather
     * than as an explanation to the sailor.
     */
    REVERIFY_DIALOG: {
      TITLE: "Send Back for Re-verification",
      DESCRIPTION: (ref: string) =>
        `Ask the partner to check order ${ref} again. Their new report replaces the current one.`,
      REASON_LABEL: "What should they re-check?",
      REASON_PLACEHOLDER: "e.g. Supplier restocked — please re-check the deck brushes",
      REASON_REQUIRED: "A reason is required — tell the partner what to re-check.",
      CONFIRM: "Send Back",
      SENDING: "Sending…",
      CANCEL: "Cancel",
      SUCCESS: (partner: string) =>
        partner ? `Sent back to ${partner} for re-verification.` : "Sent back for re-verification.",
      FAILED: "Could not send this back for re-verification. Please try again.",
    },
    // Derived "what to do next" hints (deriveIntentAction)
    ACTION: {
      assign: "Assign a partner to verify stock",
      waiting_partner: "Partner is verifying stock",
      suggest: "Suggest replacements for unavailable items",
      bill: "All items available — ready to bill",
      waiting_customer: "Waiting on the sailor's response",
      awaiting_payment: "Payment link sent — awaiting payment",
      rejected: "Intent rejected",
      claim: "Claim this order to act on it",
      none: "",
    },
    // Stock verification & substitution (Flow 06)
    SUBSTITUTION: {
      SECTION: "Stock Verification",
      VERIFIED_BY: (name: string) => `Verified by ${name}`,
      NO_REPORT: "No verification report yet.",
      LINE_AVAILABLE: "Available",
      LINE_SHORT: "Short",
      LINE_UNAVAILABLE: "Unavailable",
      REQUESTED: (q: number) => `Requested ${q}`,
      AVAILABLE_QTY: (q: number) => `Available ${q}`,
      SUGGEST: "Suggest replacement",
      MODE_EXISTING: "Existing product",
      MODE_NEW: "New product",
      SEARCH_PRODUCTS: "Search products at this port…",
      PICK_VARIANT: "Select a replacement variant…",
      QTY: "Quantity",
      NOTE: "Note (optional)",
      NOTE_PLACEHOLDER: "Why this replacement…",
      // New-product fields (API 12)
      NP_NAME: "Product name",
      NP_SKU: "SKU",
      NP_PRICE: "Unit price ($)",
      NP_CATEGORY: "Category",
      NP_CATEGORY_PLACEHOLDER: "Select a category…",
      NP_CATEGORY_LOADING: "Loading categories…",
      NP_REQUIRED: "Name, SKU, price and category are required.",
      NP_DESCRIPTION: "Description (optional)",
      NP_DESCRIPTION_PLACEHOLDER: "What this product is…",
      NP_IMAGES: "Image paths (optional)",
      NP_IMAGES_PLACEHOLDER: "variant_images/example.jpeg",
      NP_IMAGES_ADD: "Add image path",
      NP_IMAGES_EMPTY: "No images yet.",
      NP_ATTRIBUTES: "Attributes (optional JSON)",
      NP_ATTRIBUTES_PLACEHOLDER: '{ "color": "red", "size": "M" }',
      NP_ATTRIBUTES_HINT: "A JSON object. Leave blank to omit.",
      NP_ATTRIBUTES_INVALID: "Attributes must be a valid JSON object.",
      STAGE: "Stage suggestion",
      STAGING: "Staging…",
      STAGED_TITLE: "Suggestions",
      STAGED_EMPTY: "No suggestions staged yet.",
      /**
       * Two different facts, deliberately worded so they cannot be mistaken for
       * each other. `RELEASED_BADGE` / `STAGED_BADGE` say whether the **admin**
       * has sent the suggestion; `DECISION_*` is what the **sailor** replied.
       * Showing the first where the second belongs is how a rejected
       * replacement came to read "Released" in green.
       */
      RELEASED_BADGE: "Sent to sailor",
      STAGED_BADGE: "Not sent",
      DECISION_PENDING: "Awaiting sailor",
      DECISION_ACCEPTED: "Accepted",
      DECISION_REJECTED: "Rejected",
      /** A catalog pick a partner has not yet confirmed is physically there. */
      NEEDS_PARTNER: "Needs stock check",
      NEEDS_PARTNER_HINT:
        "A partner has to confirm this replacement is actually available before the sailor sees it.",
      BLOCKED_RELEASE: (n: number) =>
        `${n} replacement${n === 1 ? "" : "s"} still need a partner's stock check before this can be released.`,
      /** The partner proposed it and was holding it, so it is confirmed already. */
      FROM_PARTNER: "From partner",
      NO_PORT: "Port couldn't be resolved — can't load replacements. Check the intent data.",
      RELEASE: "Release to sailor",
      RELEASING: "Releasing…",
    },
    // Create-bill popup (Flow 07 API 1 — fees are optional; subtotal is computed)
    BILL_DIALOG: {
      TITLE: "Create Payment Bill",
      DESCRIPTION: (ref: string) =>
        `Set the fees for order ${ref}. The subtotal is computed automatically. The sailor is notified to pay.`,
      SHIPPING_FEE: "Shipping fee ($)",
      TAX_AMOUNT: "Tax amount ($)",
      PLATFORM_FEE: "Platform fee ($)",
      FEE_PLACEHOLDER: "0.00",
      HINT: "Leave a fee blank to send it as 0.",
      CONFIRM: "Create Bill",
      CREATING: "Creating…",
      CANCEL: "Cancel",
      // Flow 07 API 2 — update-bill reuses the same fee form in "update" mode.
      UPDATE_TITLE: "Update Payment Bill",
      UPDATE_DESCRIPTION: (ref: string) =>
        `Re-price the pending bill for order ${ref}. Any open payment link is voided and the sailor is notified again.`,
      UPDATE_CONFIRM: "Update Bill",
      UPDATING: "Updating…",
      UPDATE_HINT: "Leave a fee blank to keep its current value.",
      // Flow 07 API 3 — generate-link runs off the same fee form, so it is
      // offered as a second action rather than a separate dialog.
      LINK_CONFIRM: "Generate Link",
      LINK_GENERATING: "Generating…",
      LINK_HINT:
        "Generating a link also sets these fees and notifies the sailor — you don't need to create the bill first.",
      // Result panel, shown in place of the fee form once a link exists.
      LINK_READY_TITLE: "Payment Link Ready",
      LINK_READY_DESCRIPTION: (ref: string, amount: string) =>
        `Order ${ref} is now awaiting payment of $${amount}. The link has been sent to the sailor by email, WhatsApp and in-app.`,
      LINK_REUSED_NOTE:
        "This reuses the link already open for this amount, so the sailor's existing link still works.",
      LINK_URL_LABEL: "Stripe Checkout URL",
      LINK_EXPIRES: (when: string) => `Expires ${when}`,
      LINK_COPY: "Copy Link",
      LINK_COPIED: "Payment link copied.",
      LINK_OPEN: "Open",
      LINK_DONE: "Done",
    },
    // Toasts
    TOAST: {
      REJECTED: (ref: string) => `Intent ${ref} rejected and sailor notified`,
      REJECT_FAILED: "Could not reject this intent. Please try again.",
      CANCELLED: (ref: string) => `Order ${ref} cancelled`,
      CANCEL_FAILED: "Could not cancel this order. Please try again.",
      ASSIGN_PENDING: "Partner assignment isn't wired up yet.",
      ASSIGN_SELECT_PARTNER: "Select a delivery partner first.",
      ASSIGNED: (ref: string) => `Partner assigned to ${ref} — now verifying stock.`,
      REASSIGNED: (ref: string) => `Order ${ref} reassigned to the new partner.`,
      ASSIGN_FAILED: "Could not assign the partner. Please try again.",
      REASSIGN_CONFIRM:
        "This order is already assigned to another partner. Click Assign again to reassign.",
      STAGED: "Replacement staged.",
      STAGE_FAILED: "Could not stage the suggestion.",
      RELEASED: (n: number) => `Released ${n} suggestion(s) to the sailor.`,
      RELEASE_FAILED: "Could not release suggestions.",
      NO_STAGED: "Stage at least one replacement before releasing.",
      BILLED: (ref: string, amount: string) =>
        `Bill created for ${ref} ($${amount}) — sailor notified to pay.`,
      BILL_FAILED: "Could not create the bill. Please try again.",
      BILL_UPDATED: (ref: string, amount: string) =>
        `Bill for ${ref} updated to $${amount} — sailor notified again.`,
      BILL_UPDATE_FAILED: "Could not update the bill. Please try again.",
      LINK_GENERATED: (ref: string, amount: string) =>
        `Payment link created for ${ref} ($${amount}) — sent to the sailor.`,
      LINK_REUSED: (ref: string) => `Reused the payment link already open for ${ref}.`,
      LINK_FAILED: "Could not generate the payment link. Please try again.",
      // 502 — the request reached us fine; Stripe is what broke. Worth saying so,
      // because retrying is the right move here and not for the other failures.
      LINK_PROVIDER_ERROR: "Stripe couldn't create the link right now. Try again in a moment.",
    },
  },
  SPECIAL_REQUESTS: {
    // Page chrome
    TITLE: "Special Request Items",
    SEARCH_PLACEHOLDER: "Search requests...",
    ALL_STATUS: "All Status",
    EMPTY: "No requests match the current filters.",
    FETCH_ERROR: "Failed to load special requests.",
    // Status filter options — the five values the API's `?status` accepts.
    STATUS_FILTER: {
      PENDING: "Pending",
      SOURCING_CONFIRMED: "Sourcing Confirmed",
      QUOTE_SENT: "Quote Sent",
      ACCEPTED: "Accepted",
      REJECTED: "Rejected",
    },
    // KPI cards — one per field on the special-request stats response.
    STATS: {
      TOTAL: "Total Requests",
      PENDING: "Pending",
      SOURCING_CONFIRMED: "Sourcing Confirmed",
      QUOTE_SENT: "Quote Sent",
      ACCEPTED: "Accepted",
      REJECTED: "Rejected",
      /**
       * A slice of Sourcing Confirmed, not a bucket of its own — rendered as a
       * sub-line inside that card because adding it as a peer would count the
       * same requests twice.
       */
      AWAITING_REBILL: "Awaiting re-quote",
    },
    /** Row chip for the same state the AWAITING_REBILL card counts. */
    AWAITING_REBILL_ROW: "Awaiting re-quote",
    // Table columns
    COLUMNS: {
      // The `SR…` reference, not an order number — an order exists only after
      // the sailor pays, and its `AM…` number lives on the detail.
      REFERENCE: "Reference",
      SAILOR: "Sailor",
      PHONE: "Phone",
      PRODUCT: "Product",
      BRAND: "Brand",
      QTY: "Qty",
      /** Vessel over port · anchorage, from the row's `shipping_address`. */
      DELIVERY: "Delivery",
      ARRIVAL: "Arrival",
      REQUESTED: "Requested",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    // Row action labels (also used as the button tooltips)
    ACTIONS: {
      VIEW: "View",
    },
    // Flow 29c §6 — the .xlsx export. Honours the active status filter, so the
    // button says which rows it will contain rather than implying "everything".
    EXPORT: {
      LABEL: "Export",
      EXPORTING: "Exporting…",
      TITLE_ALL: "Download every special request as .xlsx",
      TITLE_FILTERED: (status: string) => `Download the ${status} requests as .xlsx`,
      FILENAME: "special_requests.xlsx",
      SUCCESS: "Export downloaded.",
      ERROR: "Couldn't generate the export.",
    },
    // Review drawer — key/value layout shared with the Orders drawer.
    DETAIL: {
      TITLE: (ref: string) => `Special Request ${ref}`,
      TITLE_FALLBACK: "Special Request",
      LOADING: "Loading data...",
      FETCH_ERROR: "Failed to load request details.",
      EMPTY: "No details available for this request.",
      RETRY: "Retry",
      FALLBACK: "—",
      // Secondary header badge, shown only when the sailor opted in.
      FASTEST_BADGE: "Fastest Delivery",
      // Body tabs. Status, lifecycle rail and the rebill alert stay above them
      // so the request's state is visible whichever tab is open.
      TABS: {
        OVERVIEW: "Overview",
        DELIVERY: "Delivery",
        QUOTE: "Quote",
        IMAGES: (count: number) => (count > 0 ? `Images (${count})` : "Images"),
      },
      // Request Information
      REQUEST_INFO: "Request Information",
      REFERENCE: "Reference",
      SAILOR: "Sailor",
      EMAIL: "Email",
      REQUESTED: "Requested",
      UPDATED: "Last Updated",
      // Item Details
      ITEM_DETAILS: "Item Details",
      PRODUCT_NAME: "Product Name",
      BRAND: "Brand",
      QUANTITY: "Quantity",
      MAX_BUDGET: "Max Budget",
      /** Flag on the budget row when the quote exceeds what the sailor stated. */
      OVER_BUDGET: "over budget",
      CATEGORY: "Category",
      /** The sailor's own words — no admin action writes either of these. */
      DESCRIPTION: "Sailor's Description",
      NOTES: "Sailor's Notes",
      CUSTOMER_NOTE: "Customer Note",
      PLATFORM: "Submitted From",
      // Delivery
      DELIVERY: "Delivery",
      DESTINATION: "Destination",
      ADDRESS_LABEL: "Delivery Address",
      PORT: "Port",
      ANCHORAGE: "Anchorage",
      SCHEDULE: "Schedule",
      /** Parts of the address block, joined only when the sailor supplied them. */
      ADDRESS: {
        DECK: (v: string) => `Deck ${v}`,
        CABIN: (v: string) => `Cabin ${v}`,
        SECTION: (v: string) => `Section ${v}`,
        IMO: (v: string) => `IMO ${v}`,
      },
      /**
       * The staged delivery change, shown against the current values. The
       * snapshot is not applied until generate-bill folds it in, so the rows
       * above still hold what the request says today.
       */
      PENDING_CHANGES: "Requested Changes — Awaiting Re-quote",
      ANCHORAGE_CLEARED:
        "The new port comes without an anchorage, so the current one is cleared when this is quoted.",
      SHIP_ARRIVAL: "Ship Arrival",
      EXPECTED_DEPARTURE: "Expected Departure",
      FASTEST_DELIVERY: "Fastest Delivery",
      // Quote
      QUOTE: "Quote",
      QUOTED_PRICE: "Quoted Price",
      FAST_DELIVERY_CHARGE: "Fast Delivery Charge",
      /** The admin's description of what they sourced — empty before a quote. */
      QUOTE_DESCRIPTION: "Sourced",
      ADMIN_RESPONSE: "Admin Response",
      /** The order this became; only exists once the sailor has paid. */
      ORDER: "Order",
      REBILL: "Delivery Changes",
      // `(requested|not requested) · used / cap`
      REBILL_SUMMARY: (requested: string, used: number, cap: number) =>
        `${requested} · ${used} / ${cap} used`,
      REBILL_REQUESTED: "Requested",
      REBILL_NOT_REQUESTED: "Not requested",
      NOT_QUOTED: "Not quoted yet",
      // Quoted total = quoted price × qty (+ fast-delivery charge when fastest).
      QUOTED_TOTAL: "Quoted Total",
      // Images — kept apart by uploader, so a reference photo attached to a
      // quote never reads as something the sailor sent.
      IMAGES: "Reference Images",
      IMAGES_BY_CUSTOMER: "Sailor's Images",
      IMAGES_BY_ADMIN: "Admin's Images",
      NO_IMAGE: "No image provided",
      IMAGE_ALT: (product: string, index: number) => `${product} image ${index}`,
      /**
       * Some stored paths point outside the media directory, and one is a raw
       * `file:///Users/…` simulator path — there is no prefix validation on the
       * field, so a link is not a guarantee of a picture.
       */
      IMAGE_UNAVAILABLE: "Image unavailable",
      YES: "Yes",
      NO: "No",
      // Footer actions
      REJECT: "Reject",
      SEND_QUOTE: "Send Quote",
      ALLOW_CHANGES: "Allow More Changes",
      // Shown in place of the actions once the request is closed or quoted.
      AWAITING_SAILOR:
        "Quote sent — awaiting the sailor's decision to pay, request changes, or reject.",
      CLOSED_ACCEPTED:
        "Paid and converted to an order — manage it from the Orders screen. Nothing left to do here.",
      CLOSED_REJECTED: "This request was closed. No further action is possible.",
      /** A status outside the documented state machine — offer nothing. */
      UNKNOWN_STATUS: (status: string) =>
        status
          ? `No admin actions are available for status "${status}".`
          : "This request has no status, so no admin actions are available.",
    },
    // Compact lifecycle rail in the drawer
    RAIL: {
      STAGES: {
        REQUESTED: "Requested",
        SOURCING: "Sourcing",
        QUOTED: "Quoted",
        ACCEPTED: "Accepted",
      },
      STAGE_OF: (current: number, total: number) => `Stage ${current} of ${total}`,
      TERMINAL_NOTICE: (label: string) => `Closed — ${label}`,
      LEGEND: {
        OPEN_LABEL: "What do these colours mean?",
        TITLE: "Colour key",
        DONE: "Done",
        DONE_HINT: "This stage is complete.",
        ACTIVE: "Current",
        ACTIVE_HINT: "Where the request sits right now.",
        PENDING: "Upcoming",
        PENDING_HINT: "Not reached yet.",
        CLOSED: "Closed",
        CLOSED_HINT: "Withdrawn or declined — the request is terminal.",
      },
    },
    // Banner shown when the sailor asked for new delivery details
    REBILL_BANNER: {
      TITLE: "Delivery changes requested",
      BODY: "The sailor updated their delivery details after the quote. Re-quote to fold the new details in.",
      AT_CAP: (cap: number) =>
        `The sailor has used all ${cap} delivery-change requests. They must pay or reject unless you allow more.`,
    },
    // Generate-bill (quote) popup — Flow 13 API 10
    BILL_DIALOG: {
      TITLE: "Send Quote",
      DESCRIPTION: (ref: string) => `Price ${ref} and send the quote to the sailor.`,
      PRODUCT_NAME: "Product Name",
      PRODUCT_NAME_PLACEHOLDER: "The item you sourced",
      DESCRIPTION_LABEL: "Description",
      DESCRIPTION_PLACEHOLDER: "What exactly are you quoting?",
      QUOTED_PRICE: "Quoted Price (per unit)",
      QUOTED_PRICE_HINT: "Minimum 0.01",
      FAST_DELIVERY_CHARGE: "Fast Delivery Charge",
      FAST_DELIVERY_CHARGE_HINT: "Charged only when the sailor picked fastest delivery",
      PRICE_PLACEHOLDER: "0.00",
      ADMIN_RESPONSE: "Message to Sailor",
      ADMIN_RESPONSE_PLACEHOLDER: "e.g. We found this item and can deliver it within your window.",
      CATEGORY: "Category",
      CATEGORY_HINT: "General-scope catalog category the quoted item is filed under",
      CATEGORY_PLACEHOLDER: "Select a category",
      CATEGORY_EMPTY: "No general-scope categories available",
      // Live total preview under the price fields.
      TOTAL_PREVIEW: (total: string, qty: number) => `Sailor pays ${total} for ${qty} unit(s)`,
      CANCEL: "Cancel",
      CONFIRM: "Send Quote",
      SENDING: "Sending…",
    },
    // Reject popup — Flow 13 API 11
    REJECT_DIALOG: {
      TITLE: "Reject Request",
      DESCRIPTION: (ref: string) =>
        `${ref} will be closed and the sailor notified. This cannot be undone.`,
      REASON: "Reason",
      REASON_PLACEHOLDER: "e.g. We cannot source this item at your port right now.",
      REASON_HINT: "Sent to the sailor as your reason",
      REASON_REQUIRED: "A reason is required",
      CANCEL: "Cancel",
      CONFIRM: "Reject Request",
      REJECTING: "Rejecting…",
    },
    // Allow-changes popup — Flow 13 API 12
    ALLOW_CHANGES_DIALOG: {
      TITLE: "Allow More Delivery Changes",
      DESCRIPTION: (ref: string) => `Raise the delivery-change limit on ${ref}.`,
      CURRENT: (used: number, cap: number) => `${used} of ${cap} used`,
      ADDITIONAL: "Additional Changes",
      ADDITIONAL_HINT: "Between 1 and 10 — added to the current limit",
      CANCEL: "Cancel",
      CONFIRM: "Raise Limit",
      SAVING: "Saving…",
    },
    // Toasts
    TOAST: {
      /**
       * Local state-machine guard: the request moved on (another admin acted,
       * or the sailor did) after the popup was opened on a stale snapshot.
       */
      STALE_STATE: (label: string) =>
        `This request is now "${label}" — that action is no longer available. Reopen it for the latest state.`,
      QUOTED: (ref: string) => `Quote sent to the sailor for ${ref}`,
      QUOTE_FAILED: "Failed to send the quote",
      REJECTED: (ref: string) => `${ref} rejected and the sailor notified`,
      REJECT_FAILED: "Failed to reject the request",
      CHANGES_ALLOWED: (cap: number) => `Delivery-change limit raised to ${cap}`,
      CHANGES_FAILED: "Failed to raise the delivery-change limit",
    },
  },
  SELLERS: {
    // Page chrome
    TITLE: "Seller Applications",
    SEARCH_PLACEHOLDER: "Search applications...",
    ALL_STATUS: "All Status",
    EMPTY: "No applications match the current filters.",
    FETCH_ERROR: "Failed to load seller applications.",
    // Status filter options (values map 1:1 to the API `status` query param)
    STATUS_FILTER: {
      PENDING: "Pending",
      REVIEWING: "Reviewing",
      APPROVED: "Approved",
      REJECTED: "Rejected",
    },
    // KPI cards (mapped to the seller stats API fields)
    STATS: {
      PENDING: "Pending Applications",
      PENDING_FOOTER: "Awaiting review",
      APPROVED: "Approved (Month)",
      APPROVED_FOOTER: "Now active",
      REJECTED: "Rejected",
      REJECTED_FOOTER: "This month",
      ACTIVE: "Active Sellers",
      ACTIVE_FOOTER: "On platform",
    },
    // Document status labels
    DOCS: {
      UPLOADED: "Uploaded",
      MISSING: "Missing",
    },
    // Table columns
    COLUMNS: {
      APPLICANT: "Applicant",
      EMAIL: "Email",
      BUSINESS: "Business",
      PRODUCTS: "Products",
      DOCUMENTS: "Documents",
      SUBMITTED: "Submitted",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    // Review drawer
    DETAIL: {
      TITLE: "Seller Application",
      LOADING: "Loading data...",
      FETCH_ERROR: "Failed to load application details.",
      EMPTY: "No details available for this application.",
      RETRY: "Retry",
      FALLBACK: "-",
      APPLICANT: "Applicant",
      BUSINESS_INFO: "Business Information",
      APPLICANT_NAME: "Applicant Name",
      EMAIL: "Email",
      PHONE: "Phone",
      BUSINESS_NAME: "Business Name",
      PRODUCTS: "Products / Categories",
      DOCUMENTS: "Documents",
      SUBMITTED: "Submitted",
      DECISION: "Decision",
      REJECTION_REASON: "Rejection Reason",
      MESSAGE: "Message to Applicant",
      MESSAGE_PLACEHOLDER: "Provide a detailed message explaining the issue...",
      APPROVE: "Approve",
      REJECT: "Reject & Notify",
      // Detail-only fields (present on request/?user_id=, not on the list row)
      BUSINESS_ADDRESS: "Business Address",
      GST_NUMBER: "GST Number",
      PHONE_NUMBER: "Phone",
      ADMIN_NOTE: "Previous Admin Note",
      // The API rejects a blank note on a rejection, so the drawer blocks it first.
      NOTE_REQUIRED: "A message is required when rejecting an application.",
    },
    // Rejection-reason options (drawer decision section)
    REJECT_REASONS: [
      "Incomplete documentation",
      "Products not eligible",
      "Duplicate account",
      "Policy violation",
      "Other",
    ],
    // Toasts
    TOAST: {
      APPROVED: "Seller approved — onboarding email sent",
      APPROVE_ERROR: "Failed to approve seller application",
      REJECTED: "Application rejected. Applicant notified.",
      REJECT_ERROR: "Failed to reject seller application",
    },
  },
  PARTNERS: {
    // Page chrome
    TITLE: "Delivery Partners",
    SUBTITLE_PARTNERS: "64 partners",
    SUBTITLE_ON_DUTY: "28 on duty",
    SEARCH_PLACEHOLDER: "Search partners...",
    ALL_STATUS: "All Status",
    ADD_PARTNER: "Onboard Partner",
    EMPTY: "No partners match the current filters.",
    FETCH_ERROR: "Failed to load delivery partners.",
    // Status filter options
    STATUS_FILTER: {
      ON_DUTY: "On Duty",
      AVAILABLE: "Available",
      INACTIVE: "Inactive",
    },
    // KPI cards (static figures from the design mock — no partners API yet)
    STATS: {
      TOTAL: "Total Partners",
      TOTAL_FOOTER: "Across all ports",
      ON_DUTY: "On Duty Now",
      ON_DUTY_FOOTER: "All active",
      ACTIVE_DELIVERIES: "Active Deliveries",
      ACTIVE_DELIVERIES_FOOTER: "In progress",
      WEEKLY_EARNINGS: "Weekly Earnings",
      WEEKLY_EARNINGS_FOOTER: "Total paid out",
    },
    // Table columns
    COLUMNS: {
      PARTNER: "Partner",
      ID: "ID",
      PORT_ZONE: "Port Zone",
      JOINED: "Joined",
      CAPABILITY: "Capability",
      STATUS: "Status",
      ACTIVE_ORDERS: "Active Orders",
      THIS_WEEK: "This Week",
      TOTAL_DELIVERIES: "Total Deliveries",
      RATING: "Rating",
      ACTIONS: "Actions",
    },
    // Row actions
    ACTIONS: {
      VIEW: "View Profile",
      MESSAGE: "Message",
      EDIT: "Edit Info",
      DELETE: "Delete Partner",
    },
    // Profile detail / edit drawer
    DETAIL: {
      TITLE: "Partner Profile",
      SUBTITLE: "View & update partner details",
      ROLE: "Delivery Partner",
      SECTION: "Partner Details",
      FIRST_NAME: "First Name",
      FIRST_NAME_PLACEHOLDER: "e.g. John",
      LAST_NAME: "Last Name",
      LAST_NAME_PLACEHOLDER: "e.g. Doe",
      EMAIL: "Email",
      EMAIL_PLACEHOLDER: "user@anchormart.io",
      COUNTRY_CODE: "Country Code",
      COUNTRY_CODE_PLACEHOLDER: "e.g. +91",
      WHATSAPP: "WhatsApp Number",
      WHATSAPP_PLACEHOLDER: "9989091871",
      /**
       * Reused for the list column and the form field, so the two name the same
       * thing identically. Optional on the API, but it is what makes a partner
       * reachable by port-scoped assignment — no UI collected it before, so
       * every partner had none and the port-scoped picker returned nothing.
       */
      PORT: "Port Zone",
      PORT_PLACEHOLDER: "Select a port…",
      PORT_NONE: "No port assigned",
      JOINED: "Joined",
      DELIVERIES: "Total Deliveries",
      SAVE: "Save Changes",
    },
    /**
     * Capability (Flow 28 · `can_verify` / `can_deliver`).
     *
     * Two independent booleans, not a role: a partner may verify, deliver, or
     * both — "both" is the default and the common case. Neither is impossible
     * and the backend refuses it with a 400.
     */
    CAPABILITY: {
      SECTION: "Capability",
      HELP: "What kind of work this partner may be assigned. At least one is required.",
      VERIFY: "Stock verification",
      VERIFY_HELP: "Walk the sailor's list at the store and report what is actually available.",
      DELIVER: "Delivery",
      DELIVER_HELP: "Collect the goods, move them to the vessel and hand them over.",
      // Short labels for a row badge, where there is no room for the long form.
      BADGE_VERIFY: "Verify",
      BADGE_DELIVER: "Deliver",
      BADGE_BOTH: "Verify & Deliver",
      NONE: "No capability",
      // Client-side mirror of the server's "at least one must be true" rule.
      REQUIRED: "Pick at least one — a partner with no capability cannot be assigned any work.",
      // Capability is long-lived and admin-set; availability is the partner's
      // own daily on/off-shift toggle. Conflating them is the common mistake.
      NOT_AVAILABILITY:
        "Capability is what this partner is qualified for. Whether they are on shift right now is their own availability toggle.",
    },
    /**
     * Copy for the `capability_change` block a revoking update returns
     * (Flow 28 API 5, added 2026-08-03).
     *
     * Revoking is **rostering, not an emergency stop**: work already in hand
     * runs to completion. This dialog is what stops an admin believing
     * otherwise, so it is shown rather than folded into a toast.
     */
    CAPABILITY_CHANGE: {
      TITLE: "Capability revoked — work already running is unaffected",
      REVOKED: "Revoked",
      IN_FLIGHT: "Assignments still in progress",
      NONE_IN_FLIGHT: "Nothing was running under that capability.",
      // The server caps the order list at 20 rows while `count` stays exact.
      TRUNCATED: (count: number) => `Showing the first 20 of ${count}.`,
      REASSIGN: "Reassign",
      HINT: "To stop this partner now, reassign the order(s) or block the account.",
      CLOSE: "Done",
    },
    // Profile & work-history drawer (Flow 28 API 6b) — the drill-down a row
    // click opens. Editing is one deliberate step further in.
    HISTORY: {
      TITLE: "Partner Profile",
      SUBTITLE: "Work history & performance",
      ROLE: "Delivery Partner",
      EDIT: "Edit Partner",
      SECTION_SUMMARY: "Performance",
      SECTION_JOBS: "Work History",
      // The rollup is computed before the outcome filter is applied, so the
      // header and the list can never contradict each other.
      SUMMARY_NOTE: "Totals cover the selected period. The outcome filter narrows the list only.",
      DASH: "—",
      CAPABILITY: {
        VERIFY: "Verify",
        DELIVER: "Deliver",
        NONE: "No capability",
      },
      STATUS: {
        AVAILABLE: "Available",
        UNAVAILABLE: "Unavailable",
        BLOCKED: "Blocked",
      },
      STATS: {
        TOTAL: "Total Jobs",
        DELIVERED: "Delivered",
        VERIFIED: "Verified",
        FAILED: "Failed",
        SUCCESS_RATE: "Delivery Success",
        ON_TIME_RATE: "On Time",
        // A rate of null means no samples — deliberately not rendered as 0%,
        // which would read as "this partner fails everything".
        NO_SAMPLES: "No data yet",
        SLA_FOOTER: (n: number) => `${n} order${n === 1 ? "" : "s"} with a deadline`,
      },
      FILTERS: {
        OUTCOME_ALL: "All outcomes",
        PERIOD_ALL: "All time",
        PERIOD_TODAY: "Today",
        PERIOD_WEEK: "This week",
        PERIOD_MONTH: "This month",
        SEARCH_PLACEHOLDER: "Search order number…",
      },
      OUTCOMES: {
        delivered: "Delivered",
        failed: "Failed",
        verified: "Verified",
        in_progress: "In Progress",
        rejected: "Rejected",
        reassigned: "Reassigned",
        cancelled: "Cancelled",
      } as Record<string, string>,
      COLUMNS: {
        ORDER: "Order",
        OUTCOME: "Outcome",
        ASSIGNED: "Assigned",
        COMPLETED: "Completed",
        ON_TIME: "On Time",
        RATING: "Rating",
      },
      ON_TIME: {
        YES: "On time",
        LATE: "Late",
        // Only express / emergency / fastest orders carry a deadline; for the
        // rest punctuality has no answer, and a dash says so.
        NA_TITLE: "This order carried no delivery deadline",
      },
      EMPTY: "No work history for this partner yet.",
      EMPTY_FILTERED: "No jobs match the current filters.",
      FETCH_ERROR: "Failed to load partner history.",
    },
    // Onboard / edit form drawer
    FORM: {
      ADD_TITLE: "Onboard Delivery Partner",
      EDIT_TITLE: "Edit Partner Details",
      SUBTITLE: "Delivery partner details",
      NAME: "Full Name",
      NAME_PLACEHOLDER: "e.g. Aisha Karimi",
      EMAIL: "Email",
      EMAIL_PLACEHOLDER: "e.g. partner@anchormart.io",
      PHONE: "Phone Number",
      PHONE_PLACEHOLDER: "e.g. +65 9123 4567",
      PORT_ZONE: "Port Zone",
      PARTNER_ID: "Partner ID",
      PARTNER_ID_PLACEHOLDER: "e.g. DP-00056 (leave blank to auto-generate)",
      VEHICLE: "Vehicle Type",
      SUBMIT_ADD: "Onboard Partner",
      SUBMIT_EDIT: "Save Changes",
    },
    // Delete confirmation
    CONFIRM_DELETE: {
      TITLE: "Delete partner?",
      MESSAGE: (name: string) => `Delete partner ${name}? This action cannot be undone.`,
      CONFIRM: "Delete",
    },
    // Validation copy lives in the shared `VALIDATION` block at the bottom of
    // this file — the partner form builds its schema from `lib/validation`, so
    // a local copy here would be a second, drifting source of the same strings.
    // Toasts
    TOAST: {
      ADDED: "Delivery partner onboarded successfully",
      ADD_ERROR: "Failed to onboard partner",
      UPDATED: "Delivery partner updated successfully",
      UPDATE_ERROR: "Failed to update partner",
      DELETED: (name: string) => `Partner ${name} deleted`,
      DELETE_ERROR: "Failed to delete partner",
      /**
       * The 409 branch. Deleting is blocked while the partner still holds **any**
       * active assignment — the guard keys on `is_active`, not on whether they
       * are mid-delivery, because a partner whose verification is finished still
       * owns the order and deleting them would strand it.
       */
      DELETE_BLOCKED:
        "This partner still holds an order. Reassign or finish it before deleting them.",
      MESSAGE_OPENED: (name: string) => `Chat session opened with ${name}`,
    },
  },
  // Product catalog / merchandising flags (set-catalog-type, top-rated,
  // sourceable, announce-availability).
  PRODUCT_FLAGS: {
    CATALOG_DIALOG: {
      TITLE: "Change catalog",
      DESCRIPTION: (name: string) => `Move “${name}” to a different catalog.`,
      CATALOG_LABEL: "Catalog",
      CATEGORY_LABEL: "Category",
      /**
       * Required in **both** directions, not just into marine emergency: the
       * two catalogs keep separate category sets, so a product crossing between
       * them needs one from the target's set. Only express is exempt — it spans
       * both scopes, so the existing category stays valid.
       */
      CATEGORY_HINT: "Each catalog keeps its own categories, so this move needs a new one.",
      /**
       * Leaving express: the product already holds a real-scope category, so the
       * usual case carries over untouched and the picker is an override.
       */
      CATEGORY_LABEL_OPTIONAL: "Category (optional)",
      CATEGORY_HINT_OPTIONAL:
        "Leave blank to keep the product's current category. Pick one only if you want to move it.",
      /** Express is a second price list, not a delivery option on the regular price. */
      EXPRESS_PRICE_LABEL: "Express price *",
      EXPRESS_PRICE_HINT:
        "What the express shelf charges. This prices the product's primary SKU — the others are priced below.",
      EXPRESS_PRICE_REQUIRED: "An express product needs an express price.",
      EXPRESS_PRICE_PLACEHOLDER: "Express price",
      EXPRESS_SKUS_LABEL: "SKU prices",
      /** A ready SKU keeps its price unless this call names one. */
      SKU_READY: (price: number) => `Express ${price} — leave blank to keep`,
      EXPRESS_PRICE_KEEP: "Keep",
      EXPRESS_SKUS_HINT:
        "An unpriced SKU stays pending — on the express shelf, but refused by the express cart until someone quotes it. Already-priced SKUs keep their price unless you enter a new one.",
      /** Context for quoting, never a suggestion — see the dialog. */
      REGULAR_PRICE: (price: number) => `Regular ${price}`,
      LEAVING_EXPRESS:
        "Leaving express clears every SKU's express price and flag. Coming back means quoting them again.",
      CATEGORY_PLACEHOLDER: "Select a category",
      CATEGORY_REQUIRED: "Pick a category from the catalog you're moving to.",
      /**
       * C5 — the general and marine catalogs are different screens, so crossing
       * between them makes the row disappear from the table behind this dialog.
       * Saying where it went turns a successful move that looks like a failed
       * save into one that reads correctly.
       */
      MOVES_SCREEN: (screen: string) =>
        `This moves the product to the ${screen} screen — it will no longer appear in this list.`,
      SCREEN_SPARES: "Marine Emergency Spares",
      SCREEN_PRODUCTS: "Products",
      CONFIRM: "Move product",
      CANCEL: "Cancel",
      OPTIONS: {
        REGULAR: "Regular",
        EXPRESS: "Express",
        MARINE_EMERGENCY: "Marine Emergency",
      },
    },
    ANNOUNCE_DIALOG: {
      TITLE: "Announce availability?",
      MESSAGE: (name: string) =>
        `Every customer will get a push and in-app notice that “${name}” is now available. No email is sent.`,
      // Worth stating plainly: this is a broadcast, not a targeted waitlist ping.
      NOTE: "The product must be active and sourceable, with at least one sourceable variant.",
      CONFIRM: "Announce",
    },
    COLUMNS: {
      TOP_RATED: "Top Rated",
      SOURCEABLE: "Sourceable",
    },
    /**
     * Header-dropdown filters for the two flag columns, server-side via
     * `?is_top_rated=` and `?admin_sourceable=`. `ColumnFilterHeader` supplies
     * the "all" entry from `allLabel`, so neither list carries one.
     */
    FILTERS: {
      TOP_RATED_ALL: "Any",
      TOP_RATED_YES: "Top rated",
      TOP_RATED_NO: "Not top rated",
      SOURCEABLE_ALL: "Any",
      SOURCEABLE_YES: "Sourceable",
      SOURCEABLE_NO: "Not sourceable",
    },
    TOAST: {
      CATALOG_UPDATED: "Catalog updated",
      /**
       * Deliberately a warning, not a success: a pending SKU is on the express
       * shelf and **refused** by the express cart and at the till, so the move
       * left the product part-sellable rather than done.
       */
      CATALOG_UPDATED_PENDING: (ready: number, total: number, pending: number) =>
        `Moved to Express. ${ready} of ${total} ${total === 1 ? "variant is" : "variants are"} Express-ready — ${pending} still ${pending === 1 ? "needs" : "need"} an express price before ${pending === 1 ? "it" : "they"} can be sold.`,
      /**
       * Leaving express un-flags every live variant in the same transaction, so
       * one field change moved N rows. Reported because it is also what stops a
       * later move *back* onto the express shelf resurrecting stale flags.
       */
      CATALOG_UPDATED_UNFLAGGED: (n: number) =>
        `Catalog updated — express removed from ${n} variant${n === 1 ? "" : "s"}.`,
      CATALOG_ERROR: "Failed to change the catalog",
      TOP_RATED_UPDATED: "Top-rated flag updated",
      TOP_RATED_ERROR: "Failed to update the top-rated flag",
      SOURCEABLE_UPDATED: "Sourceable flag updated",
      SOURCEABLE_ERROR: "Failed to update the sourceable flag",
      ANNOUNCED: (name: string) => `Announced “${name}” to customers`,
      /**
       * The 120-second dedupe window (29a §4 / GA11). A repeat announce is a
       * **200 no-op**, not a second broadcast — saying "announced" again would
       * claim a send that never happened.
       */
      ANNOUNCE_DEDUPED: (name: string) => `“${name}” was announced moments ago — not sent again`,
      ANNOUNCE_ERROR: "Failed to announce this product",
    },
  },
  // Product variants — the sellable SKUs beneath a product.
  VARIANTS: {
    /**
     * `set-express/` — the only path that makes a SKU sellable as express.
     * Express is a second price list, so the price travels with the flag.
     */
    /** Shared by the variants drawer's express column. */
    EXPRESS: {
      PENDING: "Pending price",
      /**
       * Under a non-express parent there is no shelf to be pending for, so this
       * is an ordinary state rather than the warning `PENDING` names.
       */
      NOT_EXPRESS: "Not express",
      SET_TITLE: "Set an express price",
      RETITLE: "Change the express price",
      PRIMARY: "Primary",
    },
    EXPRESS_DIALOG: {
      ON_TITLE: "Sell this SKU as express?",
      ON_DESCRIPTION: (sku: string) => `${sku} will be sellable on the express shelf.`,
      OFF_TITLE: "Take this SKU off express?",
      OFF_DESCRIPTION: (sku: string) => `${sku} will no longer be sold as express.`,
      OFF_WARNING:
        "This clears the SKU's express price — putting it back means quoting it again. If it is the product's last express SKU, the product leaves the express shelf too.",
      PRICE_LABEL: "Express price *",
      PRICE_HINT: "What the express shelf charges for this SKU. Separate from its regular price.",
      PRICE_REQUIRED: "An express SKU needs an express price.",
      ON_CONFIRM: "Make express",
      OFF_CONFIRM: "Remove from express",
      CANCEL: "Cancel",
      DONE: (sku: string, on: boolean) =>
        on ? `${sku} is now sellable as express.` : `${sku} is no longer sold as express.`,
      DONE_CASCADED: (sku: string, on: boolean, catalog: string) =>
        on
          ? `${sku} is now express — its product joined the express shelf.`
          : `${sku} is no longer express — its product moved to the ${catalog} catalog.`,
      FAILED: "Could not change the express setting. Please try again.",
    },
    TITLE: "Variants",
    SUBTITLE: (product: string) => `SKUs under ${product}`,
    ADD: "Add Variant",
    EMPTY: "This product has no variants yet.",
    FETCH_ERROR: "Failed to load variants.",
    DASH: "—",
    COLUMNS: {
      SKU: "SKU",
      PRICE: "Price",
      ATTRIBUTES: "Attributes",
      EXPRESS: "Express",
      SOURCEABLE: "Sourceable",
      ACTIVE: "Active",
      ACTIONS: "Actions",
    },
    // AnchorMart holds no stock count — orderability is these two flags, and the
    // product-level switch overrides the variant one.
    SOURCEABLE_HINT: "A variant is only orderable when both it and its product are sourceable.",
    /** The parent product's catalog, shown in the drawer header. */
    PRODUCT_CATALOG: "Product catalog:",
    /**
     * A variant added here starts sourceable even under a non-sourceable product
     * (`add-product-variant/` takes the model default rather than inheriting, unlike
     * the inline variant `add-product/` creates). So an on switch under an off master
     * is correct, and this line is what stops it reading as a bug.
     */
    BLOCKED_BY_PRODUCT: "Blocked by the product's sourceable switch",
    ACTIONS: {
      EDIT: "Edit variant",
      DELETE: "Delete variant",
      MAKE_PRIMARY: "Make this the primary SKU",
      TOGGLE_SOURCEABLE: "Toggle sourceable",
    },
    FORM: {
      ADD_TITLE: "Add Variant",
      EDIT_TITLE: "Edit Variant",
      SKU: "SKU",
      SKU_PLACEHOLDER: "e.g. SHIRT-RED-M",
      /**
       * The reservation is **accepted behaviour**, not a defect — it protects
       * order history (C11). The server now classifies a collision as live vs
       * deleted and says which, so this hint only has to set the expectation;
       * the specific reason arrives field-keyed on the input.
       */
      SKU_HINT: "Unique across all variants, including deleted ones.",
      /** Express is a second price list, not a surcharge on `price`. */
      EXPRESS_PRICE: "Express price",
      EXPRESS_PRICE_HINT_ADD:
        "What the express shelf charges. Leave blank to file this SKU as pending — not sellable as express until priced.",
      EXPRESS_PRICE_HINT_EDIT: "What the express shelf charges for this SKU.",
      ATTRIBUTE_KEY_PLACEHOLDER: "Name — e.g. size",
      ATTRIBUTE_VALUE_PLACEHOLDER: "Value — e.g. L",
      ATTRIBUTE_ADD: "Add attribute",
      ATTRIBUTE_REMOVE: "Remove attribute",
      PRICE: "Price",
      PRICE_PLACEHOLDER: "0.00",
      ATTRIBUTES: "Attributes (JSON)",
      ATTRIBUTES_HINT:
        "Anything worth recording against this SKU — size, grade, pack. Names are yours to choose.",
      IMAGES: "Image paths",
      IMAGES_PLACEHOLDER: "variant_images/example.png",
      ACTIVE: "Active",
      SAVE: "Save Variant",
      CANCEL: "Cancel",
    },
    VALIDATION: {
      SKU_TOO_LONG: (max: number) => `SKU must be ${max} characters or fewer.`,
      SKU_REQUIRED: "SKU is required.",
      /** The serializer floor is 0.01 with 2 decimal places — same as `base_price`. */
      PRICE_INVALID: "Enter a price of at least 0.01, with at most 2 decimal places.",
      /** Two rows naming the same attribute would collapse silently in the object. */
      ATTRIBUTES_DUPLICATE: "Duplicate attribute name",
    },
    TOAST: {
      CREATED: (sku: string) => `Variant ${sku} created`,
      /** Created without an express price on an express product — see the form. */
      CREATED_PENDING: (sku: string) =>
        `${sku} created — pending an express price, so it is not yet sellable as express.`,
      CREATE_ERROR: "Failed to create the variant",
      /** A field edit that also moved the product between catalogs. */
      UPDATED_CASCADED: (sku: string, catalog: string) =>
        `${sku} updated — it was the last express SKU, so its product moved to the ${catalog} catalog.`,
      PRIMARY_SET: (sku: string) => `${sku} is now this product's primary SKU.`,
      PRIMARY_ERROR: "Could not change the primary SKU",
      UPDATED: (sku: string) => `Variant ${sku} updated`,
      UPDATE_ERROR: "Failed to update the variant",
      DELETED: (sku: string) => `Variant ${sku} deleted`,
      DELETE_ERROR: "Failed to delete the variant",
      NO_CHANGES: "No changes to save",
      FLAG_UPDATED: "Variant updated",
      FLAG_ERROR: "Failed to update the variant",
      // Setting a variant sourceable turns the product's master switch on when
      // it was off (Flow 29a §5, up-cascade). Say so — the admin changed one
      // SKU and a second, product-level flag moved with it.
      SOURCEABLE_CASCADED: "Variant is now sourceable — the product was switched on with it.",
      /** The deleted SKU was the primary, so another was promoted in its place. */
      DELETED_NEW_PRIMARY: (sku: string) =>
        `Variant ${sku} deleted — it was the primary SKU, so another is now the product's default.`,
      /** Deleting the last express variant demotes the product the same way. */
      DELETED_CASCADED: (sku: string, product: string, catalog: string) =>
        `Variant ${sku} deleted — “${product}” moved to the ${catalog} catalog.`,
    },
    /**
     * Delete confirmation.
     *
     * Deliberately does *not* warn about leaving the product variant-less: the
     * backend refuses to delete a product's only variant (400, with a sentence
     * saying what to do instead), so that state is unreachable from here. It does
     * name the two consequences that are real — the SKU stays reserved, and a
     * live deal on this variant quietly stops applying.
     */
    CONFIRM_DELETE: {
      TITLE: "Delete variant?",
      MESSAGE: (sku: string) =>
        `${sku} will be removed from this product. This cannot be undone, and the SKU stays reserved — it cannot be reused for a new variant. Any live deal on it stops applying.`,
      CONFIRM: "Delete",
    },
  },
  PRODUCTS: {
    // Page chrome
    TITLE: "Products & Catalog",
    /** `?search=` matches the product **name** only — not SKU, not description. */
    SEARCH_PLACEHOLDER: "Search by product name…",
    ALL_CATEGORIES: "All Categories",
    ADD_PRODUCT: "Add Product",
    /** Free-form key/value on the product's first variant — no fixed field set. */
    ATTRIBUTES_HINT:
      "Anything worth recording against this SKU — size, grade, pack, length. Names are yours to choose.",
    ATTRIBUTE_ADD: "Add attribute",
    ATTRIBUTE_REMOVE: "Remove attribute",
    FETCH_ERROR: "Failed to fetch products",
    EMPTY: "No products found.",
    // Filter tabs
    TABS: {
      ALL: "All Products",
      DEAL: "Deal Products",
      TOP_RATED: "Top Rated",
    },
    /**
     * KPI cards — one per figure the product-stats endpoint returns, all eleven
     * flat rather than nested as sub-lines, so every number is readable at a
     * glance. All of them follow the filter bar **except the category counts**,
     * which are the taxonomy rather than products.
     */
    STATS: {
      /**
       * Spans all three catalogs, while the table below serves the general two —
       * 50 against 36 unfiltered. The catalog-type cards that follow say where
       * the difference goes; narrowing the count would under-report the catalog.
       */
      TOTAL_PRODUCTS: "Total Products · all catalogs",
      ACTIVE: "Active",
      REGULAR: "Regular",
      EXPRESS: "Express",
      EMERGENCY: "Marine Emergency · listed separately",
      TOP_RATED: "Top Rated",
      /**
       * These two count **different things**, so both say their unit. `on_deal`
       * counts products with at least one variant on a live deal;
       * `deal_of_the_day` counts the deal rows themselves. Two variants of one
       * product on deal reads 1 and 2 — side by side and unlabelled, that looks
       * like one of them is wrong.
       */
      ON_DEAL: "Products On Deal",
      DEAL_OF_THE_DAY: "Live Deals · one per variant",
    },
    /**
     * Table columns — one per field the list serializer actually returns, so
     * `catalog_type`, `variant_count`, `on_deal`, `average_rating` and
     * `purchase_count` are readable from the row instead of only inside a
     * drawer.
     */
    COLUMNS: {
      PRODUCT: "Product",
      CATEGORY: "Category",
      CATALOG: "Catalog",
      PRICE: "Price",
      /** The express shelf's own figure — a second price list, not a surcharge. */
      EXPRESS_PRICE: "Express Price",
      VARIANTS: "Variants",
      PURCHASES: "Purchases",
      DEAL: "Deal",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    STATUS_FILTER: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    },
    DEAL_YES: "On Deal",
    /** add-product creates the first variant from this SKU, or none without it. */
    SKU_HINT: "Becomes the product's first variant, priced at the base price. Must be unique.",
    /** Rendered where a field is absent or zero — never a bare 0, which reads as measured. */
    DASH: "—",
    ACTION_EDIT: "Edit",
    ACTION_REMOVE: "Remove",
    IMAGE_ALT: "Product",
    // Toasts
    TOAST: {
      DELETE_SUCCESS: "Product deleted successfully",
      DELETE_ERROR: "Failed to delete product",
      ADD_SUCCESS: "Product created successfully",
      ADD_ERROR: "Failed to create product. Please try again.",
      UPDATE_SUCCESS: "Product updated successfully",
      UPDATE_ERROR: "Failed to update product. Please try again.",
      /** Save pressed with a pristine form — no PATCH is sent. */
      NO_CHANGES: "No changes to save",
      ACTIVATED: "Product is now active",
      DEACTIVATED: "Product deactivated — it can no longer be ordered",
      ACTIVE_ERROR: "Failed to change the product's status",
    },
    // Delete confirmation dialog
    /**
     * Deleting is a soft delete server-side — `is_deleted` on the product and
     * every variant — but there is **no undelete endpoint** and every admin
     * queryset filters deleted rows out, so it is terminal from here: the row
     * does not come back under the Inactive filter or anywhere else. The copy
     * points at deactivation, which is the reversible action operators usually
     * want and which lives on the edit drawer's Active switch.
     */
    DELETE_CONFIRM: {
      TITLE: "Delete Product",
      MESSAGE:
        "This removes the product and all of its variants from every admin screen, and cannot be undone — there is no restore. It does not check for open orders, carts or running deals. To take it off sale but keep the record, switch it to inactive from the Status column instead.",
      CONFIRM: "Delete",
      /** Typed to confirm — see the dialog's `confirmPhrase`. */
      PHRASE: "delete",
    },
    // Add drawer
    ADD: {
      TITLE: "Add New Product",
      SUBTITLE: "Create a new product for your catalog",
      /**
       * The shelf is fixed by the screen the form was opened from, so the header
       * states it rather than the form offering a picker.
       */
      TITLE_EXPRESS: "Add Express Product",
      SUBTITLE_EXPRESS: "Create a product on the express catalog",
      TITLE_MARINE: "Add Marine Emergency Spare",
      SUBTITLE_MARINE: "Create a spare on the marine emergency catalog",
      SUBMIT: "Add Product",
      SAVING: "Saving…",
      CANCEL: "Cancel",
    },
    // Edit drawer
    EDIT: {
      TITLE: "Edit Product",
      SUBTITLE: "Update your product details",
      SUBMIT: "Save Changes",
      SAVING: "Saving…",
      /**
       * Two tabs: what `update-product/` writes, and what the variant endpoints
       * do. Media / Pricing / Shipping were panels of read-only decoration —
       * subtitle, slug, tax class, weight, package type — over fields the update
       * contract has no place for.
       */
      TABS: {
        BASIC: "Basic Info",
        VARIANTS: "Variants",
      },
      /** Says where the things this form does not write are actually changed. */
      NOT_EDITABLE_HINT:
        "Catalog type, SKU, variant prices and attributes are not edited here — use Change catalog for the shelf, and the Variants tab for anything per-SKU.",
    },
    // Drawer section headings
    // Variants tab on the edit drawer — read-only, since variants are not part
    // of the update-product contract and have their own endpoints.
    VARIANTS_TAB: {
      COUNT: (n: number) => `${n} variant${n === 1 ? "" : "s"}`,
      EMPTY: "This product has no variants yet.",
      READ_ONLY: "Variants are managed from the Products list — row menu → Manage variants.",
      COLUMNS: {
        IMAGE: "Image",
        SKU: "SKU",
        PRICE: "Price",
        ATTRIBUTES: "Attributes",
        EXPRESS: "Express",
        ORDERABLE: "Orderable",
        ADDED: "Added",
      },
      /**
       * The expanded row. It reads the variant already nested on the product
       * detail response — the dedicated `product-variant/` endpoint returns the
       * same shape, so expanding costs no extra request.
       */
      DETAIL: {
        GALLERY: (n: number) => `Images · ${n}`,
        NO_IMAGES: "This variant has no images.",
        IMAGE_ALT: (sku: string, n: number) => `${sku} image ${n}`,
        DETAILS: "Variant Details",
        CATALOG_TYPE: "Catalog Type",
        ACTIVE: "Active",
        /** Half the rule only — the Orderable badge is the effective answer. */
        VARIANT_SOURCEABLE: "Variant Sourceable",
        ABOUT: "About This Variant",
        UPDATED: "Last Updated",
        /**
         * Product deactivation does not cascade to variant rows, so a variant
         * stays `is_active: true` under an inactive parent. Ordering is blocked
         * either way; without this line the pair just looks inconsistent.
         */
        INHERITED_INACTIVE: "The product is inactive, so this variant cannot be ordered either.",
      },
      YES: "Yes",
      NO: "No",
      ORDERABLE_YES: "Orderable",
      ORDERABLE_NO: "Not orderable",
      // Flow 03/17: the effective rule is the AND of the product master and the
      // variant flag, so a variant can be sourceable and still unbuyable.
      BLOCKED_BY_PRODUCT: "Blocked by the product's sourceable switch, not this variant's",
      BLOCKED_BY_VARIANT: "This variant is not sourceable",
      BLOCKED_INACTIVE: "This variant is inactive",
    },
    /**
     * The system-set half of the detail payload — figures and flags
     * `get-product/<id>/` returns but the update contract does not accept, so
     * they are shown rather than edited. Without this block `average_rating`,
     * `purchase_count`, `catalog_type`, `is_internal` and both timestamps came
     * back on every read and rendered nowhere.
     */
    RECORD: {
      TITLE: "Record",
      HINT: "Set by the system or from the Products list — not part of this form.",
      CATALOG_TYPE: "Catalog Type",
      /**
       * Computed live per request from the promotion module's deal rows, and
       * variant-level: true means *some* variant has a running deal, not that the
       * product is discounted. No product endpoint can set it.
       */
      ON_DEAL: "On Deal",
      NO_DEAL: "No running deal",
      DEAL_HINT: "Deals are set per variant on the Deals screen, with a price and a time window.",
      PURCHASES: "Purchases",
      VARIANTS: "Variants",
      INTERNAL: "Internal Product",
      INTERNAL_YES: "Hidden from the customer catalogue",
      INTERNAL_NO: "Listed to customers",
      CREATED: "Created",
      UPDATED: "Last Updated",
    },
    SECTIONS: {
      BASIC: "Basic Information",
      MEDIA: "Product Media",
      INVENTORY_PRICING: "Inventory & Pricing",
      ATTRIBUTES: "Product Attributes",
      ADDITIONAL: "Additional Settings",
      DETAILS: "Product Details",
      PRICING: "Pricing",
      SHIPPING: "Shipping & Delivery",
      OPTIONS: "Product Options",
      VARIANTS: "Variants",
      FLAGS: "Catalog & Merchandising",
    },
    // Toggle labels
    /**
     * `EXPRESS` and `ON_DEAL` are gone from here: both labelled switches for
     * fields update-product cannot write, and the API drops unknown keys
     * silently, so each one saved successfully and changed nothing.
     */
    TOGGLES: {
      ON_DISCOUNT: "On discount",
      ADMIN_SOURCEABLE: "Admin sourceable",
      ACTIVE: "Active",
      TOP_RATED: "Top rated",
      TAXABLE: "Taxable",
      PHYSICAL: "Physical Product",
      FREE_SHIPPING: "Free Shipping",
    },
  },
  SETTINGS: {
    TITLE: "Settings",
    SUBTITLE: "Platform configuration, admin accounts and the help centre",
    /**
     * Platform Configuration. Read-only throughout — the loyalty values that
     * were the one editable part moved to the Configure Points drawer on
     * Rewards & Coupons, which writes the same endpoint and was always the
     * second editor of the same record.
     */
    CONFIG: {
      TITLE: "Platform Configuration",
      SECTIONS: {
        OPERATIONAL: "Operational Limits",
      },
      NO_ENDPOINT_HINT:
        "These limits have no API yet, so they are shown for reference and cannot be edited here.",
    },
    FAQ: {
      PAGE_TITLE: "Help & FAQ",
      PAGE_SUBTITLE: "Questions and answers shown to sailors in the help centre",
      SEARCH_PLACEHOLDER: "Search FAQs…",
      ALL_CATEGORIES: "All categories",
      ADD_BUTTON: "Add FAQ",
      EMPTY: "No FAQs match this view.",
      FETCH_ERROR: "Could not load FAQs.",
      ACTION_EDIT: "Edit FAQ",
      ACTION_REMOVE: "Delete FAQ",
      UPDATED_PREFIX: "Updated",
      STATS: {
        TOTAL: "Total FAQs",
        CATEGORIES: "Categories",
      },
      SECTIONS: {
        CONTENT: "Question & Answer",
        RECORD: "Record",
      },
      ADD: {
        TITLE: "Add FAQ",
        SUBTITLE: "Publish a question and answer to the help centre.",
        SUBMIT: "Add FAQ",
        SAVING: "Adding…",
      },
      EDIT: {
        TITLE: "Edit FAQ",
        SUBTITLE: "Update the question, answer or category.",
        SUBMIT: "Save Changes",
        SAVING: "Saving…",
        TOAST_SUCCESS: "FAQ updated",
        TOAST_ERROR: "Could not update the FAQ",
      },
      CONFIRM: {
        TITLE: "Delete FAQ?",
        DESCRIPTION: "This removes the question from the help centre. It cannot be undone.",
      },
      TOAST: {
        CREATE_SUCCESS: "FAQ added",
        CREATE_ERROR: "Could not add the FAQ",
        DELETE_SUCCESS: "FAQ deleted",
        DELETE_ERROR: "Could not delete the FAQ",
      },
    },
    FAQ_TYPES: {
      TITLE: "FAQ Categories",
      ADD: "Add",
      SAVE: "Save",
      DELETE: "Delete category",
      ADD_PLACEHOLDER: "New category name",
      CONFIRM: {
        TITLE: "Delete category?",
        DESCRIPTION: "FAQs filed under this category may be left without one.",
      },
      TOAST: {
        CREATE_SUCCESS: "Category added",
        CREATE_ERROR: "Could not add the category",
        UPDATE_SUCCESS: "Category renamed",
        UPDATE_ERROR: "Could not rename the category",
        DELETE_SUCCESS: "Category deleted",
        DELETE_ERROR: "Could not delete the category",
      },
    },
  },
  CATEGORIES: {
    // Page chrome
    TITLE: "Categories",
    SUBTITLE: "Organize your catalog into categories",
    /** `?search=` matches the category **name** only — not the description. */
    SEARCH_PLACEHOLDER: "Search by category name…",
    ADD_CATEGORY: "Add Category",
    FETCH_ERROR: "Failed to fetch categories",
    EMPTY: "No categories found.",
    IMAGE_ALT: "Category",
    ACTIVE_HINT:
      "Hides the category from the customer's browse list. Its products stay on sale and remain findable by search.",
    /**
     * KPI cards. Scoped to this taxonomy and following the list's filters since
     * 2026-08-17 — before that the endpoint was called with no params at all, so
     * the cards described the whole taxonomy over a filtered table.
     */
    STATS: {
      TOTAL_CATEGORIES: "Total Categories",
      ACTIVE_CATEGORIES: "Active",
      INACTIVE_CATEGORIES: "Inactive",
      /**
       * Counts assignments active or not — so a category can be "not empty" and
       * still show a sailor nothing. Labelled for what it measures rather than
       * the bare word.
       */
      EMPTY_CATEGORIES: "No Products Filed",
    },
    // Table
    COLUMNS: {
      CATEGORY: "Category",
      SCOPE: "Scope",
      PRODUCTS: "Products",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    STATUS_FILTER: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    },
    ACTION_EDIT: "Edit",
    ACTION_REMOVE: "Remove",
    // Toasts
    TOAST: {
      DELETE_SUCCESS: "Category deleted successfully",
      /**
       * Deleting a category **deactivates its live products** (Flow 29 §7 /
       * GA2). The count comes back in `deactivated_products` and is the only
       * place that cascade is reported — a plain "deleted" toast would hide the
       * fact that twelve products just left the catalog.
       */
      DELETE_SUCCESS_CASCADE: (n: number) =>
        `Category deleted. ${n.toLocaleString("en-US")} product${n === 1 ? "" : "s"} deactivated.`,
      DELETE_ERROR: "Failed to delete category",
      ADD_SUCCESS: "Category created successfully",
      ADD_ERROR: "Failed to create category. Please try again.",
      UPDATE_SUCCESS: "Category updated successfully",
      UPDATE_ERROR: "Failed to update category. Please try again.",
      NO_CHANGES: "No changes to save",
      /**
       * Deactivating a category is narrower than it sounds and the copy must not
       * overstate it. The sailor's category list filters on `is_active`, so the
       * tile disappears from browse — but their product list never joins category
       * liveness, so those products stay visible and buyable through search,
       * product listings and saved items. "Off sale" would be false. See C9.
       */
      DEACTIVATED: "Category hidden from browse — its products stay on sale",
      ACTIVATED: "Category is visible in browse again",
      ACTIVE_ERROR: "Failed to change the category's visibility",
    },
    /**
     * Delete confirmation.
     *
     * The weight goes on the **category**, not the product count. Each
     * deactivated product can be switched back on individually; the category
     * cannot be restored at all — there is no restore endpoint — so undoing means
     * re-creating it and re-homing everything. The count is the recoverable half
     * and the alarming-looking number, which is exactly why it comes second.
     *
     * "Up to" is load-bearing: `product_count` includes already-inactive
     * products while the cascade only touches live ones, so the dialog's number
     * is an upper bound and will legitimately exceed the toast's.
     */
    DELETE_CONFIRM: {
      TITLE: "Delete Category",
      MESSAGE: (name: string, productCount: number) =>
        productCount > 0
          ? `“${name}” cannot be restored — there is no undo, and recovering means re-creating it and re-homing its products. Up to ${productCount.toLocaleString("en-US")} product${productCount === 1 ? "" : "s"} will also be deactivated; those can each be switched back on afterwards.`
          : `“${name}” cannot be restored — there is no undo. Nothing is filed under it, so no products are affected.`,
      CONFIRM: "Delete",
      /** Typed to confirm — the category row is the irreversible part. */
      PHRASE: "delete",
    },
    // Add drawer
    ADD: {
      TITLE: "Add New Category",
      SUBTITLE: "Create a new category for your catalog",
      SUBMIT: "Add Category",
      SAVING: "Saving…",
    },
    // Edit drawer
    EDIT: {
      TITLE: "Edit Category",
      SUBTITLE: "Update your category details",
      SUBMIT: "Save Changes",
      SAVING: "Saving…",
    },
    // Drawer section headings
    SECTIONS: {
      BASIC: "Basic Information",
      MEDIA: "Category Media",
      ADDITIONAL: "Additional Settings",
    },
    // Toggle labels
    TOGGLES: {
      ACTIVE: "Active",
    },
  },
  EMERGENCY_CATEGORIES: {
    // Page chrome
    TITLE: "Emergency Categories",
    SUBTITLE: "Organize the marine emergency spares catalog into categories",
    /** `?search=` matches the category **name** only — not the description. */
    SEARCH_PLACEHOLDER: "Search by category name…",
    ADD_CATEGORY: "Add Category",
    FETCH_ERROR: "Failed to fetch emergency categories",
    EMPTY: "No emergency categories found.",
    IMAGE_ALT: "Emergency category",
    ACTIVE_HINT:
      "Hides the category from the customer's browse list. Its spares stay on sale and remain findable by search.",
    /** Scoped to the marine taxonomy and following the list's filters since 2026-08-17. */
    STATS: {
      TOTAL_CATEGORIES: "Total Categories",
      ACTIVE_CATEGORIES: "Active",
      INACTIVE_CATEGORIES: "Inactive",
      /** Assignments active or not — see the general screen's note. */
      EMPTY_CATEGORIES: "No Spares Filed",
    },
    // Table
    COLUMNS: {
      CATEGORY: "Category",
      SCOPE: "Scope",
      PRODUCTS: "Products",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    STATUS_FILTER: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    },
    ACTION_EDIT: "Edit",
    ACTION_REMOVE: "Remove",
    // Toasts
    TOAST: {
      DELETE_SUCCESS: "Emergency category deleted successfully",
      // Same cascade as the general catalog (Flow 29b §12) — live spares in the
      // category are deactivated, and the count is the only report of it.
      DELETE_SUCCESS_CASCADE: (n: number) =>
        `Emergency category deleted. ${n.toLocaleString("en-US")} spare${n === 1 ? "" : "s"} deactivated.`,
      DELETE_ERROR: "Failed to delete emergency category",
      ADD_SUCCESS: "Emergency category created successfully",
      ADD_ERROR: "Failed to create emergency category. Please try again.",
      UPDATE_SUCCESS: "Emergency category updated successfully",
      UPDATE_ERROR: "Failed to update emergency category. Please try again.",
      NO_CHANGES: "No changes to save",
      /** Same narrowness as the general screen — browse only, not sale. See C9. */
      DEACTIVATED: "Category hidden from browse — its spares stay on sale",
      ACTIVATED: "Category is visible in browse again",
      ACTIVE_ERROR: "Failed to change the category's visibility",
    },
    /**
     * Delete confirmation. Weight on the category, which cannot be restored —
     * the deactivated spares can each be switched back on. "Up to" because
     * `product_count` includes already-inactive spares the cascade won't touch.
     */
    DELETE_CONFIRM: {
      TITLE: "Delete Emergency Category",
      MESSAGE: (name: string, productCount: number) =>
        productCount > 0
          ? `“${name}” cannot be restored — there is no undo, and recovering means re-creating it and re-homing its spares. Up to ${productCount.toLocaleString("en-US")} spare${productCount === 1 ? "" : "s"} will also be deactivated; those can each be switched back on afterwards.`
          : `“${name}” cannot be restored — there is no undo. Nothing is filed under it, so no spares are affected.`,
      CONFIRM: "Delete",
      PHRASE: "delete",
    },
    // Add drawer
    ADD: {
      TITLE: "Add New Emergency Category",
      SUBTITLE: "Create a new category for the marine emergency spares catalog",
      SUBMIT: "Add Category",
      SAVING: "Saving…",
    },
    // Edit drawer
    EDIT: {
      TITLE: "Edit Emergency Category",
      SUBTITLE: "Update your emergency category details",
      SUBMIT: "Save Changes",
      SAVING: "Saving…",
    },
    // Drawer section headings
    SECTIONS: {
      BASIC: "Basic Information",
      MEDIA: "Category Media",
      ADDITIONAL: "Additional Settings",
    },
    // Toggle labels
    TOGGLES: {
      ACTIVE: "Active",
    },
  },
  SHIP_AGENTS: {
    // Page chrome
    TITLE: "Ship Agents",
    SUBTITLE: "Manage the global port-side contact directory",
    SEARCH_PLACEHOLDER: "Search by name, company, email, mobile…",
    ADD_AGENT: "Add Agent",
    FETCH_ERROR: "Failed to fetch ship agents",
    EMPTY: "No ship agents found.",
    DASH: "—",
    GLOBAL_DIRECTORY: "Global directory",
    // KPI cards
    STATS: {
      TOTAL: "Total Agents",
      GLOBAL: "Global",
      OWNED: "Sailor-Owned",
    },
    // Table
    COLUMNS: {
      AGENT: "Agent",
      CONTACT: "Contact",
      SCOPE: "Scope",
      OWNER: "Owner",
      ORDERS: "Orders",
      CREATED: "Created",
      ACTIONS: "Actions",
    },
    SCOPE_LABEL: {
      GLOBAL: "Global",
      OWNED: "Owned",
    },
    SCOPE_FILTER: {
      GLOBAL: "Global",
      OWNED: "Sailor-owned",
    },
    ACTION_EDIT: "Edit",
    ACTION_REMOVE: "Delete",
    // Toasts
    TOAST: {
      DELETE_SUCCESS: "Ship agent deleted successfully",
      DELETE_ERROR: "Failed to delete ship agent",
      ADD_SUCCESS: "Ship agent created successfully",
      ADD_ERROR: "Failed to create ship agent. Please try again.",
      UPDATE_SUCCESS: "Ship agent updated successfully",
      UPDATE_ERROR: "Failed to update ship agent. Please try again.",
    },
    // Delete confirmation dialog
    DELETE_CONFIRM: {
      TITLE: "Delete Ship Agent",
      MESSAGE:
        "Are you sure you want to delete this ship agent? Orders already bound to it keep their saved snapshot, but the agent will no longer be selectable.",
      CONFIRM: "Delete",
    },
    // Add drawer
    ADD: {
      TITLE: "Add Ship Agent",
      SUBTITLE: "Create a global agent selectable by every sailor",
      SUBMIT: "Add Agent",
      SAVING: "Saving…",
    },
    // Edit drawer
    EDIT: {
      TITLE: "Edit Ship Agent",
      SUBTITLE: "Update this agent's contact details",
      SUBMIT: "Save Changes",
      SAVING: "Saving…",
    },
    // Drawer section headings
    SECTIONS: {
      BASIC: "Basic Information",
      CONTACT: "Contact Details",
    },
    // Field labels / hints
    FIELDS: {
      NAME: "Agent Name *",
      NAME_PLACEHOLDER: "e.g. Singapore Marine Services",
      COMPANY: "Company",
      COMPANY_PLACEHOLDER: "e.g. SMS Pte Ltd",
      COUNTRY_CODE: "Country Code",
      COUNTRY_CODE_PLACEHOLDER: "+65",
      MOBILE: "Mobile",
      MOBILE_PLACEHOLDER: "9876543210",
      EMAIL: "Email",
      EMAIL_PLACEHOLDER: "ops@example.com",
      CONTACT_HINT: "Provide at least a mobile number or an email so the agent is reachable.",
      GLOBAL_HINT: "Agents created here are global — every sailor can select them at checkout.",
    },
  },
  EXPRESS: {
    // Page chrome
    TITLE: "Express",
    /**
     * The two grains of the express catalog. Products leads — it is the unit the
     * rest of Catalog works in; Items is the SKU view beneath it, and the only
     * one that can show an unflagged variant.
     */
    TABS: {
      PRODUCTS: "Express Products",
      ITEMS: "Express Items",
    },
    /** The orders screen's own title — `TITLE` names the catalog screen. */
    ORDERS_TITLE: "Express Orders",
    /** Express is direct-pay, so payment is a two-state fact, not a funnel. */
    PAYMENT_PAID: "Paid",
    PAYMENT_PENDING: "Awaiting payment",
    /** Server-side shorthand spanning partner_assigned → partially_delivered. */
    STATUS_IN_PROGRESS: "In Progress",
    SEARCH_PLACEHOLDER: "Search express orders…",
    FETCH_ERROR: "Failed to fetch express orders",
    EMPTY: "No express orders found.",
    DASH: "—",
    // KPI cards (express stats aggregates)
    STATS: {
      /**
       * The "All …" prefix these carried was dropped on 2026-08-17, when
       * `express/stats/` started honouring the items filter bar. It explained
       * cards that could not follow the table; they follow it now, so the word
       * would be a claim the number no longer makes.
       */
      PRODUCTS: "Express Products",
      // Plain footers are the loading state; the *_BREAKDOWN forms replace them
      // once the counts arrive, so each card carries its own secondary figures
      // instead of the payload needing a card per field.
      PRODUCTS_FOOTER: "In the express catalog",
      PRODUCTS_BREAKDOWN: (active: string, topRated: string, onDeal: string) =>
        `${active} active · ${topRated} top-rated · ${onDeal} on deal`,
      VARIANTS: "Express Variants",
      VARIANTS_FOOTER: "Across all products",
      VARIANTS_BREAKDOWN: (active: string) => `${active} active`,
      SOURCEABLE: "Sourceable Variants",
      // Spelling out the AND rule: a variant is only orderable when both flags hold.
      SOURCEABLE_FOOTER: "Product and variant both flagged",
      SOURCEABLE_BREAKDOWN: (products: string) => `${products} sourceable products`,
      ORDERS: "Express Orders",
      /**
       * Unpaid express orders. Express is direct-pay, so these are waiting on
       * Stripe rather than on an admin — but they reach no other screen now, so
       * this is the only place the number surfaces.
       */
      AWAITING_PAYMENT: "Awaiting Payment",
      /**
       * The rest of the order breakdown, in lifecycle order.
       *
       * ⚠️ These do **not** partition `total_orders`. The backend's buckets skip
       * `payment_received` — the transient between Stripe's webhook and
       * `order_confirmed` — so the seven sum to at most the total and usually
       * less. Fine as seven independent counts, which is how they are shown;
       * anything treating them as parts of a whole must derive the remainder.
       */
      CONFIRMED: "Confirmed",
      IN_PROGRESS: "In Progress",
      DELIVERED: "Delivered",
      FAILED: "Failed Deliveries",
      CANCELLED: "Cancelled",
      REFUNDED: "Refunded",
    },
    // Express variant catalog tab
    COLUMNS: {
      ORDER: "Order",
      CUSTOMER: "Customer",
      LOCATION: "Port / Anchorage",
      ITEMS: "Items",
      AMOUNT: "Amount",
      FLAGS: "Flags",
      PARTNER: "Partner",
      ARRIVAL: "Ship Arrival",
      STATUS: "Status",
    },
    // The order status filter's labels now come from `lib/orderStatuses.ts`,
    // the single source of truth for all 18 lifecycle statuses — the hand-written
    // set that used to live here held four values `Order.Status` has never had,
    // so choosing one returned 400 instead of filtering.
    // Filter toolbar on the orders tab
    ORDER_FILTERS: {
      DATE_PLACEHOLDER: "Payment date",
      PARTNER_ALL: "Any partner",
      PARTNER_PLACEHOLDER: "Partner",
    },
    // Boolean flag badge labels
    FLAGS: {
      EXPRESS: "Express",
      EMERGENCY: "Emergency",
      FASTEST: "Fastest",
      LOCATION_REQ: "Location Req.",
    },
    // Partner allocation
    UNALLOCATED: "Unallocated",
    // Flow 28 API 12 — partner assignment, from inside the order drawer.
    ASSIGN: {
      SECTION: "Assign Delivery Partner",
      /** Shown instead of the picker while the order is unpaid. */
      AWAITING_PAYMENT:
        "Waiting on payment. A delivery partner can be assigned once the sailor has paid.",
      SECTION_REASSIGN: "Reassign Delivery Partner",
      PARTNER_LABEL: "Delivery partner",
      PARTNER_PLACEHOLDER: "Select a partner",
      PARTNER_LOADING: "Loading partners…",
      PARTNER_EMPTY: "No partners available",
      REASSIGN_HINT: (current: string) =>
        `Currently held by ${current || "another partner"} — assigning takes the order off them.`,
      CONFIRM: "Assign Partner",
      CONFIRM_REASSIGN: "Confirm Reassign",
      ASSIGNING: "Assigning…",
      SELECT_PARTNER: "Select a delivery partner first.",
      ASSIGNED: (partner: string, order: string) => `${partner} assigned to ${order}.`,
      REASSIGNED: (partner: string, order: string) => `${order} reassigned to ${partner}.`,
      FAILED: "Could not assign the delivery partner. Please try again.",
      /**
       * A bare assign on an order someone already holds comes back 409
       * `requires_confirmation`. The drawer stays open and the next click sends
       * `confirm: true`, so this reads as a prompt rather than a dead end.
       */
      NEEDS_CONFIRM: "That order is already held by a partner — confirm again to reassign it.",
    },
    CATALOG: {
      /**
       * Why a row is invisible to sailors. Keys come from
       * `ProductVariant.catalog_visibility_blockers()` and are a **stable,
       * add-only contract** — never renamed — so an unmapped key is rendered raw
       * rather than swallowed. A new backend blocker therefore degrades to an
       * ugly-but-honest label instead of a silently clean row.
       */
      VISIBILITY_BLOCKER: {
        variant_inactive: "Variant is inactive",
        product_inactive: "Product is inactive",
        product_internal: "Internal product — never shown to sailors",
        not_flagged_express: "Not flagged express",
        /**
         * **Not reachable through the API** (confirmed 2026-08-18): flagging
         * requires a price and un-flagging clears it, on every route. A row in
         * this state was written around the API — a shell, a fixture, a seed, a
         * bulk `.update()` — so it is a data anomaly rather than a step in
         * anyone's flow, and the copy says so instead of implying a to-do.
         *
         * `not_flagged_express` above is the one an admin actually produces, by
         * un-flagging a SKU.
         */
        no_express_price: "Flagged express but unpriced — needs investigating",
      } as Record<string, string>,
      VISIBLE: "Visible",
      NOT_VISIBLE: "Not visible",
      /**
       * Visibility and orderability are different questions. A product with
       * sourcing switched off stays **browsable** with an unavailable badge, so it
       * is visible and not orderable — which is why this is its own label and not
       * a blocker.
       */
      NOT_ORDERABLE: "Visible, not orderable",
      VISIBILITY_HELP:
        "Whether a sailor can see this in the express catalog. Sourcing being off does not hide an item — it shows as unavailable.",

      TITLE: "Express Variant Catalog",
      /**
       * Four fields, broader than any other catalog search: product name,
       * product description, SKU **and** the variant's `about_product`. Worth
       * naming, because a match can be invisible in the row — a hit on the
       * description or variant notes shows neither in the name nor the SKU.
       */
      SEARCH_PLACEHOLDER: "Search name, description, SKU or variant notes…",
      EMPTY: "No express items found.",
      FETCH_ERROR: "Failed to fetch the express catalog",
      SORT_PLACEHOLDER: "Sort",
      SORT: {
        NEWEST: "Newest first",
        OLDEST: "Oldest first",
        PRICE_ASC: "Price: low to high",
        PRICE_DESC: "Price: high to low",
        POPULARITY_DESC: "Most popular",
        POPULARITY_ASC: "Least popular",
      },
      FILTERS: {
        // "Not orderable" is the operationally useful one: express checkout
        // rejects a line whose variant fails this gate, so it answers "what
        // would fail at checkout right now?".
        SOURCEABLE_ALL: "Any sourceability",
        SOURCEABLE_YES: "Sourceable",
        SOURCEABLE_NO: "Not orderable",
        ACTIVE_ALL: "Any status",
        ACTIVE_YES: "Active",
        ACTIVE_NO: "Inactive",
        EXPRESS_ALL: "Any express flag",
        EXPRESS_YES: "Flagged express",
        /** The worklist: express-catalog variants nobody has flagged. */
        EXPRESS_NO: "Not flagged express",
      },
      /** Flow 29a §6 — the variant-level express switch and its cascade. */
      EXPRESS_TOGGLE: {
        ON: "Mark express",
        OFF: "Remove express",
        SAVING: "Saving…",
        ON_TITLE: "Mark this variant express?",
        ON_DESCRIPTION: (sku: string) =>
          `${sku} becomes express-orderable. If its product isn't already in the express catalog, it will be moved there — a variant can only be express when its product is.`,
        OFF_TITLE: "Remove express from this variant?",
        OFF_DESCRIPTION: (sku: string) =>
          `${sku} stops being express-orderable. If it is the last express variant on its product, the product leaves the express catalog and reverts to regular or marine emergency, depending on its category.`,
        /**
         * Only used when the write actually moved the product between catalogs
         * — `product_cascaded` says so. Announcing a move on every toggle was
         * wrong for the common case, where the product is already on the express
         * shelf because other variants are flagged.
         */
        DONE: (sku: string, on: boolean, catalogType: string) =>
          `${sku} is ${on ? "now express" : "no longer express"} — its product moved to the ${catalogType} catalog.`,
        /** The flag changed; the product stayed where it was. */
        DONE_NO_MOVE: (sku: string, on: boolean) =>
          `${sku} is ${on ? "now express" : "no longer express"}.`,
        FAILED: "Could not change the express flag. Please try again.",
      },
      COLUMNS: {
        PRODUCT: "Product",
        SKU: "SKU",
        ATTRIBUTES: "Attributes",
        PRICE: "Price",
        EXPRESS: "Express",
        SOURCEABLE: "Sourceable",
        ACTIVE: "Active",
        /** The consequence column — what all the flags add up to for a sailor. */
        VISIBILITY: "Sailor visibility",
        ACTIONS: "Actions",
      },
      IMAGE_ALT: "Variant image",
      YES: "Yes",
      NO: "No",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      /**
       * The variant-level express flag. The list is scoped by the parent
       * product's catalog type, so a row can sit in the express catalog without
       * being express-orderable itself — this column is what makes that visible.
       */
      EXPRESS_ON: "Express-ready",
      EXPRESS_OFF: "Product only",
      /** Flagged but unpriced, or never flagged — either way, unsellable. */
      EXPRESS_PENDING: "Pending price",
      EXPRESS_PENDING_HINT:
        "On the express shelf but not sellable: the express cart refuses it until it has an express price.",
      EXPRESS_PRICE: (price: number) => `$${price.toFixed(2)}`,
      EXPRESS_SET_TITLE: "Set an express price",
      EXPRESS_RETITLE: "Change the express price",
      /** The product's default SKU — the target of a product-level price edit. */
      PRIMARY: "Primary",
      EXPRESS_OFF_HINT:
        "In an express product, but this variant is not flagged for express ordering.",
    },
    // Table
  },
  VERIFICATION: {
    // Page chrome
    TITLE: "Product Verifications",
    DASH: "—",
    // KPI cards
    STATS: {
      IN_VERIFICATION: "In Verification",
      IN_VERIFICATION_FOOTER: "Currently active",
      VERIFIED_TODAY: "Verified Today",
      VERIFIED_TODAY_FOOTER: "Reports submitted",
      UNAVAILABLE: "Unavailable Items",
      UNAVAILABLE_FOOTER: "Action needed",
      SUBSTITUTIONS: "Substitutions",
      SUBSTITUTIONS_FOOTER: "Awaiting approval",
    },
    SEARCH_PLACEHOLDER: "Search order number or partner…",
    ALL_STATUS: "Pending review",
    // Order-status scopes for the queue (`order_status` query param).
    STATUS_FILTER: {
      SUBMITTED: "Pending review",
      SOURCING: "Sourcing",
      CONFIRMED: "Confirmed",
    },
    // Reports table
    TABLE: {
      TITLE: "Verification Reports",
      EMPTY: "No verification reports found.",
      COLUMNS: {
        ENQ: "ENQ",
        PARTNER: "Partner",
        SHOP: "Shop",
        TOTAL: "Total Items",
        AVAILABLE: "Available",
        UNAVAILABLE: "Unavailable",
        STATUS: "Status",
        ACTION: "Action",
      },
      SUGGEST: "Suggest Substitute",
      NO_ACTION: "No action needed",
      VIEW_ROUNDS: "View rounds",
    },
    // Re-verification rounds drawer (Flow 06 APIs 7 + 8)
    ROUNDS: {
      TITLE: "Verification Rounds",
      SUBTITLE: (enq: string) => `All reports submitted for ${enq}`,
      EMPTY: "No reports have been submitted for this order yet.",
      FETCH_ERROR: "Failed to load verification rounds.",
      ROUND: (n: number) => `Round ${n}`,
      SUBMITTED: "Submitted",
      REVIEWED: "Reviewed",
      PARTNER: "Partner",
      ITEMS: "Items",
      NO_ITEMS: "This report has no line items.",
      COLUMNS: {
        ITEM: "Item",
        REQUESTED: "Requested",
        AVAILABLE: "Available",
        SHORTFALL: "Shortfall",
        REMARK: "Remark",
      },
      AVAILABLE_YES: "Available",
      AVAILABLE_NO: "Unavailable",
      MARK_REVIEWED: "Mark reviewed",
      ALREADY_REVIEWED: "Reviewed",
      // The API's own words: this is a bookkeeping flag, so say so in the UI
      // rather than implying it advances the order.
      REVIEW_NOTE:
        "Marking a report reviewed only records that you have seen it — it does not advance the order or release billing.",
      REVIEWED_TOAST: "Report marked as reviewed",
      REVIEW_ERROR: "Failed to mark the report as reviewed",
    },
    // Item-detail panel (active check)
    ITEMS: {
      TITLE: (enq: string) => `${enq} — Item Detail`,
      PDF: "PDF Report",
      PDF_DONE: "PDF report downloaded",
      NOTIFY: "Notify Sailor",
      NOTIFY_DONE: "Sailor notified of item checks",
      FIND_ALT: "Find Alt",
      STATUS: {
        AVAILABLE: "Available",
        UNAVAILABLE: "Unavailable",
        SUB_SUGGESTED: "Sub suggested",
      },
    },
    // Suggest-substitute dialog
    DIALOG: {
      TITLE: "Suggest Substitute",
      ITEM: (name: string) => `Item: ${name}`,
      UNAVAILABLE_LABEL: "Unavailable Item",
      UNAVAILABLE_NOTE: (shop: string) => `Partner confirmed out of stock at ${shop}`,
      NAME_LABEL: "Substitute Product Name",
      NAME_PLACEHOLDER: "Search substitute product…",
      PRICE_LABEL: "Price Difference",
      PRICE: {
        SAME: "Same Price",
        INCREASE: "Price Increase",
        DECREASE: "Price Decrease",
      },
      SEND: "Send Suggestion",
      SENT: (name: string) => `Substitute suggestion "${name}" sent to sailor`,
      NAME_REQUIRED: "Please enter a substitute product name",
    },
  },
  // Promotion surfaces beyond coupons + loyalty: Deal of the Day, bonus-point
  // grants, per-user coupon assignments and the redemption report.
  PROMOTION: {
    TABS: {
      OVERVIEW: "Loyalty & Coupons",
      DEALS: "Deal of the Day",
      BONUS: "Bonus Points",
      ASSIGNMENTS: "Coupon Assignments",
      REPORT: "Coupon Report",
    },
    DASH: "—",
    DEALS: {
      TITLE: "Deal of the Day",
      ADD: "Create Deal",
      EMPTY: "No deals scheduled.",
      FETCH_ERROR: "Failed to load deals.",
      TODAY_TITLE: "Live today",
      TODAY_EMPTY: "No deals are live right now.",
      /**
       * The five buckets the stats endpoint returns, each drilling into the
       * list via `?status=`. Named for the API's own keys: "Expired" is the
       * window having closed, "Inactive" is an admin having switched the deal
       * off — a deal can be either, which is why they are separate counts.
       */
      STATS: {
        TOTAL: "Total Deals",
        TOTAL_FOOTER: "All time",
        ACTIVE: "Active Now",
        ACTIVE_FOOTER: "Currently running",
        UPCOMING: "Scheduled",
        UPCOMING_FOOTER: "Scheduled ahead",
        EXPIRED: "Expired",
        EXPIRED_FOOTER: "Past their window",
        INACTIVE: "Inactive",
      },
      SEARCH_PLACEHOLDER: "Search product or SKU…",
      /** Heads the status filter strip. Not "stats" — the counts overlap. */
      STATUS_FILTER_LABEL: "STATUS",
      COLUMNS: {
        PRODUCT: "Product",
        VARIANT: "Variant",
        ORIGINAL: "Was",
        PRICE: "Deal Price",
        DISCOUNT: "Off",
        WINDOW: "Window",
        ACTIVE: "Active",
        ACTIONS: "Actions",
      },
      FORM: {
        ADD_TITLE: "Create Deal",
        EDIT_TITLE: "Edit Deal",
        PRODUCT: "Product",
        PRODUCT_PLACEHOLDER: "Select a product",
        // One page of products is 50 server-side; search reaches the rest.
        PRODUCT_SEARCH_PLACEHOLDER: "Search products by name…",
        VARIANT: "Variant",
        VARIANT_PLACEHOLDER: "Select a variant",
        // A deal prices one SKU, so the variant is not optional.
        VARIANT_HINT: "A deal prices one specific variant, not the whole product.",
        PRICE: "Deal Price",
        PRICE_PLACEHOLDER: "0.00",
        /**
         * The API refuses a deal price that is not **below** the variant's own,
         * and that price was nowhere on this form — so the ceiling was
         * discovered by being rejected. Stated, not enforced: the rule belongs
         * to the server.
         */
        PRICE_CEILING: (was: string) => `Must be below ${was} — the variant's price`,
        TERMS: "Terms & Conditions",
        TERMS_PLACEHOLDER: "e.g. Available today only",
        START: "Start Date",
        END: "End Date",
        SAVE: "Save Deal",
        CANCEL: "Cancel",
      },
      VALIDATION: {
        PRODUCT_REQUIRED: "Select a product.",
        VARIANT_REQUIRED: "Select a variant.",
        PRICE_INVALID: "Enter a deal price greater than 0.",
        START_REQUIRED: "Pick a start date.",
        END_REQUIRED: "Pick an end date.",
        END_BEFORE_START: "The end date must be on or after the start date.",
      },
      CONFIRM_DELETE: {
        TITLE: "Delete deal?",
        MESSAGE: (product: string) => `The deal on ${product} will be removed.`,
        CONFIRM: "Delete",
      },
      TOAST: {
        CREATED: "Deal created",
        CREATE_ERROR: "Failed to create the deal",
        UPDATED: "Deal updated",
        UPDATE_ERROR: "Failed to update the deal",
        DELETED: "Deal deleted",
        DELETE_ERROR: "Failed to delete the deal",
        TOGGLED: "Deal updated",
        TOGGLE_ERROR: "Failed to update the deal",
      },
    },
    BONUS: {
      TITLE: "Bonus Points",
      ADD: "Grant Points",
      EMPTY: "No bonus points granted yet.",
      FETCH_ERROR: "Failed to load bonus points.",
      SEARCH_PLACEHOLDER: "Search name or email…",
      /**
       * Grant-form choices. `ALL` went with the list filter that used it: the
       * endpoint has no `?type=`, and a row is a user holding both balances, so
       * there was no filtered view to offer.
       */
      TYPE_FILTER: {
        LOYALTY: "Loyalty",
        REFERRAL: "Referral",
      },
      COLUMNS: {
        USER: "Sailor",
        EMAIL: "Email",
        // The endpoint annotates each user with both balances plus their sum,
        // so the type dimension is two columns rather than one badge.
        REFERRAL: "Referral",
        LOYALTY: "Loyalty",
        POINTS: "Total",
        ACTIONS: "Actions",
      },
      HISTORY: {
        TITLE: "Point History",
        SUBTITLE: (name: string) => `Ledger for ${name}`,
        EMPTY: "No point activity recorded.",
        FETCH_ERROR: "Failed to load the point history.",
        COLUMNS: {
          DATE: "Date",
          TYPE: "Type",
          POINTS: "Points",
          REASON: "Reason",
        },
      },
      FORM: {
        TITLE: "Grant Bonus Points",
        USER: "Sailor",
        USER_PLACEHOLDER: "Select a sailor",
        // The picker shows one page; the API caps a page at 50, so search is how
        // an admin reaches a sailor beyond it.
        USER_SEARCH_PLACEHOLDER: "Search by name or email…",
        TYPE: "Type",
        POINTS: "Points",
        POINTS_PLACEHOLDER: "e.g. 100",
        SAVE: "Grant Points",
        CANCEL: "Cancel",
      },
      VALIDATION: {
        USER_REQUIRED: "Select a sailor.",
        POINTS_INVALID: "Enter a whole number of points greater than 0.",
      },
      ACTIONS: {
        HISTORY: "View history",
        CLEAR: "Clear points",
      },
      CONFIRM_CLEAR: {
        TITLE: "Clear bonus points?",
        // Deletion keys on the user, so it wipes the whole balance.
        MESSAGE: (name: string) => `All bonus points for ${name} will be removed.`,
        CONFIRM: "Clear",
      },
      TOAST: {
        GRANTED: "Bonus points granted",
        GRANT_ERROR: "Failed to grant bonus points",
        CLEARED: "Bonus points cleared",
        CLEAR_ERROR: "Failed to clear bonus points",
      },
    },
    ASSIGNMENTS: {
      TITLE: "Coupon Assignments",
      ADD: "Assign Coupon",
      EMPTY: "No coupons have been assigned to individual sailors.",
      FETCH_ERROR: "Failed to load coupon assignments.",
      /**
       * No Sailor column and no Used column: this endpoint returns the user's
       * id and email, the coupon's id and code, and `assigned_at`. Redemption
       * state lives on `CouponUsage`, which it does not join.
       */
      COLUMNS: {
        EMAIL: "Sailor",
        COUPON: "Coupon",
        ASSIGNED: "Assigned",
        ACTIONS: "Actions",
      },
      FORM: {
        TITLE: "Assign a Coupon",
        USER: "Sailor",
        USER_PLACEHOLDER: "Select a sailor",
        USER_SEARCH_PLACEHOLDER: "Search by name or email…",
        COUPON: "Coupon",
        COUPON_PLACEHOLDER: "Select a coupon",
        SAVE: "Assign",
        CANCEL: "Cancel",
      },
      VALIDATION: {
        USER_REQUIRED: "Select a sailor.",
        COUPON_REQUIRED: "Select a coupon.",
      },
      CONFIRM_REMOVE: {
        TITLE: "Remove assignment?",
        MESSAGE: (code: string) => `${code} will no longer be available to this sailor.`,
        CONFIRM: "Remove",
      },
      TOAST: {
        ASSIGNED: "Coupon assigned",
        ASSIGN_ERROR: "Failed to assign the coupon",
        REMOVED: "Assignment removed",
        REMOVE_ERROR: "Failed to remove the assignment",
      },
    },
    REPORT: {
      TITLE: "Coupon Redemption Report",
      SEARCH_PLACEHOLDER: "Search coupon code…",
      EMPTY: "No redemption data yet.",
      FETCH_ERROR: "Failed to load the coupon report.",
      UNLIMITED: "Unlimited",
      COLUMNS: {
        CODE: "Code",
        TITLE: "Title",
        DISCOUNT: "Discount",
        APPLICABLE: "Applicable To",
        USED: "Times Used",
        TOTAL_DISCOUNT: "Total Discount",
        REVENUE: "Revenue Impact",
        STATUS: "Status",
      },
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    },
  },
  REWARDS: {
    TITLE: "Rewards & Coupons",
    SUBTITLE: "Loyalty · Referrals · Coupons",
    CREATE_COUPON: "Create Coupon",
    EDIT_COUPON: "Edit Coupon",
    CONFIGURE_POINTS: "Configure Points",
    POINTS_SAVED: "Loyalty points configuration saved",
    POINTS_SAVE_ERROR: "Failed to save the points configuration. Please try again.",
    // Loyalty points configuration drawer
    CONFIG: {
      TITLE: "Configure Loyalty Points",
      SUBTITLE: "Set how many points sailors earn and what each point is worth.",
      SECTION: "Points Rules",
      POINTS_PER_DELIVERY: "Points Per Delivery",
      POINTS_PER_DELIVERY_HINT: "Awarded for each completed delivery.",
      POINTS_PER_REFERRAL: "Points Per Referral",
      POINTS_PER_REFERRAL_HINT: "Awarded for each successful referral.",
      POINT_VALUE: "Point Value ($)",
      POINT_VALUE_HINT: "Cash value of a single point.",
      UPDATED_AT: "Last Updated",
      UPDATED_AT_HINT: "Not sent — updated automatically on save.",
    },
    ADD: "Add",
    EXPORT: "Export",
    EXPORTED: "Exported activity log",
    COUPON_CREATED: (code: string) => `Coupon ${code} created successfully`,
    COUPON_UPDATED: (code: string) => `Coupon ${code} updated successfully`,
    COUPON_DELETED: (code: string) => `Coupon ${code} has been deleted`,
    COUPON_DELETE_ERROR: "Failed to delete the coupon. Please try again.",
    COUPON_CREATE_ERROR: "Failed to create the coupon. Please try again.",
    COUPON_UPDATE_ERROR: "Failed to update the coupon. Please try again.",
    COUPON_REQUIRED: "Code and discount are required",
    EMPTY: "No coupons found",
    // Loyalty program overview (static — no backend endpoint yet)
    LOYALTY: {
      TITLE: "Loyalty Program Overview",
      POINTS_ISSUED: "Total Points Issued",
      TOTAL_VALUE: "Total Value",
      POINTS_REDEEMED: "Points Redeemed",
      ACTIVE_USERS: "Active Loyalty Users",
      RULES: "Program Rules",
      RULE_DELIVERY: "Per delivery completed",
      RULE_REFERRAL: "Successful referral",
      RULE_REDEMPTION: "Redemption rate",
    },
    // Active coupons list
    COUPONS: {
      TITLE: "Active Coupons",
      ACTIVE: "Active",
      USES: (n: number) => `${n} uses`,
      EXPIRES: (date: string) => `Expires ${date}`,
    },
    // Coupons table (same data as the Active Coupons cards, tabular view)
    TABLE: {
      TITLE: "All Coupons",
      SEARCH_PLACEHOLDER: "Search code or title…",
      EMPTY: "No coupons found",
      COLUMNS: {
        CODE: "Code",
        DISCOUNT: "Discount",
        REQUIREMENT: "Requirement",
        USES: "Uses",
        EXPIRES: "Expires",
        STATUS: "Status",
      },
    },
    // Coupon add/edit drawer
    FORM: {
      ADD_TITLE: "Create Discount Coupon",
      EDIT_TITLE: "Edit Coupon Details",
      ADD_SUBTITLE: "Set up a new discount code for sailors.",
      EDIT_SUBTITLE: "Update this coupon's discount, limits and expiry.",
      // Section dividers
      SECTIONS: {
        BASIC: "Basic Information",
        DISCOUNT: "Discount",
        VALIDITY: "Validity",
        LIMITS: "Usage Limits",
      },
      CODE: "Coupon Code",
      CODE_PLACEHOLDER: "e.g. SHIP10",
      TITLE_FIELD: "Title",
      TITLE_PLACEHOLDER: "e.g. Flat $500 Off",
      DESCRIPTION: "Description",
      DESCRIPTION_PLACEHOLDER: "Short description shown to sailors",
      IMAGE: "Image Path",
      IMAGE_PLACEHOLDER: "coupon_images/example.png",
      DISCOUNT_TYPE: "Discount Type",
      APPLIES_TO: "Applies To",
      DISCOUNT_VALUE: "Discount Value",
      DISCOUNT_VALUE_PLACEHOLDER: "e.g. 500",
      MIN_PURCHASE: "Minimum Purchase ($)",
      MIN_PURCHASE_PLACEHOLDER: "e.g. 2000 (0 for none)",
      VALID_FROM: "Valid From",
      VALID_TO: "Valid To",
      USAGE_LIMIT: "Total Usage Limit",
      USAGE_LIMIT_PLACEHOLDER: "Blank = unlimited",
      PER_USER_LIMIT: "Per-User Limit",
      IS_PUBLIC: "Public coupon",
      IS_ACTIVE: "Active",
      // Select options (values map 1:1 to the API enums)
      DISCOUNT_TYPES: {
        FIXED: "Fixed amount",
        PERCENTAGE: "Percentage",
        FREE_SHIPPING: "Free shipping",
      },
      APPLIES_OPTIONS: {
        ORDER_TOTAL: "Order total",
        DELIVERY: "Delivery",
        ITEMS: "Items",
      },
      DELETE_TITLE: "Delete Coupon",
      DELETE_MESSAGE: (code: string) => `Delete coupon "${code}"? This cannot be undone.`,
    },
  },
  SPARES: {
    // Page chrome
    TITLE: "Marine Emergency Spares",
    /** `?search=` matches the product **name** only — not description or SKU. */
    SEARCH_PLACEHOLDER: "Search by product name…",
    EMPTY: "No marine emergency products match the current filters.",
    /**
     * A spare with no variants is not misconfigured — it is **invisible**.
     * `browsable_products_qs` requires at least one live variant, so it never
     * reaches a sailor-facing list, cannot be carted, and raises no error. The
     * admin table is the only place it appears at all, which is why the count
     * gets a warning here rather than a quiet "0".
     */
    NO_VARIANTS: "No variants — not visible to sailors",
    FETCH_ERROR: "Failed to load marine emergency products.",
    ADD_PRODUCT: "Add Spare",
    ALL_CATEGORIES: "All Categories",
    // KPI cards — one per field on the emergency-spare stats response.
    STATS: {
      TOTAL: "Total Products",
      TOTAL_FOOTER: "All marine emergency products",
      ACTIVE: "Active",
      ACTIVE_FOOTER: "Available to sailors",
      TOP_RATED: "Top Rated",
      TOP_RATED_FOOTER: "Flagged as top rated",
      ON_DEAL: "On Deal",
      ON_DEAL_FOOTER: "Currently discounted",
    },
    ACTIONS: {
      VIEW: "View",
      EDIT: "Edit",
      DELETE: "Delete",
    },
    // Add / edit drawer
    FORM: {
      ADD_TITLE: "Add Marine Emergency Spare",
      ADD_SUBTITLE: "Create a product in the marine emergency catalogue",
      EDIT_TITLE: "Edit Marine Emergency Spare",
      EDIT_SUBTITLE: "Update this spare's details",
      SECTION_BASIC: "Basic Information",
      SECTION_MEDIA: "Media",
      SECTION_FLAGS: "Availability",
      NAME: "Product Name *",
      NAME_PLACEHOLDER: "e.g. Marine Fuel Injection Pump",
      DESCRIPTION: "Description *",
      DESCRIPTION_PLACEHOLDER: "Describe the spare, its use and compatibility…",
      CATEGORY: "Category *",
      CATEGORY_PLACEHOLDER: "Select a marine emergency category",
      CATEGORY_EMPTY: "No marine emergency categories available",
      CATEGORY_HINT: "Only marine emergency categories are accepted",
      BASE_PRICE: "Base Price *",
      BASE_PRICE_PLACEHOLDER: "0.00",
      SKU: "SKU *",
      SKU_PLACEHOLDER: "e.g. MAR-PUMP-001",
      /**
       * The consequence, not the mechanism. An admin who skips this does not get
       * an error — they get a spare that no sailor can ever see, which for
       * emergency stock is the failure that matters.
       */
      SKU_HINT:
        "Creates the spare's first variant, priced at the base price. Without one the spare is invisible to sailors.",
      IMAGES: "Image Paths",
      IMAGES_HINT: "Stored image paths/keys (e.g. product_images/pump.png) — not file uploads.",
      IMAGE_PLACEHOLDER: "product_images/example.png",
      IMAGE_ADD: "Add Image",
      IMAGE_EMPTY: "No images yet — add one below.",
      ADMIN_SOURCEABLE: "Admin Sourceable",
      ADMIN_SOURCEABLE_HINT: "Admins may source this item on a sailor's behalf",
      TOP_RATED: "Top Rated",
      TOP_RATED_HINT: "Highlighted in the marine emergency catalogue",
      IS_ACTIVE: "Active",
      IS_ACTIVE_HINT: "Inactive spares are hidden from sailors",
      SAVE: "Save Spare",
      SAVING: "Saving…",
      UPDATE: "Update Spare",
      UPDATING: "Updating…",
    },
    // Delete confirmation
    /**
     * Same terminal semantics as a product delete — a spare **is** a Product
     * with `catalog_type=marine_emergency`. Soft-deleted with no restore
     * endpoint, and every admin queryset filters deleted rows, so it removes
     * itself from every screen that could show what happened. The Status switch
     * is the reversible action; the copy points there.
     */
    DELETE_DIALOG: {
      TITLE: "Delete this spare?",
      DESCRIPTION: (name: string) =>
        `“${name}” and all of its variants are removed from every admin screen, and this cannot be undone — there is no restore. To take it out of service but keep the record, switch it to inactive in the Status column instead.`,
      CONFIRM: "Delete",
      DELETING: "Deleting…",
      PHRASE: "delete",
    },
    TOAST: {
      ADDED: "Spare added to the marine emergency catalogue",
      ADD_ERROR: "Failed to add the spare",
      UPDATED: "Spare updated",
      UPDATE_ERROR: "Failed to update the spare",
      NO_CHANGES: "No changes to save",
      DELETED: "Spare deleted",
      DELETE_ERROR: "Failed to delete the spare",
      ACTIVATED: "Spare is now active",
      DEACTIVATED: "Spare deactivated — it can no longer be ordered",
      ACTIVE_ERROR: "Failed to change the spare's status",
    },
    // Table columns
    COLUMNS: {
      PRODUCT: "Product",
      CATEGORY: "Category",
      PRICE: "Base Price",
      VARIANTS: "Variants",
      TYPE: "Type",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    // Detail drawer
    DETAIL: {
      TITLE: "Marine Emergency Product",
      FALLBACK: "-",
      LOADING: "Loading data...",
      FETCH_ERROR: "Failed to load the spare's details.",
      RETRY: "Retry",
      EMPTY: "No details available for this product.",
      OVERVIEW: "Product Overview",
      NAME: "Name",
      CATEGORY: "Category",
      DETAILS: "Details",
      DESCRIPTION: "Description",
      PRICE: "Base Price",
      VARIANTS: "Variants",
      PURCHASES: "Purchases",
      TYPE: "Catalog Type",
      STATUS: "Status",
      CREATED: "Created",
      UPDATED: "Last Updated",
      ADMIN_SOURCEABLE: "Admin Sourceable",
      TOP_RATED: "Top Rated",
      PORTS: "Stocked Ports",
      IMAGES: "Images",
      NO_IMAGE: "No image provided",
      YES: "Yes",
      NO: "No",
      ACTIVE: "Active",
      INACTIVE: "Inactive",
      EDIT: "Edit",
      CLOSE: "Close",
    },
  },
  ASSIGNMENTS: {
    // Page chrome
    TITLE: "Order Assignments",
    NEW_ASSIGNMENT: "New Assignment",
    // Active assignments table
    ACTIVE: {
      TITLE: "Active Assignments",
      EMPTY: "No active assignments.",
      FETCH_ERROR: "Failed to load active assignments.",
      REASSIGN: "Reassign partner",
      COLUMNS: {
        ENQ: "ENQ",
        PARTNER: "Partner",
        ORDER: "Order",
        SHOP: "Shop",
        DELIVER_TO: "Deliver To",
        JOB: "Job",
        STATUS: "Status",
        ETA: "ETA",
      },
      /**
       * What kind of work the assignment is (Flow 28, 2026-08-03). Verify jobs
       * are stamped `verifying` and then `verified`; before that every
       * assignment of either kind read `assigned` and the two were
       * indistinguishable on this board.
       */
      JOB_KIND: {
        VERIFY: "Verification",
        DELIVER: "Delivery",
        // `rejected` / `reassigned` / `cancelled` overwrite the verify statuses,
        // so a closed row genuinely cannot say which kind of job it was — shown
        // as unknown rather than guessed.
        UNKNOWN: "—",
      },
    },
    // Unassigned orders panel
    UNASSIGNED: {
      TITLE: "Unassigned Orders",
      URGENT: (n: number) => `${n} urgent`,
      EMPTY: "No unassigned orders.",
      ASSIGN: "Assign",
    },
    // Assign-partner drawer
    DRAWER: {
      TITLE: "Assign Delivery Partner",
      SUBTITLE: (id: string) => `Order ID: ${id}`,
      SELECT_PARTNER: "Select Partner",
      DELIVERY_DATE: "Delivery Date",
      CONFIRM: "Assign Partner",
      ASSIGNING: "Assigning…",
      SELECT_REQUIRED: "Please select a partner",
      PARTNERS_EMPTY: "No delivery partners available",
      ASSIGNED: (partner: string, order: string) =>
        `Partner ${partner} assigned successfully to ${order}`,
      ASSIGN_ERROR: "Failed to assign the order. Please try again.",
    },
  },
  GIFTS: {
    TITLE: "Surprise Gifts",
    DASH: "—",
    CONFIGURE: "Programme Settings",
    SEARCH_PLACEHOLDER: "Search vessel name or IMO…",
    EMPTY: "No vessels currently qualify.",
    // A vessel below min_orders isn't hidden by a filter — it is out of scope
    // entirely and the API 404s it, so an empty list needs explaining.
    EMPTY_HINT: (min: number) =>
      `A vessel joins this list once it has at least ${min} live giftable orders.`,
    FETCH_ERROR: "Failed to load vessels.",
    // Reads keep working while the switch is off so the screen stays visible;
    // only the writes that move goods are refused.
    PROGRAM_OFF:
      "The surprise gift programme is switched off. You can browse, but granting and revoking are disabled until it's turned back on.",
    STATS: {
      SHIPS: "Vessels Qualifying",
      SAILORS: "Sailors In Scope",
      GIFTED: "Sailors Gifted",
      // The actionable number: who could still be gifted on a qualifying vessel.
      AWAITING: "Awaiting Decision",
    },
    COLUMNS: {
      VESSEL: "Vessel",
      PORT_CALL: "Port Call",
      CREW: "Crew Activity",
      GIFTED: "Gift Progress",
      VALUE: "Live Value",
      ACTIONS: "",
    },
    // Orders and distinct sailors differ often — one sailor placing four orders
    // is not a crew, and the admin needs to see that before granting.
    CREW_ORDERS: (n: number) => `${n} order${n === 1 ? "" : "s"}`,
    CREW_SAILORS: (n: number) => `${n} sailor${n === 1 ? "" : "s"}`,
    GIFTED_RATIO: (gifted: number, total: number) => `${gifted} of ${total}`,
    // The window is the whole decision: the gift rides an order that has to be
    // delivered before the vessel sails.
    PORT_WINDOW: (from: string, to: string) => `${from} → ${to}`,
    SAILS_TODAY: "Sails today",
    SAILS_IN: (days: number) => `Sails in ${days}d`,
    SAILED: "Departed",
    SAILS_SOON_TITLE:
      "This vessel sails soon — a gift has to reach the sailor before the order is delivered.",
    BADGE_HISTORY: "Gifted before",
    BADGE_HISTORY_TITLE:
      "This crew was gifted on an earlier call. Judgment aid only — it blocks nothing.",
    BADGE_DISMISSED: "Dismissed",
    FILTERS: {
      GIFT_STATUS_PLACEHOLDER: "Gift state",
      // Explicit clear option — without one the filter can be set but never
      // unset, since a placeholder isn't selectable once a value is chosen.
      GIFT_STATUS_ANY: "Any gift state",
      GIFT_STATUS_NONE: "None gifted",
      GIFT_STATUS_PARTIAL: "Partly gifted",
      GIFT_STATUS_ALL: "All gifted",
      ORDERING_PLACEHOLDER: "Sort",
      ORDERING_ARRIVAL: "Arriving soonest",
      ORDERING_ARRIVAL_DESC: "Arriving latest",
      ORDERING_ORDERS: "Most orders",
      VISIBILITY_PLACEHOLDER: "Visibility",
      VISIBILITY_ACTIVE: "Active vessels",
      VISIBILITY_ALL: "Include dismissed",
    },
    ACTION_DISMISS: "Dismiss",
    ACTION_UNDISMISS: "Restore",
    // Gifting is a ship-level operation: one action per vessel, never per order.
    ACTION_GRANT: "Gift Whole Ship",
    ACTION_REVOKE: "Revoke Gift",
    ACTION_GRANTING: "Granting…",
    ACTION_REVOKING: "Revoking…",
    TOAST: {
      DISMISS_SUCCESS: "Vessel dismissed.",
      DISMISS_ERROR: "Failed to dismiss the vessel.",
      UNDISMISS_SUCCESS: "Vessel restored.",
      UNDISMISS_ERROR: "Failed to restore the vessel.",
    },
    CONFIG: {
      TITLE: "Programme Settings",
      SUBTITLE: "Two settings, because two settings is all that changes anything.",
      ENABLED: "Programme enabled",
      ENABLED_HINT:
        "When off, the screen stays browsable but granting and revoking are refused, and the hourly admin nudge stops.",
      MIN_ORDERS: "Minimum live orders",
      MIN_ORDERS_HINT:
        "Live giftable orders a vessel needs before it appears at all. Minimum 2 — the scheme is about several sailors on one vessel.",
      MIN_ORDERS_ERROR: "Must be at least 2.",
      SUBMIT: "Save Settings",
      SAVING: "Saving…",
      SUCCESS: "Programme settings saved.",
      ERROR: "Failed to save the settings.",
    },
    DETAIL: {
      TITLE: "Vessel",
      SUBTITLE: "Sailors on this vessel, with their live orders beneath each one.",
      // Split into a work queue and a done pile: the admin's question is "who
      // is left", and a flat roster makes them work that out for themselves.
      SECTION_AWAITING: (n: number) => `Awaiting a decision · ${n}`,
      SECTION_GIFTED: (n: number) => `Already gifted · ${n}`,
      NO_SAILORS: "No sailors with live giftable orders.",
      ALL_GIFTED: "Every sailor on this vessel has been gifted.",
      // The whole-ship grant rides each sailor's earliest-arriving order, so
      // naming that order up front says what the bulk button will actually do.
      AUTO_PICK: "Auto-pick",
      AUTO_PICK_TITLE:
        "The whole-ship grant would put this sailor's gift on this order — their earliest arrival.",
      SUMMARY_SAILORS: "Sailors",
      SUMMARY_ORDERS: "Live orders",
      SUMMARY_AWAITING: "Not yet gifted",
      SUMMARY_COVERAGE: "Gift coverage",
      // Column headers for a sailor's order list. Repeated per sailor so no
      // value is ever an unlabelled figure the reader has to decode.
      ORDER_COLS: {
        ORDER: "Order",
        VALUE: "Value",
        PORT: "Port",
        ARRIVES: "Arrives",
        DEPARTS: "Departs",
      },
      // Always the same facts, whether or not the sailor holds a gift — the
      // secondary line used to swap meaning between states.
      SAILOR_META: (orders: number, value: string) =>
        `${orders} live order${orders === 1 ? "" : "s"} · $${value} total`,
      GIFT_LINE_LABEL: "Gift",
      GIFT_ON_ORDER: (orderNumber: string) => `on ${orderNumber}`,
      GIFT_UNKNOWN_CARRIER: "carrier order no longer live",
      FETCH_ERROR: "Failed to load this vessel.",
      GRANT_SHIP: "Gift the whole ship",
      GRANTING: "Granting…",
      // Re-runnable by design: it fills in sailors who have joined since.
      GRANT_SHIP_HINT:
        "Grants one gift per not-yet-gifted sailor, riding their earliest-arriving order. Safe to run again as more of the crew orders.",
      REVOKE_SHIP_TITLE: "Revoke this ship's gifts?",
      REVOKE_SHIP_HINT:
        "Every gift on this vessel is taken back and those sailors become giftable again. They are not notified — they were never told what the gift was.",
      REVOKE_SHIP_SUBMIT: "Revoke All Gifts",
      // The API has no ship-level revoke, so the screen walks each carrier
      // order. A partial failure has to be reported as one, not swallowed.
      REVOKE_SHIP_DONE: (n: number) => `Revoked ${n} gift(s).`,
      REVOKE_SHIP_PARTIAL: (ok: number, failed: number) =>
        `Revoked ${ok}, but ${failed} could not be revoked — reopen the vessel to see which.`,
      REVOKE_SHIP_NONE: "No gifts to revoke on this vessel.",
      GRANT_CONFIRM_TITLE: "Gift this whole ship?",
      GRANT_CONFIRM_MESSAGE: (n: number) =>
        `Up to ${n} sailor(s) will each receive one gift. Sailors who already hold one are skipped, never given a second.`,
      SAILOR_ORDERS: (n: number) => `${n} order${n === 1 ? "" : "s"}`,
      PREVIOUSLY_GIFTED: (n: number) => `Gifted ${n}× on earlier calls`,
      GIFT_HELD: "Gift granted",
      GIFT_BY: (who: string, when: string) => `by ${who} · ${when}`,
      GIFT_CARRIER: "Carries the gift",
      GIFT_SOURCE_BULK: "Whole-ship grant",
      GIFT_SOURCE_MANUAL: "Chosen order",
      HANDOVER_PENDING: "Awaiting handover",
      HANDOVER_DELIVERED: "Handed over",
      NO_ORDERS: "No live orders.",
      GRANT_ORDER: "Gift this order",
      REVOKE: "Revoke gift",
      REVOKING: "Revoking…",
      // The cutoff is items_collected: once the partner has the parcel the gift
      // is physically gone and the system must not pretend otherwise.
      REVOKE_TITLE: "Revoke this gift?",
      REVOKE_HINT:
        "The sailor becomes giftable again, so you can move the gift to another order. They are not notified — they were never told what the gift was.",
      REVOKE_REASON: "Reason",
      REVOKE_REASON_PLACEHOLDER: "Why is this being revoked?",
      REVOKE_REASON_REQUIRED: "A reason is required.",
      REVOKE_SUBMIT: "Revoke Gift",
      GRANT_ORDER_TITLE: "Gift this order?",
      GRANT_ORDER_HINT:
        "Picks this specific order to carry the sailor's gift instead of their earliest-arriving one.",
      GRANT_ORDER_NOTE: "Note",
      GRANT_ORDER_NOTE_HINT: "Optional, audit context only.",
      GRANT_ORDER_SUBMIT: "Grant Gift",
      GRANTED_TOAST: "Gift granted.",
      GRANT_ERROR: "Failed to grant the gift.",
      REVOKED_TOAST: "Gift revoked.",
      REVOKE_ERROR: "Failed to revoke the gift.",
      // The system deliberately never records what the gift is.
      NO_ITEM_NOTE:
        "The gift itself is prepared off-system — AnchorMart records only that an order was gifted, never what it was.",
    },
  },
  PORTS: {
    TITLE: "Ports",
    SUBTITLE: "The port directory vessels, shops and orders are located against.",
    DASH: "—",
    ADD: "Add Port",
    SEARCH_PLACEHOLDER: "Search port name, code or country…",
    EMPTY: "No ports found.",
    FETCH_ERROR: "Failed to load ports.",
    STATUS_FILTER: { ACTIVE: "Active", INACTIVE: "Inactive" },
    COLUMNS: {
      CODE: "Code",
      PORT: "Port",
      COUNTRY: "Country",
      REGION: "Region",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    FIELDS: {
      CODE: "Port Code *",
      CODE_PLACEHOLDER: "e.g. INMUM",
      NAME: "Port Name *",
      NAME_PLACEHOLDER: "e.g. Mumbai Port",
      COUNTRY: "Country",
      COUNTRY_PLACEHOLDER: "e.g. India",
      REGION: "Region",
      REGION_PLACEHOLDER: "e.g. Maharashtra",
      ACTIVE: "Active",
    },
    FORM: {
      ADD_TITLE: "Add Port",
      ADD_SUBTITLE: "Ports appear in vessel profiles, order locations and shop coverage.",
      EDIT_TITLE: "Edit Port",
      EDIT_SUBTITLE: "Changes apply everywhere this port is referenced.",
      SUBMIT: "Save Port",
      SAVING: "Saving…",
    },
    DELETE_CONFIRM: {
      TITLE: "Delete this port?",
      // The anchorage cascade is the consequential half and was missing: those
      // moorings stop being offered to sailors the moment this runs.
      MESSAGE:
        "Its anchorages are deactivated and stop being selectable for new orders. Orders and vessel profiles already pointing at this port keep their snapshot.",
      CONFIRM: "Delete Port",
    },
    TOAST: {
      ADD_SUCCESS: "Port created.",
      ADD_ERROR: "Failed to create the port.",
      UPDATE_SUCCESS: "Port updated.",
      UPDATE_ERROR: "Failed to update the port.",
      DELETE_SUCCESS: "Port deleted.",
      /**
       * Deleting a port **deactivates its anchorages** (Flow 29c §4 / GA17).
       * The FK says CASCADE, but a soft delete is an UPDATE so the database
       * never fires it — the endpoint does it explicitly and returns the count.
       */
      DELETE_SUCCESS_CASCADE: (n: number) =>
        `Port deleted. ${n.toLocaleString("en-US")} anchorage${n === 1 ? "" : "s"} deactivated.`,
      DELETE_ERROR: "Failed to delete the port.",
    },
  },
  CHAT: {
    DASH: "—",
    SUPPORT: {
      TITLE: "Support Threads",
      SUBTITLE: "Conversations sailors and partners opened with the support desk.",
      SEARCH_PLACEHOLDER: "Search support threads…",
      EMPTY: "No support threads yet.",
    },
    DELIVERY: {
      TITLE: "Chat Monitor",
      SUBTITLE: "Admin ↔ Sailors & Delivery Partners — real-time communication",
      SEARCH_PLACEHOLDER: "Search conversations…",
      EMPTY: "No conversations yet.",
    },
    ORDER: {
      TITLE: "Order Chats",
      SUBTITLE: "Queries about a specific order. You see the orders you own; admins see all.",
      SEARCH_PLACEHOLDER: "Search order threads…",
      EMPTY: "No order threads yet.",
      CATEGORY_ALL: "Both sides",
      CATEGORY_ORDER: "From sailors",
      CATEGORY_DELIVERY: "From partners",
      COUNTERPARTY: {
        customer: "Sailor",
        delivery_partner: "Partner",
      } as Record<string, string>,
      UNCLAIMED: "Unclaimed",
      ITEMS: (n: number) => `${n} item${n === 1 ? "" : "s"}`,
    },
    // Live socket state (Flow 23 §2). Surfaced because a chat that has silently
    // stopped receiving is indistinguishable from a quiet one.
    SOCKET: {
      CONNECTING: "Connecting…",
      OPEN: "Live",
      RECONNECTING: "Reconnecting…",
      OFFLINE: "Offline",
      AUTH_ERROR: (code: string) => `Chat connection refused (${code}).`,
      // `blocked` and `invalid_token` are terminal — the client must not retry.
      AUTH_ERROR_FATAL: "Chat is unavailable for this account. Sign in again or contact support.",
      QUEUED: "Offline — this will send when the connection returns.",
    },
    COMPOSER: {
      PLACEHOLDER: "Write a reply…",
      SEND: "Send",
      HINT: "Enter to send · Shift+Enter for a new line",
      // The one write the admin panel genuinely cannot do: uploads live under
      // /api/chat/, which requires a header this panel has no access to.
      NO_ATTACH: "Attachments can be read here but not sent from the admin panel.",
      TYPING_ONE: "typing…",
      TYPING_MANY: (n: number) => `${n} people typing…`,
      EDIT: "Edit",
      DELETE: "Delete",
      EDITING: "Editing message",
      CANCEL_EDIT: "Cancel",
      EDITED: "edited",
      CONFIRM_DELETE_TITLE: "Delete this message?",
      CONFIRM_DELETE_BODY:
        "It stays in the thread marked as deleted — everyone in the conversation sees that a message was removed.",
    },
    GROUP: {
      CREATE: "New Group",
      TITLE: "Create Group Chat",
      SUBTITLE: "You become the group admin and are added automatically.",
      NAME: "Group Name",
      NAME_PLACEHOLDER: "e.g. Singapore Ops Desk",
      PARTICIPANTS: "Participants",
      PARTICIPANTS_HINT: "One user ID per line. Every ID must exist, or the request is rejected.",
      PARTICIPANTS_PLACEHOLDER: "9c1e…\n0b7d…",
      SUBMIT: "Create Group",
      CREATED: "Group chat created successfully",
      ERROR: "Failed to create the group chat",
    },
    THREADS: {
      FETCH_ERROR: "Failed to load conversations.",
      UNREAD: (n: number) => `${n} unread`,
      NO_PREVIEW: "No messages yet",
    },
    MESSAGES: {
      PLACEHOLDER_TITLE: "Select a conversation",
      PLACEHOLDER_BODY: "Pick a thread on the left to read its messages.",
      EMPTY: "This thread has no messages yet.",
      FETCH_ERROR: "Failed to load messages.",
      DELETED: "This message was deleted.",
      ATTACHMENT: "Attachment",
      REFRESH: "Refresh",
      ORDER_PREFIX: "Order",
      // Your own messages read "You" rather than your email address. Applied
      // only once the socket has identified you — another admin replying in a
      // shared inbox keeps their own name.
      YOU: "You",
    },
  },
  NOTIFICATIONS: {
    TITLE: "Notifications",
    SUBTITLE: "Compose and send messages to sailors, partners and staff.",
    DASH: "—",
    TABS: {
      ROLE: "Role Notification",
      BROADCAST: "Broadcast",
      HISTORY: "History",
    },
    /**
     * Both send endpoints answer 200 (not a 4xx) when a duplicate campaign is
     * suppressed — nothing is wrong, the request was simply a no-op. The copy
     * has to read as "not sent", never as a failure.
     */
    SUPPRESSED: {
      TITLE: "Not sent — duplicate campaign",
      RETRY: (seconds: number) => `Try again in about ${seconds} second(s).`,
    },
    REACH: {
      TITLE: "Estimated Reach",
      TOTAL: (n: number) => `${n.toLocaleString("en-US")} recipients`,
      EMPTY: "No reach data for this type.",
      ERROR: "Couldn't load the audience preview.",
      // The counts are an upper bound: the dispatcher still drops a message for
      // anyone who muted the type, and a promo also honours the channel toggles.
      CAVEAT:
        "An upper bound — the dispatcher still drops the message for anyone who muted this type.",
    },
    TRAITS: {
      PUSH_ON: "Sends a push notification",
      PUSH_OFF: "In-app only — this type never pushes",
      PROMOTIONAL: "Promotional — honours the marketing opt-out and stays out of the curated inbox",
      TRANSACTIONAL: "Transactional — always reaches the user",
    },
    ROLE_FORM: {
      TITLE: "Send to a role",
      SUBTITLE: "Everyone holding the selected role receives this message.",
      ROLE: "Recipient Role",
      TYPE: "Notification Type",
      TITLE_FIELD: "Title",
      TITLE_PLACEHOLDER: "e.g. Scheduled maintenance tonight",
      MESSAGE: "Message",
      MESSAGE_PLACEHOLDER: "What should the recipients read?",
      METADATA: "Metadata (JSON)",
      METADATA_HINT: "Optional. Carried into the FCM payload — must be a JSON object.",
      METADATA_PLACEHOLDER: '{ "screen": "orders" }',
      METADATA_INVALID: "Metadata must be valid JSON (an object).",
      SUBMIT: "Send Notification",
      SENDING: "Sending…",
      CONFIRM_TITLE: "Send this notification?",
      CONFIRM_MESSAGE: (role: string, count: number) =>
        `This will be sent to every ${role} — about ${count.toLocaleString("en-US")} recipient(s). It can't be recalled.`,
      SUCCESS: "Notification sent.",
      ERROR: "Failed to send the notification.",
    },
    BROADCAST_FORM: {
      TITLE: "Broadcast",
      SUBTITLE: "One durable announcement — to a single role, or to everyone.",
      TITLE_FIELD: "Title",
      TITLE_PLACEHOLDER: "e.g. New express catalog is live",
      MESSAGE: "Message",
      MESSAGE_PLACEHOLDER: "What should everyone read?",
      AUDIENCE: "Audience",
      AUDIENCE_ALL: "Everyone (all roles)",
      CATEGORY: "Category",
      CATEGORY_PROMOTIONAL: "Promotional",
      CATEGORY_SERVICE: "Service",
      // This is the consent boundary, not a tag — spell out what each one does
      // before the button is pressed, because Service overrides an opt-out.
      CATEGORY_HINT_PROMOTIONAL:
        "Honours every opt-out and adds a one-click unsubscribe. Use for anything marketing.",
      CATEGORY_HINT_SERVICE:
        "Reaches opted-out users too. Reserved for genuine operational notices — the send is recorded against you.",
      CHANNELS: "Channels",
      CHANNEL_INAPP: "In-app",
      CHANNEL_EMAIL: "Email",
      // The API rejects an empty `channels` array, so the form does too.
      CHANNELS_HINT: "At least one is required. WhatsApp isn't offered yet.",
      CHANNELS_REQUIRED: "Pick at least one channel.",
      EMAIL_ESTIMATE: (n: number) =>
        `About ${n.toLocaleString("en-US")} email(s) will be queued — the preference gate is already applied.`,
      IMAGE: "Image Path",
      // notification_images/ is not one of the five presigned-mintable
      // directories, so this one really is paste-only.
      IMAGE_HINT:
        "Optional stored path (e.g. notification_images/banner.jpg). This directory can't be uploaded to from here.",
      IMAGE_PLACEHOLDER: "notification_images/banner.jpg",
      SUBMIT: "Send Broadcast",
      SENDING: "Sending…",
      CONFIRM_TITLE: "Send this broadcast?",
      CONFIRM_MESSAGE: (audience: string, channels: string, category: string) =>
        `Going to ${audience} over ${channels} as a ${category} message. It can't be recalled.`,
      // Service overrides consent, so the confirm step says so explicitly
      // rather than burying it in a hint above the button.
      CONFIRM_SERVICE_WARNING:
        "Service messages reach users who opted out of marketing. Only use this for genuine operational notices.",
      SUCCESS: "Broadcast queued.",
      ERROR: "Failed to send the broadcast.",
    },
    /** Flow 32 §3.5 — the campaign log. */
    HISTORY: {
      TITLE: "Sent Campaigns",
      SUBTITLE: "Every broadcast and role send, attributed to whoever sent it.",
      EMPTY: "No campaigns match these filters.",
      FETCH_ERROR: "Couldn't load the campaign history.",
      ALL_CATEGORIES: "All Categories",
      ALL_AUDIENCES: "All Audiences",
      ALL_TYPES: "All Types",
      AUDIENCE_ALL: "Everyone",
      SHAPE_ROLE: "Role send",
      SHAPE_BROADCAST: "Broadcast",
      DISPATCH_SENT: "Sent",
      DISPATCH_QUEUED: "Queued",
      DISPATCH_FAILED: "Failed",
      // `is_dispatched` is the only honest answer to "did this go out?" — the
      // row exists from the moment the campaign is *accepted*.
      DISPATCH_HINT:
        'A row appears as soon as a campaign is accepted. "Sent" means the fan-out actually ran — queued rows are still waiting on the outbox sweeper (every 5 minutes).',
      LIVE_IN_APP: "Live in-app",
      COLUMNS: {
        SENT_AT: "Created",
        TITLE: "Title",
        SHAPE: "Shape",
        AUDIENCE: "Audience",
        CATEGORY: "Category",
        CHANNELS: "Channels",
        SENT_BY: "Sent By",
        DISPATCH: "Dispatch",
      },
      CATEGORY_LABELS: {
        promotional: "Promotional",
        service: "Service",
      } as Record<string, string>,
      CHANNEL_LABELS: {
        inapp: "In-app",
        email: "Email",
        whatsapp: "WhatsApp",
      } as Record<string, string>,
    },
    VALIDATION: {
      TITLE_REQUIRED: "Title is required",
      MESSAGE_REQUIRED: "Message is required",
    },
    ROLE_LABELS: {
      customer: "Sailors (customers)",
      delivery_partner: "Delivery partners",
      seller: "Sellers",
      // Display names, not stored values — see `roleLabel` in lib/roles.
      admin: "Operators",
      super_admin: "Admins",
    } as Record<string, string>,
    TYPE_LABELS: {
      order_update: "Order update",
      payment: "Payment",
      promo: "Promotion",
      system: "System",
    } as Record<string, string>,
  },
  RATINGS: {
    TITLE: "Ratings & Reviews",
    SUBTITLE: "Delivery and app feedback from sailors.",
    DASH: "—",
    TABS: {
      DELIVERY: "Delivery Reviews",
      APP: "App Reviews",
    },
    WINDOW: {
      PLACEHOLDER: "Time window",
      ALL_TIME: "All time",
      DAYS_7: "Last 7 days",
      DAYS_30: "Last 30 days",
      DAYS_90: "Last 90 days",
    },
    SUMMARY: {
      DELIVERY_AVG: "Avg. Delivery Rating",
      DELIVERY_COUNT: "Delivery Reviews",
      APP_AVG: "Avg. App Rating",
      APP_COUNT: "App Reviews",
      // An average of null means nobody rated in the window — deliberately not
      // rendered as 0, which would read as "everybody rated zero".
      NOT_RATED: "Not rated yet",
      CACHE_NOTE:
        "Totals are cached for about 5 minutes, so a brand-new review may not appear yet.",
    },
    FILTERS: {
      RATING_PLACEHOLDER: "All ratings",
      RATING_OPTION: (n: number) => `${n} star${n === 1 ? "" : "s"}`,
      PLATFORM_PLACEHOLDER: "All platforms",
      VERSION_PLACEHOLDER: "App version",
    },
    DELIVERY: {
      SEARCH_PLACEHOLDER: "Search order no., sailor email or comment…",
      EMPTY: "No delivery reviews found.",
      FETCH_ERROR: "Failed to load delivery reviews.",
      NO_PARTNER: "Partner not resolved",
      COLUMNS: {
        ORDER: "Order",
        SAILOR: "Sailor",
        PARTNER: "Delivered By",
        RATING: "Rating",
        TAGS: "Quick Tags",
        COMMENT: "Comment",
        DATE: "Submitted",
      },
    },
    APP: {
      SEARCH_PLACEHOLDER: "Search user email or feedback…",
      EMPTY: "No app reviews found.",
      FETCH_ERROR: "Failed to load app reviews.",
      COLUMNS: {
        USER: "User",
        RATING: "Rating",
        FEEDBACK: "Feedback",
        PLATFORM: "Platform",
        VERSION: "Version",
        DATE: "Submitted",
      },
    },
    DETAIL: {
      DELIVERY_TITLE: "Delivery Review",
      DELIVERY_SUBTITLE: "How the sailor rated this order's handover.",
      APP_TITLE: "App Review",
      APP_SUBTITLE: "How this sailor rated the app itself.",
      SECTIONS: {
        RATING: "Rating",
        PEOPLE: "People",
        CONTEXT: "Context",
        FEEDBACK: "Written Feedback",
      },
      FIELDS: {
        SCORE: "Score",
        SUBMITTED: "Submitted",
        TAGS: "Quick Tags",
        ORDER: "Order",
        SAILOR: "Sailor",
        SAILOR_EMAIL: "Sailor Email",
        PARTNER: "Delivered By",
        PARTNER_EMAIL: "Partner Email",
        USER: "User",
        USER_EMAIL: "User Email",
        PLATFORM: "Platform",
        VERSION: "App Version",
      },
      NO_TAGS: "No quick tags selected.",
      NO_COMMENT: "The sailor left no written feedback.",
      // Set at submit time from the DELIVERED assignment, so it names whoever
      // actually delivered — not whoever happens to be assigned now.
      PARTNER_NOTE:
        "Recorded when the review was submitted, so a later reassignment can't change it.",
      // Ratings are a customer's words: the admin panel has no edit or delete
      // endpoint for one, and saying so is better than an admin hunting for it.
      READ_ONLY: "Reviews are read-only — they can't be edited or removed from here.",
      CLOSE: "Close",
    },
    // Human labels for DeliveryRating.QuickTag values.
    TAG_LABELS: {
      on_time: "On time",
      correct_items: "Correct items",
      careful_handling: "Careful handling",
      friendly: "Friendly",
      late: "Late",
      wrong_items: "Wrong items",
    } as Record<string, string>,
  },
  /**
   * Flow 31 — Account Administration, end to end: provision an account, then
   * govern and erase it. The two halves used to live on different screens
   * (Settings → Users, and a separate deletions queue); they are one page now,
   * so their copy is one block with a section each.
   */
  ACCOUNT_MANAGEMENT: {
    TITLE: "Account Management",
    SUBTITLE: "Provision accounts, and review requests to erase them.",
    /**
     * Page titles. These were tab labels on one combined screen until Account
     * Management became a sidebar *section* — each is now a route of its own,
     * and the key name is kept so nothing else has to move.
     */
    TABS: {
      DELETIONS: "Deletion Requests",
      PROVISION: "Provision Users",
      ADMINS: "Admins",
    },
    /** Shown when a sub-admin reaches the admin directory by URL. */
    ADMINS_SUPER_ONLY:
      "Admin accounts are managed by admins only. This screen has nothing for your tier — the server refuses the underlying calls regardless of what is shown here.",
    /**
     * Admin-tier user administration.
     *
     * Newer than Flow 31, which states admins "cannot be listed or removed at
     * all" — the API now exposes the full CRUD, so the console does too.
     */
    ADMIN_USERS: {
      TITLE: "Admin Users",
      SUBTITLE: "The accounts that can sign in to this console.",
      DASH: "—",
      SEARCH_PLACEHOLDER: "Search name or email…",
      ALL_ROLES: "All Tiers",
      ALL_STATUS: "All Statuses",
      EMPTY: "No admin users found.",
      FETCH_ERROR: "Couldn't load admin users.",
      // Shown to a sub-admin instead of the table: the create side is gated at
      // SEC-1, and offering management of accounts they cannot create reads as
      // a permission they do not have.
      SUPER_ADMIN_ONLY:
        "Only an admin can manage these accounts. Ask one to add, edit or remove an operator.",
      STATUS: {
        ACTIVE: "Active",
        INACTIVE: "Deactivated",
      },
      STATUS_FILTER: {
        ACTIVE: "Active",
        INACTIVE: "Deactivated",
      },
      COLUMNS: {
        USER: "User",
        EMAIL: "Email",
        TIER: "Tier",
        CONTACT: "Contact",
        JOINED: "Joined",
        STATUS: "Status",
        ACTIONS: "Actions",
      },
      DETAIL: {
        TITLE: "Admin User",
        IDENTITY: "Identity",
        FIRST_NAME: "First Name",
        LAST_NAME: "Last Name",
        EMAIL: "Email Address",
        CONTACT: "Contact",
        COUNTRY_CODE: "Country Code",
        WHATSAPP: "WhatsApp Number",
        ACCOUNT: "Account",
        TIER: "Tier",
        JOINED: "Joined",
        LAST_LOGIN: "Last Sign-in",
        DJANGO_ADMIN: "Django Admin",
        DJANGO_ADMIN_YES: "Yes",
        DJANGO_ADMIN_NO: "No",
        DJANGO_ADMIN_HINT:
          "Admin-tier accounts created with a real email get a generated password and Django-admin access.",
        // The tier is fixed at creation, exactly as it is for a sailor.
        TIER_LOCKED_HINT: "Set when the account was created and cannot be changed here.",
        SECURITY: "Security",
        RESET_PASSWORD: "Reset Password",
        RESET_PASSWORD_HINT:
          "Generates a new password and emails it to the account. It is never shown here.",
        DEACTIVATE: "Deactivate",
        ACTIVATE: "Activate",
        DEACTIVATE_HINT:
          "A deactivated account is locked out of password and OTP sign-in immediately. Reversible.",
        DELETE: "Delete Account",
        DELETE_HINT: "Soft-delete. The record is kept; the account can no longer sign in.",
        SAVE: "Save Changes",
        SAVING: "Saving…",
        // Guards the one action that would lock the operator out of their own
        // console — the server may allow it, but there is no good reason to.
        SELF_NOTICE: "This is your own account. Deactivating or deleting it would sign you out.",
      },
      CONFIRM: {
        DEACTIVATE_TITLE: "Deactivate this admin?",
        DEACTIVATE_MESSAGE:
          "They will be locked out of the console immediately, including any OTP already issued. You can reactivate them at any time.",
        DEACTIVATE_CTA: "Deactivate",
        DEACTIVATING: "Deactivating…",
        RESET_TITLE: "Reset this admin's password?",
        RESET_MESSAGE:
          "A new password is generated and emailed to them. Their current one stops working. The new password is never shown here.",
        RESET_CTA: "Send New Password",
        RESETTING: "Sending…",
        DELETE_TITLE: "Delete this admin account?",
        DELETE_MESSAGE:
          "This soft-deletes the account and revokes console access. Any orders they were managing return to the unassigned pool.",
        DELETE_CTA: "Delete Account",
        DELETING: "Deleting…",
      },
      TOAST: {
        UPDATED: "Admin user updated.",
        UPDATE_ERROR: "Couldn't update this admin user.",
        ACTIVATED: "Admin user activated.",
        DEACTIVATED: "Admin user deactivated.",
        STATUS_ERROR: "Couldn't change the account status.",
        // Names the address, because that is the only proof the operator gets —
        // the password itself is never returned.
        RESET_SENT: (email: string) => `New password emailed to ${email}.`,
        RESET_ERROR: "Couldn't reset the password.",
        DELETED: "Admin user deleted.",
        DELETE_ERROR: "Couldn't delete this admin user.",
      },
    },
    /** §7 — user provisioning (moved here from Settings → Users). */
    PROVISION: {
      ADD_BUTTON: "Create User",
      CREATE_SHORT: "Create",
      NOT_MANAGEABLE: "No management screen",
      ROLE_LOCKED_HINT: "Pre-selected for this entry point",
      SECTION_TITLE: "Roles & where they are managed",
      SECTION_SUBTITLE:
        "One endpoint creates every role — the role decides where the account appears afterwards.",
      // Was "there is no list-users endpoint" — true of Flow 31, no longer true
      // of the API. Every role now has a screen, so this points at them instead
      // of apologising for a table that isn't here.
      NO_LIST_NOTICE:
        "This tab creates accounts; it does not list them. Each role is managed on its own screen — open the one named against it to edit, suspend or remove an account.",
      // Admin-tier creation is super-admin only (SEC-1). Shown in place of the
      // two locked options so the restriction is explained, not just enforced.
      ADMIN_TIER_LOCKED:
        "Only an admin can create these accounts. Ask one to add another operator.",
      MANAGED_AT: "Managed at",
      SECTIONS: {
        ROLE: "Role",
        IDENTITY: "Identity",
        CONTACT: "Contact",
      },
      ADD: {
        TITLE: "Create User",
        SUBTITLE: "One account, any role — the role decides where it appears.",
        SUBMIT: "Create Account",
        SAVING: "Creating…",
      },
      TOAST: {
        CREATE_SUCCESS: "Account created",
        CREATE_ERROR: "Could not create the account",
      },
    },
    /** §8–11 — the deletion-review queue. */
    DELETIONS: {
      TITLE: "Account Deletions",
      SUBTITLE: "Review and carry out requests to erase an account.",
      DASH: "—",
      SEARCH_PLACEHOLDER: "Search name, email or reason…",
      ALL_STATUS: "All Statuses",
      ALL_ROLES: "All Roles",
      EMPTY: "No deletion requests found.",
      FETCH_ERROR: "Couldn't load the deletion queue.",
      STATS: {
        TOTAL: "Total Requests",
        PENDING: "Pending",
        PENDING_FOOTER: "Awaiting a decision",
        APPROVED: "Approved",
        APPROVED_FOOTER: "Agreed, not yet erased",
        REJECTED: "Rejected",
        COMPLETED: "Completed",
        COMPLETED_FOOTER: "Account erased",
      },
      COLUMNS: {
        REQUESTER: "Requester",
        EMAIL: "Email",
        ROLE: "Role",
        REASON: "Reason",
        REQUESTED: "Requested",
        STATUS: "Status",
        ACTIONS: "Actions",
      },
      STATUS_FILTER: {
        PENDING: "Pending",
        APPROVED: "Approved",
        REJECTED: "Rejected",
        COMPLETED: "Completed",
      },
      DETAIL: {
        TITLE: "Deletion Request",
        REQUESTER: "Requester",
        ACCOUNT_STATE: "Account",
        ACTIVE: "Active",
        INACTIVE: "Deactivated",
        REQUESTED_ON: "Requested",
        REASON: "Their Reason",
        FOOTPRINT: "Account Footprint",
        OPEN_ORDERS: "Open Orders",
        TOTAL_ORDERS: "Total Orders",
        POINTS: "Outstanding Points",
        FOOTPRINT_HINT:
          "Open orders are the ones not yet in a terminal state. Completion is refused while any remain.",
        // Shown next to a disabled Complete button, so it has to say what to do,
        // not just that the button is off.
        BLOCKED_BY_ORDERS: (n: number) =>
          `${n.toLocaleString("en-US")} order(s) still in progress — close or cancel them before erasing this account.`,
        DECISION: "Decision",
        ADMIN_NOTE: "Admin Note",
        NOTE_PLACEHOLDER: "Why is this being rejected? Required to reject.",
        NOTE_HINT: "Required when rejecting. Optional otherwise. Max 2000 characters.",
        NOTE_REQUIRED: "A note is required when rejecting a deletion request.",
        RECORDED: "Recorded Decision",
        REVIEWED_BY: "Reviewed By",
        REVIEWED_AT: "Reviewed At",
        PROCESSED_AT: "Erased At",
        APPROVE: "Approve",
        REJECT: "Reject",
        COMPLETE: "Complete Erasure",
        // Terminal states offer no buttons at all — the API 409s on any further
        // transition, so a disabled button would only be a promise it can't keep.
        TERMINAL_REJECTED: "This request was rejected. Rejections are final.",
        TERMINAL_COMPLETED: "This account has been erased. Completed requests are final.",
        APPROVED_HINT:
          "Approved, but the account is untouched. Erasing it is a separate, irreversible step.",
        FALLBACK: "-",
      },
      CONFIRM: {
        APPROVE_TITLE: "Approve this deletion request?",
        APPROVE_MESSAGE:
          "This records your agreement. The account is NOT touched — erasing it is a separate step.",
        APPROVE_CTA: "Approve",
        APPROVING: "Approving…",
        COMPLETE_TITLE: "Erase this account?",
        COMPLETE_MESSAGE:
          "This permanently erases the account and cannot be undone. It is refused while the user still has orders in progress.",
        COMPLETE_CTA: "Erase Account",
        COMPLETING: "Erasing…",
      },
      TOAST: {
        APPROVED: "Deletion request approved.",
        APPROVE_ERROR: "Couldn't approve the request.",
        REJECTED: "Deletion request rejected.",
        REJECT_ERROR: "Couldn't reject the request.",
        COMPLETED: "Account erased.",
        COMPLETE_ERROR: "Couldn't erase the account.",
      },
    },
    ROLE_LABELS: {
      customer: "Sailor",
      delivery_partner: "Delivery partner",
      seller: "Seller",
      // Display names, not stored values — see `roleLabel` in lib/roles.
      admin: "Operator",
      super_admin: "Admin",
    } as Record<string, string>,
  },
  /** Flow 34 — Audit Trail & Tamper-Evidence. */
  AUDIT: {
    TITLE: "Audit Trail",
    SUBTITLE: "Every recorded admin action, hash-chained so tampering shows.",
    DASH: "—",
    EMPTY: "No audit entries match these filters.",
    FETCH_ERROR: "Couldn't load the audit trail.",
    ALL_CATEGORIES: "All Categories",
    ALL_SUBJECTS: "All Subjects",
    ALL_ACTIONS: "All Actions",
    FILTERS: {
      SUBJECT_ID: "Subject ID",
      SUBJECT_ID_PLACEHOLDER: "Filter by subject UUID…",
      ACTOR_ID: "Actor ID",
      FROM: "From",
      TO: "To",
      CLEAR: "Clear Filters",
    },
    COLUMNS: {
      WHEN: "When",
      ACTION: "Action",
      CATEGORY: "Category",
      SUBJECT: "Subject",
      ACTOR: "Actor",
      SUMMARY: "Summary",
      ACTIONS: "Actions",
    },
    CATEGORY_LABELS: {
      order: "Order",
      operational: "Operational",
    } as Record<string, string>,
    SUBJECT_LABELS: {
      order: "Order",
      user: "User",
      coupon: "Coupon",
      port: "Port",
      product: "Product",
      partner: "Partner",
      config: "Config",
    } as Record<string, string>,
    /**
     * Sub-admins are scoped to `category=order` server-side, so the console says
     * so up front rather than letting them pick a filter that 403s.
     */
    SUBADMIN_NOTICE:
      "You're signed in as an operator, so this trail shows order entries only. Operational entries and chain verification are restricted to admins.",
    DETAIL: {
      TITLE: "Audit Entry",
      WHAT_HAPPENED: "What Happened",
      ACTION: "Action",
      CATEGORY: "Category",
      WHEN: "When",
      SUBJECT: "Subject",
      SUBJECT_TYPE: "Subject Type",
      SUBJECT_ID: "Subject ID",
      SUBJECT_LABEL: "Subject",
      ACTOR: "Actor",
      ACTOR_EMAIL: "Email",
      ACTOR_ROLE: "Role",
      ACTOR_ID: "Actor ID",
      SUMMARY: "Summary",
      METADATA: "Metadata",
      METADATA_EMPTY: "No metadata recorded for this entry.",
      CHAIN: "Chain",
      ENTRY_HASH: "Entry Hash",
      PREV_HASH: "Previous Hash",
      HASH_VERSION: "Hash Version",
      VERIFY_CTA: "Verify This Subject's Chain",
      VERIFYING: "Verifying…",
      FALLBACK: "-",
    },
    VERIFY: {
      TITLE: "Chain Verification",
      SUBTITLE: "Recomputes every hash for one subject and reports the first break.",
      SUBJECT_TYPE: "Subject Type",
      SUBJECT_ID: "Subject ID",
      SUBJECT_ID_PLACEHOLDER: "Paste the subject UUID…",
      SUBMIT: "Verify Chain",
      RUNNING: "Verifying…",
      REQUIRED: "Both a subject type and a subject ID are required.",
      CLEAN: "Chain intact",
      CLEAN_DETAIL: (entries: number) =>
        `All ${entries.toLocaleString("en-US")} entries hash correctly and link to their predecessor.`,
      BROKEN: "Chain broken",
      ENTRIES: "Entries Checked",
      PRUNED_BEFORE: "Pruned Before",
      // An authorised truncation is not tampering — the chain records where it
      // was cut, so a verified chain with a prune date is still clean.
      PRUNED_HINT: "Entries before this date were pruned by an authorised retention job.",
      ERROR: "Couldn't run the verification.",
      // The endpoint answers 200 even for a broken chain, so the UI must read
      // `verified`, never the status code.
      RESULT_HINT: "A broken chain still answers 200 — the verdict is in the payload.",
      SUPER_ADMIN_ONLY: "Chain verification is restricted to admins.",
    },
  },
  /** Flow 22 §3.1–3.2 — the outbound email / WhatsApp delivery ledger. */
  OUTBOUND_MESSAGES: {
    TITLE: "Message Log",
    SUBTITLE: "Every outbound email and WhatsApp message, and whether it landed.",
    DASH: "—",
    // `recipient` is the only partial-match filter the API offers — there is no
    // general `?search=`, so the placeholder says exactly what it matches.
    SEARCH_PLACEHOLDER: "Search recipient (email or phone)…",
    ALL_CHANNELS: "All Channels",
    ALL_STATUSES: "All Statuses",
    EVENT_TYPE_PLACEHOLDER: "Event type (exact)…",
    EMPTY: "No messages match these filters.",
    FETCH_ERROR: "Couldn't load the message log.",
    NEWEST_FIRST: "Newest first",
    OLDEST_FIRST: "Oldest first",
    COLUMNS: {
      CREATED: "Created",
      CHANNEL: "Channel",
      RECIPIENT: "Recipient",
      SUBJECT: "Subject",
      EVENT: "Event",
      STATUS: "Status",
      ATTEMPTS: "Attempts",
      ACTIONS: "Actions",
    },
    CHANNEL_LABELS: {
      email: "Email",
      whatsapp: "WhatsApp",
    } as Record<string, string>,
    STATUS_LABELS: {
      queued: "Queued",
      sending: "Sending",
      sent: "Sent",
      delivered: "Delivered",
      read: "Read",
      failed: "Failed",
    } as Record<string, string>,
    DETAIL: {
      TITLE: "Delivery Record",
      DELIVERY: "Delivery",
      CHANNEL: "Channel",
      STATUS: "Status",
      RECIPIENT: "Recipient",
      SUBJECT: "Subject",
      TEMPLATE: "Template",
      ATTEMPTS: "Attempts",
      ERROR: "Error",
      ACCOUNT: "Account",
      USER_EMAIL: "Linked Account",
      USER_ID: "User ID",
      SOURCE: "Source Event",
      EVENT_TYPE: "Event Type",
      EVENT_ID: "Event ID",
      PROVIDER: "Provider",
      PROVIDER_MESSAGE_ID: "Provider Message ID",
      TIMELINE: "Timeline",
      CREATED_AT: "Created",
      SENT_AT: "Sent",
      DELIVERED_AT: "Delivered",
      READ_AT: "Read",
      FAILED_AT: "Failed",
      UPDATED_AT: "Updated",
      // The API deliberately withholds the rendered body — it can contain a
      // generated password. Say so, rather than showing an empty panel.
      NO_BODY_TITLE: "Message content is not available",
      NO_BODY:
        "This is a delivery log, not a message reader. The rendered subject line is kept, but the body and its context are never returned — they can contain names, amounts, links and generated passwords.",
      FALLBACK: "-",
    },
  },
  /** Flow 29c §5 — customer wishlist rows (`SavedProduct`). */
  SAVED_PRODUCTS: {
    TITLE: "Saved Products",
    SUBTITLE: "What sailors have wishlisted — demand signal, not catalog data.",
    DASH: "—",
    SEARCH_PLACEHOLDER: "Search product name…",
    ALL_ACTIVE: "Active & Inactive",
    ACTIVE_ONLY: "Active only",
    INACTIVE_ONLY: "Inactive only",
    EMPTY: "No saved products found.",
    FETCH_ERROR: "Couldn't load saved products.",
    COLUMNS: {
      PRODUCT: "Product",
      SAILOR: "Saved By",
      PRODUCT_ID: "Product ID",
      SAVED: "Saved",
      UPDATED: "Updated",
    },
  },
  /**
   * Shared field-validation copy. Every form that takes a person's name or a
   * phone number reads from here, so the same input never gets two different
   * verdicts on two different screens.
   */
  VALIDATION: {
    LABELS: {
      FIRST_NAME: "First name",
      LAST_NAME: "Last name",
      NAME: "Name",
      PHONE: "Phone number",
      WHATSAPP: "WhatsApp number",
      COUNTRY_CODE: "Country code",
      EMAIL: "Email address",
    },
    REQUIRED: (label: string) => `${label} is required`,
    TOO_LONG: (label: string, max: number) => `${label} must be ${max} characters or fewer`,
    NAME_NO_DIGITS: (label: string) => `${label} can't contain numbers`,
    NAME_NEEDS_LETTER: (label: string) => `${label} must contain at least one letter`,
    PHONE_DIGITS: (min: number, max: number) =>
      `Enter ${min}–${max} digits. Spaces, dashes and brackets are fine — they're removed.`,
    COUNTRY_CODE_INVALID: "Enter a valid country code, e.g. +91",
    EMAIL_INVALID: "Enter a valid email address",
  },
  COMMON: {
    /**
     * The whole-catalog product picker, shared by Analytics and the deal form.
     *
     * Lives here rather than under one feature because both screens must offer
     * the *same* three types — a picker that omits one silently hides part of
     * the catalog, which is the defect these labels exist to prevent.
     */
    PRODUCT_PICKER: {
      ALL_TYPES: "All types",
      PLACEHOLDER: "Select a product",
      SEARCH_PLACEHOLDER: "Search products by name…",
      CATALOG_TYPE: {
        regular: "Regular",
        express: "Express",
        marine_emergency: "Marine Emergency",
      } as Record<string, string>,
    },
    /**
     * The outstanding partner requirement on a list row, worded in the
     * backend's own terms: verifier ↔ `can_verify`, delivery ↔ `can_deliver`.
     */
    PARTNER_REQUIREMENT: {
      NEEDS_VERIFIER: "Needs verification partner",
      NEEDS_DELIVERY: "Needs delivery partner",
      UNKNOWN: "Partner requirement unknown",
      UNKNOWN_HINT:
        "This response did not include needs_verifier_partner / needs_delivery_partner, so the outstanding requirement cannot be shown. It is not inferred from the order status or from partner_allocated.",
    },
    /**
     * The assign-order API answering 200 with `already_assigned` — a reply that
     * changed nothing. Shared, because all three assign surfaces (orders,
     * intents, the assignments board) POST the same endpoint and a
     * feature-local copy is how three screens end up wording the same no-op
     * differently.
     *
     * The backend's own sentence ("already assigned to this partner") is not
     * used: it is true only of the *record*, and on a paid order that record is
     * usually the partner's finished verification — so it reads as "the
     * delivery is covered" at the exact moment it is not.
     */
    ASSIGN_ORDER_NO_CHANGE:
      "Nothing was assigned — this partner already holds the order's active assignment. If that assignment is their completed verification, the order still has no delivery partner: pick a different partner, or have the backend stop treating a finished verification as a delivery job.",
    /** Shared long-list picker: server-side search, paged loading, reset. */
    SEARCHABLE_SELECT: {
      PLACEHOLDER: "Select…",
      SEARCH_PLACEHOLDER: "Search…",
      NO_RESULTS: "No matches",
      LOADING: "Loading…",
      LOAD_MORE: "Load more",
      CLEAR: "Clear",
      CLEAR_SEARCH: "Clear search",
    },
    /**
     * Shared card-deck copy (`lib/stats.ts`). The dash covers both "still
     * loading" and "this request failed": in neither case does the console know
     * the count, and a `0` would claim it does.
     */
    STATS: {
      DASH: "—",
      ERROR: "Couldn't load the latest counts.",
    },
    SAVE_CHANGES: "Save Changes",
    CANCEL: "Cancel",
    // Dismisses a read-only view. "Cancel" implies discarding an edit that a
    // read-only drawer never had.
    CLOSE: "Close",
    CONFIRM: "Confirm",
    DELETE: "Delete",
    EDIT: "Edit",
    VIEW: "View",
    LOADING: "Loading…",
    ERROR: "Something went wrong. Please try again.",
    RETRY: "Retry",
    RESET: "Reset",
    PICK_DATE: "Pick a date",
    RESET_FILTERS: "Reset Filters",
    SEARCH_PLACEHOLDER: "Search…",
    SHOWING_OF: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  },

  /** Copy for the super-admin-only gates (`lib/roles.ts`). */
  ROLES: {
    // Shown on the disabled create button and in place of a delete action, so
    // the operator learns why the affordance is missing rather than assuming
    // the screen is broken.
    CATALOG_CREATE_DENIED: "Only an admin can create catalog entries.",
    CATALOG_DELETE_DENIED: "Only an admin can delete catalog entries.",
  },
} as const;
