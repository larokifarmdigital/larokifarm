import { ImageResponse } from 'next/og';

/**
 * Apple touch icon (180×180) generado en runtime desde el mismo diseño del logo.
 * Se sirve automáticamente en `<link rel="apple-touch-icon">`.
 */

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 40,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="120"
          height="120"
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
