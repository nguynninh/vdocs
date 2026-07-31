import type { NextConfig } from "next";

const apiProxyTarget = process.env.API_PROXY_TARGET ?? "http://192.168.206.51:8082";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.201.205"],
  async rewrites() {
    return [
      {
        source: "/identity/:path*",
        destination: `${apiProxyTarget}/identity/:path*`,
      },
    ];
  },
};

export default nextConfig;
