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
  // dev 서버를 localhost가 아닌 도메인(LAN IP, 임시 터널 등)으로 접속할 때도
  // Next.js가 자산 요청을 차단하지 않도록 허용 — 모바일 실기기 테스트용.
  allowedDevOrigins: ['192.168.150.175', '*.trycloudflare.com', '*.loca.lt'],
};

export default nextConfig;
