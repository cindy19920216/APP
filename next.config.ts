import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/boom-burst': ['./index-data/**/*'],
  },
};

export default nextConfig;
