import { API_ROUTES } from "@/lib/constants";
import { baseApi } from "@/lib/fetchUtils";
import type {
  LoginRequest,
  LoginResponse,
  RequestOtpRequest,
  RequestOtpResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "../types/auth.types";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (credentials) => ({
        url: API_ROUTES.AUTH.LOGIN,
        method: "POST",
        body: credentials,
      }),
    }),
    /** Step 1 — email in, OTP mailed out. */
    requestAdminOtp: builder.mutation<RequestOtpResponse, RequestOtpRequest>({
      query: (body) => ({
        url: API_ROUTES.AUTH.LOGIN_WITH_OTP,
        method: "POST",
        body,
      }),
    }),
    /** Step 2 — email + 4-digit OTP in, non-expiring token out. */
    verifyAdminOtp: builder.mutation<VerifyOtpResponse, VerifyOtpRequest>({
      query: (body) => ({
        url: API_ROUTES.AUTH.VERIFY_OTP,
        method: "POST",
        body,
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

export const {
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useRequestAdminOtpMutation,
  useVerifyAdminOtpMutation,
} = authApi;
