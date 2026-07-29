import { FAQ_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type {
  AddFaqPayload,
  Faq,
  FaqListResponse,
  FaqTypeListResponse,
  FaqTypePayload,
  UpdateFaqPayload,
} from "../types/settings.types";

export interface GetFaqsParams {
  page?: number;
  limit?: number;
  search?: string;
  /** Filter by type **name** (e.g. "General") — the value the list returns. */
  faqType?: string;
}

export const faqApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getFaqs: builder.query<FaqListResponse, GetFaqsParams | undefined>({
      query: (params) => ({
        url: FAQ_ENDPOINTS.GET_FAQS,
        method: "GET",
        params: params
          ? {
              page: params.page,
              page_size: params.limit,
              search: params.search || undefined,
              faq_type: params.faqType || undefined,
            }
          : undefined,
      }),
      providesTags: (result) =>
        result?.results
          ? [
              ...result.results.map(({ id }) => ({ type: "Faqs" as const, id })),
              { type: "Faqs", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Faqs", id: "PARTIAL-LIST" }],
    }),

    // Detail takes `?faq_id=` rather than a path segment, unlike every other
    // detail endpoint in this API.
    getFaq: builder.query<Faq, number>({
      query: (id) => ({ url: FAQ_ENDPOINTS.GET_FAQ, method: "GET", params: { faq_id: id } }),
      providesTags: (_result, _error, id) => [{ type: "Faqs", id }],
    }),

    createFaq: builder.mutation<unknown, AddFaqPayload>({
      query: (body) => ({ url: FAQ_ENDPOINTS.ADD_FAQ, method: "POST", body }),
      invalidatesTags: [{ type: "Faqs", id: "PARTIAL-LIST" }],
    }),

    updateFaq: builder.mutation<unknown, { id: number; body: UpdateFaqPayload }>({
      query: ({ id, body }) => ({ url: FAQ_ENDPOINTS.UPDATE_FAQ(id), method: "PATCH", body }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Faqs", id },
        { type: "Faqs", id: "PARTIAL-LIST" },
      ],
    }),

    deleteFaq: builder.mutation<void, number>({
      query: (id) => ({ url: FAQ_ENDPOINTS.DELETE_FAQ(id), method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "Faqs", id },
        { type: "Faqs", id: "PARTIAL-LIST" },
      ],
    }),

    getFaqTypes: builder.query<FaqTypeListResponse, void>({
      query: () => ({ url: FAQ_ENDPOINTS.GET_TYPES, method: "GET" }),
      providesTags: [{ type: "FaqTypes", id: "PARTIAL-LIST" }],
    }),

    createFaqType: builder.mutation<unknown, FaqTypePayload>({
      query: (body) => ({ url: FAQ_ENDPOINTS.ADD_TYPE, method: "POST", body }),
      invalidatesTags: [{ type: "FaqTypes", id: "PARTIAL-LIST" }],
    }),

    updateFaqType: builder.mutation<unknown, { id: number; body: FaqTypePayload }>({
      query: ({ id, body }) => ({ url: FAQ_ENDPOINTS.UPDATE_TYPE(id), method: "PATCH", body }),
      // A renamed type changes the `faq_type` string every FAQ row displays.
      invalidatesTags: [
        { type: "FaqTypes", id: "PARTIAL-LIST" },
        { type: "Faqs", id: "PARTIAL-LIST" },
      ],
    }),

    deleteFaqType: builder.mutation<void, number>({
      query: (id) => ({ url: FAQ_ENDPOINTS.DELETE_TYPE(id), method: "DELETE" }),
      invalidatesTags: [
        { type: "FaqTypes", id: "PARTIAL-LIST" },
        { type: "Faqs", id: "PARTIAL-LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFaqsQuery,
  useGetFaqQuery,
  useCreateFaqMutation,
  useUpdateFaqMutation,
  useDeleteFaqMutation,
  useGetFaqTypesQuery,
  useCreateFaqTypeMutation,
  useUpdateFaqTypeMutation,
  useDeleteFaqTypeMutation,
} = faqApi;
