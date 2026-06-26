import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/boom-burst': ['./index-data/**/*'],
    '/api/news': ['./news/**/*'],
  },
};

export default nextConfig;
