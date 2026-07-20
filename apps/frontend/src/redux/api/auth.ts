import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiDataBaseUrl, getApiDataToken, setApiDataToken } from "@/lib/api-data/token";

type LoginPayload = { username: string; password: string };
type LoginResult = { token: string; user: { id: number; username: string } };

type Envelope<T> = { message?: string; result?: T };

export const authService = createApi({
  reducerPath: "authService",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiDataBaseUrl(),
    prepareHeaders(headers) {
      const token = getApiDataToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Accept", "application/json");
      return headers;
    },
  }),
  endpoints: (build) => ({
    authLogin: build.mutation<LoginResult, LoginPayload>({
      query: (body) => ({
        url: "/auth/login",
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      }),
      transformResponse: (res: Envelope<LoginResult>) => {
        const result = res.result;
        if (!result?.token) throw new Error(res.message || "Login gagal: token kosong");
        setApiDataToken(result.token, result.user?.username);
        return result;
      },
    }),
    authMe: build.query<{ id: number; username: string }, void>({
      query: () => ({ url: "/auth/me", method: "GET" }),
      transformResponse: (res: Envelope<{ id: number; username: string }>) => {
        if (!res.result) throw new Error(res.message || "Unauthorized");
        return res.result;
      },
    }),
  }),
});

export const { useAuthLoginMutation, useAuthMeQuery } = authService;
