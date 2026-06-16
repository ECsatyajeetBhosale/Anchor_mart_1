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
  },
  DASHBOARD: {
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
    // Revenue chart card
    REVENUE_TITLE: "Revenue — Last 14 Days",
    REVENUE_EXPORTED: "Revenue CSV exported",
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
    // Active Partners card
    ACTIVE_PARTNERS_TITLE: "Active Partners",
    WEEKLY_EARNINGS: "Weekly partner earnings",
    PARTNER_FREE: "free",
    PARTNER_ACTIVE: (count: number) => `${count} active`,
    // Action Required card
    ACTION_REQUIRED: "Action Required",
    ACTIONS_OPEN: (count: number) => `${count} open`,
  },
  SAILORS: {
    TITLE: "Sailors Management",
    ADD_SAILOR: "Add Sailor",
    EDIT_SAILOR: "Edit Sailor",
    SAILOR_ADDED: "Sailor added successfully",
    SAILOR_UPDATED: "Sailor updated successfully",
    SAILOR_BLOCKED: "Sailor blocked",
    BLOCK_CONFIRM_TITLE: "Block Sailor",
    BLOCK_CONFIRM_MSG: "This sailor will lose app access immediately.",
    EMPTY: "No sailors found",
    EMPTY_FILTERED: "No sailors match your filters",
  },
  ORDERS: {
    // Page chrome
    TITLE: "Orders Management",
    SUBTITLE_COUNT: "184 orders today",
    SUBTITLE_TAGLINE: "Full lifecycle visibility",
    SEARCH_PLACEHOLDER: "Search orders…",
    DATE_RANGE: "Date Range",
    EXPORT: "Export",
    EXPORTED: "Exported order records",
    EMPTY: "No orders found",
    EMPTY_FILTERED: "No orders match the current filters.",
    FETCH_ERROR: "Failed to load orders. Please try again.",
    // Status dropdown filter
    STATUS_FILTER: {
      ALL: "All Status",
      NEW: "New",
      VERIFYING: "Verifying",
      IN_PROGRESS: "In Progress",
      DELIVERING: "Delivering",
      DELIVERED: "Delivered",
      CANCELLED: "Cancelled",
    },
    // Table
    COLUMNS: {
      ORDER_ID: "Order ID",
      SAILOR: "Sailor",
      ITEMS: "Items",
      SHIP_TERMINAL: "Ship / Terminal",
      PARTNER: "Partner",
      PAYMENT: "Payment",
      COUPON: "Coupon",
      TOTAL: "Total",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    ACTIONS: {
      VIEW: "View",
      MESSAGE: "Message",
      CANCEL: "Cancel",
    },
    UNASSIGNED: "Unassigned",
    // Toasts & confirm
    MESSAGE_SENT: (sailor: string) => `Message sent to ${sailor}`,
    CANCEL_CONFIRM_TITLE: "Cancel Order",
    CANCEL_CONFIRM_MSG:
      "This will cancel the order and trigger refund processing. This cannot be undone.",
    CANCEL_CONFIRM_CONFIRM: "Cancel Order",
    ORDER_CANCELLED: (id: string) => `Order ${id} has been cancelled`,
    PARTNER_REASSIGNED: "Partner reassigned successfully",
  },
  INTENTS: {
    TITLE: "Intent Requests",
    REVIEW: "Review Intent",
    CONFIRMED: "Intent confirmed & payment link sent",
    REJECTED: "Intent rejected and sailor notified",
    EMPTY: "No intent requests found",
  },
  PRODUCTS: {
    // Page chrome
    TITLE: "Products & Catalog",
    SEARCH_PLACEHOLDER: "Search products…",
    ALL_CATEGORIES: "All Categories",
    ADD_PRODUCT: "Add Product",
    FETCH_ERROR: "Failed to fetch products",
    EMPTY: "No products found.",
    // Filter tabs
    TABS: {
      ALL: "All Products",
      DEAL: "Deal Products",
      SPECIAL: "Special Requests",
    },
    // KPI cards
    STATS: {
      TOTAL_PRODUCTS: "Total Products",
      TOTAL_CATEGORIES: "Total Categories",
      FEATURED_DEALS: "Featured / Deals",
    },
    // Table
    COLUMNS: {
      PRODUCT: "Product",
      CATEGORY: "Category",
      PRICE: "Price",
      FEATURED: "Featured",
      STATUS: "Status",
      ACTIONS: "Actions",
    },
    STATUS_FILTER: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    },
    FEATURED_YES: "Yes",
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
    },
    // Delete confirmation dialog
    DELETE_CONFIRM: {
      TITLE: "Delete Product",
      MESSAGE: "Are you sure you want to delete this product? This action cannot be undone.",
      CONFIRM: "Delete",
    },
    // Add drawer
    ADD: {
      TITLE: "Add New Product",
      SUBTITLE: "Create a new product for your catalog",
      SUBMIT: "Add Product",
      SAVING: "Saving…",
    },
    // Edit drawer
    EDIT: {
      TITLE: "Edit Product",
      SUBTITLE: "Update your product details",
      SUBMIT: "Save Changes",
      SAVING: "Saving…",
      TABS: {
        BASIC: "Basic Info",
        MEDIA: "Media",
        PRICING: "Pricing",
        SHIPPING: "Shipping",
        VARIANTS: "Variants",
      },
    },
    // Drawer section headings
    SECTIONS: {
      BASIC: "Basic Information",
      MEDIA: "Product Media",
      INVENTORY_PRICING: "Inventory & Pricing",
      ATTRIBUTES: "Product Attributes",
      MATERIAL: "Material Details",
      PRICE: "Price Details",
      ADDITIONAL: "Additional Settings",
      DETAILS: "Product Details",
      PRICING: "Pricing",
      SHIPPING: "Shipping & Delivery",
      OPTIONS: "Product Options",
      VARIANTS: "Variants",
    },
    // Toggle labels
    TOGGLES: {
      ON_DISCOUNT: "On discount",
      ADMIN_SOURCEABLE: "Admin sourceable",
      EXPRESS_ITEM: "Express item",
      TAXABLE: "Taxable",
      PHYSICAL: "Physical Product",
      FREE_SHIPPING: "Free Shipping",
    },
  },
  EXPRESS: {
    // Page chrome
    TITLE: "Express Items",
    SUBTITLE: "Fast-delivery everyday essentials",
    SEARCH_PLACEHOLDER: "Search express items…",
    FETCH_ERROR: "Failed to fetch express items",
    EMPTY: "No express items found.",
    IMAGE_ALT: "Express item",
    // Table
    COLUMNS: {
      PRODUCT: "Product",
      CATEGORY: "Category",
      PRICE: "Price",
      SALES: "Sales",
      SOURCEABLE: "Sourceable",
      STATUS: "Status",
      EXPRESS: "Express",
      CREATED: "Created",
      UPDATED: "Updated",
      ACTIONS: "Actions",
    },
    STATUS_FILTER: {
      ACTIVE: "Active",
      INACTIVE: "Inactive",
    },
    // Boolean flag badge labels
    FLAGS: {
      EXPRESS: "Express",
      NON_EXPRESS: "Non-Express",
      SOURCEABLE: "Sourceable",
      NOT_SOURCEABLE: "Not Sourceable",
    },
    ACTION_VIEW: "View details",
    // Detail drawer
    DRAWER: {
      TITLE_FALLBACK: "Express Item",
      CLOSE: "Close",
      SECTIONS: {
        OVERVIEW: "Overview",
        ATTRIBUTES: "Attributes",
        MATERIAL: "Material",
        CARE: "Care Instructions",
      },
    },
  },
  PARTNERS: {
    TITLE: "Delivery Partners",
    ONBOARD: "Onboard Partner",
    EDIT: "Edit Partner",
    PARTNER_ONBOARDED: "Partner onboarded successfully",
    PARTNER_UPDATED: "Partner updated successfully",
    EMPTY: "No delivery partners found",
  },
  REWARDS: {
    TITLE: "Rewards & Coupons",
    CREATE_COUPON: "Create Coupon",
    EDIT_COUPON: "Edit Coupon",
    COUPON_CREATED: "Coupon created successfully",
    COUPON_UPDATED: "Coupon updated successfully",
    COUPON_DELETED: "Coupon deleted",
    EMPTY: "No coupons found",
  },
  COMMON: {
    SAVE_CHANGES: "Save Changes",
    CANCEL: "Cancel",
    CONFIRM: "Confirm",
    DELETE: "Delete",
    EDIT: "Edit",
    VIEW: "View",
    LOADING: "Loading…",
    ERROR: "Something went wrong. Please try again.",
    RETRY: "Retry",
    RESET_FILTERS: "Reset Filters",
    SEARCH_PLACEHOLDER: "Search…",
    SHOWING_OF: (shown: number, total: number) => `Showing ${shown} of ${total}`,
  },
} as const;
