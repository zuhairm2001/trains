import type { NextConfig } from "next";

const config: NextConfig = {
  turbopack: { root: import.meta.dirname },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  agentRules: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://127.0.0.1:3001"}/api/:path*` }];
  },
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
