import { PUSH_ENDPOINTS } from "@/lib/apiEndpoints";
import { SERVER_SECRET_HEADER, baseApi } from "@/lib/fetchUtils";
import type { AddFcmTokenRequest, AddFcmTokenResponse } from "../types/push.types";

/**
 * Flow 21 §9 — device push registration.
 *
 * One mutation, and it is not cached or tagged: there is nothing to read back.
 * The backend keeps the device list; this panel has no screen that shows it and
 * no route to ask.
 */
export const pushApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Registers this browser's FCM token against the signed-in admin.
     *
     * Idempotent by design — the backend upserts on the token, and a token last
     * registered to a different user is reassigned to the caller. Both matter on
     * a shared machine: sign in as someone else and the device follows the new
     * session instead of quietly pushing that admin's alerts to the previous
     * one.
     *
     * Unlike almost everything else in this panel, the call carries
     * `server-secret-key`: this is a shared `/api/v1/` mount rather than an
     * exempt `/superadmin/` one, and without the header it 401s.
     */
    registerFcmToken: builder.mutation<AddFcmTokenResponse, AddFcmTokenRequest>({
      query: (body) => ({
        url: PUSH_ENDPOINTS.ADD_FCM_TOKEN,
        method: "POST",
        body,
        headers: { [SERVER_SECRET_HEADER]: "1" },
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useRegisterFcmTokenMutation } = pushApi;
