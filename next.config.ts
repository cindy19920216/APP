import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/boom-burst': ['./index-data/**/*'],
    '/api/news': ['./news/**/*'],
  },
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
