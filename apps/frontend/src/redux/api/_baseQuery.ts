import { env } from '@/lib/variables/env';
import { COOKIES_NAME } from '@/lib/variables/example';
import { fetchBaseQuery } from '@reduxjs/toolkit/dist/query/react';
import Cookies from 'js-cookie';
export const baseService = () => {
  return fetchBaseQuery({
    baseUrl: env.VITE_BASE_API_URL,
    prepareHeaders(headers) {
      const token = Cookies.get(COOKIES_NAME.Token);

      // if token exists in cookies, add it to headers
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      headers.set('Content-Type', 'application/json');
      return headers;
    },
    responseHandler: (response) => response.json(),
  });
};
