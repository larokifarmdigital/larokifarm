import { ImageResponse } from 'next/og';

/**
 * Favicon dinámico (32×32) — se sirve automáticamente en `<link rel="icon">`.
 * Next detecta el archivo `icon.tsx` en `app/` y lo genera en build.
 */

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#0d9488',
          borderRadius: 6,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
