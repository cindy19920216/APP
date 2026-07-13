import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Herencia — 가족 투자 자산 통합 관리 대시보드',
    short_name: 'Herencia',
    description: '가족의 자산, 하나의 미래',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0a10',
    theme_color: '#0f1117',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
