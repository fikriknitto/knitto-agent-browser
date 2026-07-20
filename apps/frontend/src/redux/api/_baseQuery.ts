import { env } from "@/lib/variables/env";
import { COOKIES_NAME } from "@/lib/variables/example";
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Cookies from "js-cookie";

/** Worker backend (:3080) base query — for non-API-Data endpoints. */
export const baseService = () => {
  return fetchBaseQuery({
    baseUrl: env.VITE_BASE_API_URL,
    prepareHeaders(headers) {
      const token = Cookies.get(COOKIES_NAME.Token);
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      return headers;
    },
  });
};
