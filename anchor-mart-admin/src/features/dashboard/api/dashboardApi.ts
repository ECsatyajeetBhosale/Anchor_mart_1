// src/features/dashboard/api/dashboardApi.ts
import { DASHBOARD_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import { MESSAGES } from "@/lib/messages";
import type {
  ActionRequiredResponse,
  ActivePartnersResponse,
  DashboardOrderRow,
  DashboardOrdersParams,
  DashboardOrdersResponse,
  DashboardPort,
  DashboardStatsParams,
  DashboardStatsResponse,
  LiveOrderDetailsResponse,
  LiveOrdersResponse,
  RevenueParams,
  RevenueResponse,
  TopProductsResponse,
} from "../types/dashboard.types";

/**
 * Build the shared dashboard filter query. Send EITHER the custom range OR
 * `period` — a complete range wins so the backend never receives both. Empty
 * keys are dropped by RTK Query so the URL stays clean.
 */
function toFilterParams(params: DashboardStatsParams) {
  return params.from_date && params.to_date
    ? { from_date: params.from_date, to_date: params.to_date }
    : { period: params.period };
}

/**
 * Build the revenue query. `granularity` is always sent; a complete custom
 * range adds `from_date` + `to_date`. Empty keys are dropped by RTK Query.
 */
function toRevenueParams(params: RevenueParams) {
  return params.from_date && params.to_date
    ? { granularity: params.granularity, from_date: params.from_date, to_date: params.to_date }
    : { granularity: params.granularity };
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<DashboardStatsResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_STATS,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Dashboard", id: "STATS" }],
    }),
    getLiveOrders: builder.query<LiveOrdersResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_LIVE_ORDERS,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Orders", id: "DASHBOARD-LIVE" }],
    }),
    getLiveOrderDetails: builder.query<LiveOrderDetailsResponse, string>({
      query: (id) => ({
        url: DASHBOARD_ENDPOINTS.LIVE_ORDER_DETAIL(id),
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Orders", id }],
    }),
    getRevenue: builder.query<RevenueResponse, RevenueParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_REVENUE,
        method: "GET",
        params: toRevenueParams(params),
      }),
      providesTags: [{ type: "Dashboard", id: "REVENUE" }],
    }),
    getTopProducts: builder.query<TopProductsResponse, DashboardStatsParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_TOP_PRODUCTS,
        method: "GET",
        params: toFilterParams(params),
      }),
      providesTags: [{ type: "Dashboard", id: "TOP-PRODUCTS" }],
    }),
    // Endpoint takes no params — period/date filters are intentionally omitted.
    getActivePartners: builder.query<ActivePartnersResponse, void>({
      query: () => ({
        url: DASHBOARD_ENDPOINTS.GET_ACTIVE_PARTNERS,
        method: "GET",
      }),
      providesTags: [{ type: "Dashboard", id: "ACTIVE-PARTNERS" }],
    }),
    // Endpoint takes no params — period/date filters are intentionally omitted.
    getActionRequired: builder.query<ActionRequiredResponse, void>({
      query: () => ({
        url: DASHBOARD_ENDPOINTS.GET_ACTION_REQUIRED,
        method: "GET",
      }),
      providesTags: [{ type: "Dashboard", id: "ACTION-REQUIRED" }],
    }),

    /**
     * The filterable operations order list. Unlike `live-orders/` this one is
     * paginated and takes `search` / `order_status` / `filter_by_port`. Blank
     * filters are dropped so the backend never receives an empty status.
     */
    getDashboardOrders: builder.query<DashboardOrdersResponse, DashboardOrdersParams>({
      query: (params) => ({
        url: DASHBOARD_ENDPOINTS.GET_ORDERS,
        method: "GET",
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          order_status: params.order_status || undefined,
          filter_by_port: params.filter_by_port || undefined,
          from_date: params.from_date || undefined,
          to_date: params.to_date || undefined,
        },
      }),
      transformResponse: (res: unknown): DashboardOrdersResponse => {
        const prop = (v: unknown, k: string): unknown =>
          v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
        const arr = (v: unknown): unknown[] | null => (Array.isArray(v) ? v : null);
        const pick = (o: unknown, ...keys: string[]): string => {
          for (const k of keys) {
            const v = prop(o, k);
            if (typeof v === "string" && v.trim()) return v.trim();
            if (typeof v === "number") return String(v);
          }
          return "";
        };

        const results = prop(res, "results");
        const rawRows =
          arr(prop(results, "data")) ??
          arr(results) ??
          arr(prop(res, "data")) ??
          arr(res) ??
          [];
        const countRaw = prop(res, "count") ?? prop(results, "count");

        const rows: DashboardOrderRow[] = rawRows.map((row, index) => {
          // `sailor` / `port` / `partner` may each be a nested object or a bare
          // string, and this endpoint does not always send `status_display`.
          const sailor = prop(row, "sailor");
          const port = prop(row, "port");
          const partner = prop(row, "partner");
          const ship = pick(row, "ship") || pick(prop(row, "ship"), "vessel_name", "name");
          const portName = typeof port === "string" ? port : pick(port, "name", "port_name");
          const amount = Number(prop(row, "total_amount") ?? prop(row, "total"));

          return {
            id: pick(row, "id", "order_id") || `order-${index}`,
            orderNumber: pick(row, "order_number", "order_no") || "—",
            sailorName:
              (typeof sailor === "string" ? sailor : pick(sailor, "name", "full_name", "email")) ||
              pick(row, "customer_name") ||
              "—",
            shipPort: [ship, portName].filter(Boolean).join(" · ") || "—",
            partnerName:
              (typeof partner === "string" ? partner : pick(partner, "name", "full_name")) ||
              MESSAGES.DASHBOARD.UNASSIGNED,
            status: pick(row, "status_display", "status") || "—",
            total: Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "—",
          };
        });

        return { count: typeof countRaw === "number" ? countRaw : rows.length, rows };
      },
      providesTags: [{ type: "Orders", id: "DASHBOARD-ORDERS" }],
    }),

    /** Order detail for the dashboard list — keyed by `order_id` as a query param. */
    getDashboardOrderDetail: builder.query<LiveOrderDetailsResponse, string>({
      query: (orderId) => ({
        url: DASHBOARD_ENDPOINTS.GET_ORDER_DETAIL,
        method: "GET",
        params: { order_id: orderId },
      }),
      providesTags: (_result, _error, orderId) => [{ type: "Orders", id: orderId }],
    }),

    /**
     * Ports available as `filter_by_port` values. Returns a plain array or a
     * `{ results }` envelope depending on pagination, so both are handled; the
     * transform also tolerates a bare list of port-name strings.
     */
    getDashboardPorts: builder.query<DashboardPort[], void>({
      query: () => ({ url: DASHBOARD_ENDPOINTS.GET_PORTS, method: "GET" }),
      transformResponse: (res: unknown): DashboardPort[] => {
        const body = res as Record<string, unknown> | unknown[] | null;
        const rows = Array.isArray(body)
          ? body
          : Array.isArray((body as Record<string, unknown>)?.results)
            ? ((body as Record<string, unknown>).results as unknown[])
            : Array.isArray((body as Record<string, unknown>)?.data)
              ? ((body as Record<string, unknown>).data as unknown[])
              : [];
        return rows.map((row, index) => {
          if (typeof row === "string") return { id: row, name: row };
          const r = (row ?? {}) as Record<string, unknown>;
          const name = String(r.port_name ?? r.name ?? "").trim();
          return { id: String(r.id ?? name ?? index), name };
        });
      },
      providesTags: [{ type: "Dashboard", id: "PORTS" }],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardStatsQuery,
  useGetLiveOrdersQuery,
  useGetLiveOrderDetailsQuery,
  useGetRevenueQuery,
  useGetTopProductsQuery,
  useGetActivePartnersQuery,
  useGetActionRequiredQuery,
  useGetDashboardOrdersQuery,
  useGetDashboardOrderDetailQuery,
  useGetDashboardPortsQuery,
} = dashboardApi;
