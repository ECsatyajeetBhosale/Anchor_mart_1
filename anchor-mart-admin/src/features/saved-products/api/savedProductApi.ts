import { SAVED_PRODUCT_ENDPOINTS } from "@/lib/apiEndpoints";
import { asString, unwrapList } from "@/lib/apiResponse";
import { baseApi } from "@/lib/fetchUtils";
import type {
  GetSavedProductsParams,
  SavedProduct,
  SavedProductApi,
  SavedProductListResult,
} from "../types/savedProduct.types";

const FALLBACK = "-";

function dash(value: unknown): string {
  const s = asString(value).trim();
  return s === "" ? FALLBACK : s;
}

function toSavedProduct(row: SavedProductApi): SavedProduct {
  return {
    id: asString(row.id),
    userName: dash(row.user),
    productId: asString(row.product),
    productName: dash(row.product_name),
    // Kept as "" rather than "-" so the avatar cell can decide between an image
    // and an initial instead of rendering a dash as a src.
    image: asString(row.image).trim(),
    createdAt: dash(row.created_at),
    updatedAt: dash(row.updated_at),
  };
}

export const savedProductApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSavedProducts: builder.query<SavedProductListResult, GetSavedProductsParams>({
      query: (params) => ({
        url: SAVED_PRODUCT_ENDPOINTS.GET_SAVED_PRODUCTS,
        method: "GET",
        // Blanks are omitted: a malformed `user`/`product` or an unrecognised
        // `is_active` is a 400, not an ignored filter.
        params: {
          page: params.page,
          page_size: params.limit,
          search: params.search || undefined,
          is_active: params.isActive || undefined,
          user: params.user || undefined,
          product: params.product || undefined,
        },
      }),
      transformResponse: (res: unknown): SavedProductListResult => {
        const { count, items } = unwrapList<SavedProduct>(res, (row) =>
          toSavedProduct(row as SavedProductApi),
        );
        return { count, items };
      },
      providesTags: [{ type: "SavedProducts", id: "PARTIAL-LIST" }],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSavedProductsQuery } = savedProductApi;
