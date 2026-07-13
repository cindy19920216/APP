import { ImageResponse } from 'next/og';

export const size = { width: 192, height: 192 };
export const contentType = 'image/png';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a10',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 108,
            fontWeight: 700,
            color: '#1D9E75',
            fontFamily: 'sans-serif',
          }}
        >
          H
        </div>
      </div>
    ),
    { ...size }
  );
}
