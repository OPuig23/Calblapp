// file: src/app/head.tsx
export default function Head() {
  return (
    <>
      <title>Cal Blay App</title>

      <meta name="description" content="WebApp operativa de Cal Blay" />
      <meta name="theme-color" content="#1e293b" />

      {/* Manifest PWA */}
      <link rel="manifest" href="/manifest.json" />

      {/* Favicons / Android */}
      <link rel="icon" href="/icons/icon-192.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512.png" />

      {/* iOS */}
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="Cal Blay" />
      <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    </>
  )
}
