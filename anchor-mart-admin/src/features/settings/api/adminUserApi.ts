import { ADMIN_USER_ENDPOINTS } from "@/lib/apiEndpoints";
import { baseApi } from "@/lib/fetchUtils";
import type { CreateUserPayload } from "../types/settings.types";

/**
 * User creation — one endpoint for every role, picked by the `role` field.
 *
 * Create is the **only** operation this endpoint exposes: there is no list,
 * detail, update or delete for users in general. Roles that have their own
 * screen (customer → Sailors, delivery_partner → Partners) can be managed
 * there afterwards; admins cannot be listed or removed at all.
 */
export const adminUserApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createUser: builder.mutation<unknown, CreateUserPayload>({
      query: (body) => ({ url: ADMIN_USER_ENDPOINTS.CREATE_USER, method: "POST", body }),
    }),
  }),
  overrideExisting: false,
});

export const { useCreateUserMutation } = adminUserApi;
