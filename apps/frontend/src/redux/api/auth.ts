import { createApi } from '@reduxjs/toolkit/dist/query/react';
import { baseService } from './_baseQuery';

export const authService = createApi({
  reducerPath: 'authService',
  baseQuery: baseService(),
  endpoints: (build) => ({
    authLogin: build.mutation<IResponse<AuthApi.ResponseLogin>, AuthApi.PayloadLogin>({
      query: (payload) => ({
        method: 'POST',
        url: '/auth/login',
        body: payload,
      }),
    }),
    authMe: build.query<AuthApi.Me, void>({
      query: () => ({
        method: 'GET',
        url: '/auth/me',
      }),
      transformResponse: (res: IResponse<AuthApi.Me>) => res.result,
    }),
  }),
});

export const { useAuthLoginMutation, useAuthMeQuery } = authService;
