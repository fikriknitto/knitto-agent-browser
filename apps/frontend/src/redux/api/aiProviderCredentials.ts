import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiDataBaseUrl, getApiDataToken } from "@/lib/api-data/token";

export type ConnectionStatus = "untested" | "connected" | "failed";

export type AiProviderCredential = {
  id: number;
  userId: number;
  name: string;
  baseUrl: string;
  connectionStatus: ConnectionStatus;
  lastTestedAt: string | null;
  lastTestError: string | null;
  hasApiKey: boolean;
  createdAt: string;
  updatedAt: string;
};

type CreateCredentialBody = { name: string; baseUrl: string; apiKey: string };
type UpdateCredentialBody = {
  id: number;
  patch: { name?: string; baseUrl?: string; apiKey?: string };
};
type TestUnsavedBody = { baseUrl: string; apiKey: string };
type TestResult = { valid: boolean; message: string };

type Envelope<T> = { message?: string; result?: T };

export const aiProviderCredentialsService = createApi({
  reducerPath: "aiProviderCredentialsService",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiDataBaseUrl(),
    prepareHeaders(headers) {
      const token = getApiDataToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Accept", "application/json");
      return headers;
    },
  }),
  tagTypes: ["AiProviderCredential"],
  endpoints: (build) => ({
    listCredentials: build.query<AiProviderCredential[], void>({
      query: () => ({ url: "/ai-provider-credentials", method: "GET" }),
      transformResponse: (res: Envelope<AiProviderCredential[]>) => res.result ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map((c) => ({ type: "AiProviderCredential" as const, id: c.id })),
              { type: "AiProviderCredential" as const, id: "LIST" },
            ]
          : [{ type: "AiProviderCredential" as const, id: "LIST" }],
    }),
    createCredential: build.mutation<AiProviderCredential, CreateCredentialBody>({
      query: (body) => ({
        url: "/ai-provider-credentials",
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      }),
      transformResponse: (res: Envelope<AiProviderCredential>) => {
        if (!res.result) throw new Error(res.message || "Gagal membuat credential");
        return res.result;
      },
      invalidatesTags: [{ type: "AiProviderCredential", id: "LIST" }],
    }),
    updateCredential: build.mutation<AiProviderCredential, UpdateCredentialBody>({
      query: ({ id, patch }) => ({
        url: `/ai-provider-credentials/${id}`,
        method: "PATCH",
        body: patch,
        headers: { "Content-Type": "application/json" },
      }),
      transformResponse: (res: Envelope<AiProviderCredential>) => {
        if (!res.result) throw new Error(res.message || "Gagal update credential");
        return res.result;
      },
      invalidatesTags: (_result, _error, { id }) => [
        { type: "AiProviderCredential", id },
        { type: "AiProviderCredential", id: "LIST" },
      ],
    }),
    deleteCredential: build.mutation<void, number>({
      query: (id) => ({ url: `/ai-provider-credentials/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        { type: "AiProviderCredential", id },
        { type: "AiProviderCredential", id: "LIST" },
      ],
    }),
    testCredential: build.mutation<TestResult, TestUnsavedBody>({
      query: (body) => ({
        url: "/ai-provider-credentials/test",
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
      }),
      transformResponse: (res: Envelope<TestResult>) => {
        if (!res.result) throw new Error(res.message || "Test gagal");
        return res.result;
      },
    }),
    testSavedCredential: build.mutation<TestResult, number>({
      query: (id) => ({ url: `/ai-provider-credentials/${id}/test`, method: "POST" }),
      transformResponse: (res: Envelope<TestResult>) => {
        if (!res.result) throw new Error(res.message || "Test gagal");
        return res.result;
      },
      invalidatesTags: (_result, _error, id) => [
        { type: "AiProviderCredential", id },
        { type: "AiProviderCredential", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useListCredentialsQuery,
  useCreateCredentialMutation,
  useUpdateCredentialMutation,
  useDeleteCredentialMutation,
  useTestCredentialMutation,
  useTestSavedCredentialMutation,
} = aiProviderCredentialsService;
