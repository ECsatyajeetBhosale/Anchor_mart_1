import { PORT_ENDPOINTS } from "@/lib/apiEndpoints";
import { type ListResult, asString, getProp, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type { Port, PortPayload } from "../types/catalogOps.types";

export interface GetPortsParams {
  page?: number;
  limit?: number;
  search?: string;
  /**
   * The customer-facing ports endpoint 500s on a lowercase `true` (Flow 03
   * F-04). The admin one isn't documented either way, so send the capitalised
   * Python-style literal the API collection uses.
   */
  isActive?: string;
}

function toPort(row: unknown): Port {
  return {
    id: asString(getProp(row, "id")),
    port_code: asString(getProp(row, "port_code")),
    port_name: asString(getProp(row, "port_name")),
    country: (getProp(row, "country") as string | null) ?? null,
    region: (getProp(row, "region") as string | null) ?? null,
    is_active: getProp(row, "is_active") !== false,
    created_at: asString(getProp(row, "created_at")),
    updated_at: asString(getProp(row, "updated_at")),
  };
}

export const portApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPorts: builder.query<ListResult<Port>, GetPortsParams | undefined>({
      query: (params) => ({
        url: PORT_ENDPOINTS.GET_PORTS,
        method: "GET",
        params: params
          ? {
              page: params.page,
              page_size: params.limit,
              search: params.search || undefined,
              is_active: params.isActive || undefined,
            }
          : undefined,
      }),
      transformResponse: (res: unknown) => unwrapList(res, toPort),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: "Ports" as const, id })),
              { type: "Ports", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Ports", id: "PARTIAL-LIST" }],
    }),

    createPort: builder.mutation<unknown, PortPayload>({
      query: (body) => ({ url: PORT_ENDPOINTS.ADD_PORT, method: "POST", body }),
      invalidatesTags: [{ type: "Ports", id: "PARTIAL-LIST" }],
    }),

    updatePort: builder.mutation<unknown, { id: string; body: PortPayload }>({
      query: ({ id, body }) => ({
        url: PORT_ENDPOINTS.UPDATE_PORT(id),
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Ports", id },
        { type: "Ports", id: "PARTIAL-LIST" },
      ],
    }),

    deletePort: builder.mutation<unknown, string>({
      query: (id) => ({ url: PORT_ENDPOINTS.DELETE_PORT(id), method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Ports", id },
        { type: "Ports", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetPortsQuery,
  useCreatePortMutation,
  useUpdatePortMutation,
  useDeletePortMutation,
} = portApi;
