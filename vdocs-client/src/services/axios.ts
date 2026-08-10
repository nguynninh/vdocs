import axios from "axios";
import { getApiBaseUrl } from "./apiUrl";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
});

// Server responses are wrapped as { code, message, data, error }.
// Unwrap `data` so call sites can keep using `response.data` directly.
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    const message = error.response?.data?.error ?? error.response?.data?.message;
    if (message) {
      error.message = message;
    }
    return Promise.reject(error);
  }
);