import axios, { AxiosError, AxiosHeaders, InternalAxiosRequestConfig } from "axios";
import queryString from "query-string";

import { appInfo } from "../constants/appInfos";

const axiosClient = axios.create({
  baseURL: appInfo.BASE_URL,
  paramsSerializer: (params) => queryString.stringify(params),
});

axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.headers = AxiosHeaders.from({
      Accept: "application/json",
      ...config.headers,
    });

    return config;
  }
);

axiosClient.interceptors.response.use(
  (res) => {
    console.log("Response api", res.data ?? res.statusText);
    if (res.data && res.status === 200) {
      return res.data;
    }

    throw new Error("Unexpected API response");
  },
  (error: AxiosError) => {
    return Promise.reject(error.response?.data?.message ?? error.message);
  },
);

export default axiosClient;
