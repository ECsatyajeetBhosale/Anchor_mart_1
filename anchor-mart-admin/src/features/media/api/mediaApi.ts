import { MEDIA_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { PresignedUrlPayload, PresignedUrlResponse } from "../types/media.types";

export const mediaApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Flow 26 API 1 — mint a presigned S3 POST for one object key.
     *
     * Writes nothing: it is a pure signing service, so there is no cache tag to
     * invalidate and no list to refresh.
     */
    createPresignedUrl: builder.mutation<PresignedUrlResponse, PresignedUrlPayload>({
      query: (body) => ({
        url: MEDIA_ENDPOINTS.PRESIGNED_URL,
        method: "POST",
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useCreatePresignedUrlMutation } = mediaApi;
