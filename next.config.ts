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
  // public/market-view/index.html은 정적 파일이라 Next.js가 디렉터리 경로의
  // index.html을 자동으로 찾아주지 않는다 — /market-view(/)가 404나기 때문에
  // 명시적으로 리라이트해준다.
  async rewrites() {
    return [
      { source: '/market-view', destination: '/market-view/index.html' },
      { source: '/market-view/', destination: '/market-view/index.html' },
    ];
  },
  // dev 서버를 localhost가 아닌 도메인(LAN IP, 임시 터널 등)으로 접속할 때도
  // Next.js가 자산 요청을 차단하지 않도록 허용 — 모바일 실기기 테스트용.
  allowedDevOrigins: ['192.168.150.175', '*.trycloudflare.com', '*.loca.lt'],
};

export default nextConfig;
