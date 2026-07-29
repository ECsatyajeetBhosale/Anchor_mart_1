import { SHIP_AGENT_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { ShipAgentListResponse, ShipAgentPayload } from "../types/shipAgent.types";

export interface GetShipAgentsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** "global" → owner IS NULL; "owned" → owner IS NOT NULL; omitted → both. */
  scope?: "global" | "owned";
}

export const shipAgentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShipAgents: builder.query<ShipAgentListResponse, GetShipAgentsParams | undefined>({
      query: (params) => ({
        url: SHIP_AGENT_ENDPOINTS.GET_SHIP_AGENTS,
        method: "GET",
        params: params
          ? {
              page: params.page,
              page_size: params.limit,
              search: params.search || undefined,
              scope: params.scope || undefined,
            }
          : undefined,
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: "ShipAgents" as const, id })),
              { type: "ShipAgents", id: "PARTIAL-LIST" },
            ]
          : [{ type: "ShipAgents", id: "PARTIAL-LIST" }],
    }),

    createShipAgent: builder.mutation<unknown, ShipAgentPayload>({
      query: (body) => ({
        url: SHIP_AGENT_ENDPOINTS.ADD_SHIP_AGENT,
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ShipAgents", id: "PARTIAL-LIST" }],
    }),

    updateShipAgent: builder.mutation<unknown, { id: string; body: ShipAgentPayload }>({
      query: ({ id, body }) => ({
        url: SHIP_AGENT_ENDPOINTS.UPDATE_SHIP_AGENT(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "ShipAgents", id },
        { type: "ShipAgents", id: "PARTIAL-LIST" },
      ],
    }),

    deleteShipAgent: builder.mutation<void, string>({
      query: (id) => ({
        url: SHIP_AGENT_ENDPOINTS.DELETE_SHIP_AGENT(id),
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: "ShipAgents", id },
        { type: "ShipAgents", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetShipAgentsQuery,
  useCreateShipAgentMutation,
  useUpdateShipAgentMutation,
  useDeleteShipAgentMutation,
} = shipAgentApi;
