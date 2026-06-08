import { baseApi } from "@/services/api/baseApi";
import { API_ROUTES } from "@/lib/constants";
import type { LoginRequest, LoginResponse } from "../types/auth";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: API_ROUTES.AUTH.LOGIN,
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: API_ROUTES.AUTH.LOGOUT,
        method: "GET",
      }),
    }),
    getMe: builder.query<LoginResponse["user"], void>({
      query: () => API_ROUTES.AUTH.ME,
    }),
  }),
  overrideExisting: false,
});

export const { useLoginMutation, useLogoutMutation, useGetMeQuery } = authApi;
