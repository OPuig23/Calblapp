export default function Head() {
  const v = 'v2'
  return (
    <>
      <link rel="manifest" href={`/manifest.json?${v}`} />
      <link rel="icon" href={`/favicon.ico?${v}`} />
      <link rel="shortcut icon" href={`/favicon.ico?${v}`} />
      <link rel="apple-touch-icon" sizes="180x180" href={`/icons/icon-256.png?${v}`} />
      <link rel="icon" type="image/png" sizes="192x192" href={`/icons/icon-192.png?${v}`} />
      <link rel="icon" type="image/png" sizes="256x256" href={`/icons/icon-256.png?${v}`} />
      <link rel="icon" type="image/png" sizes="384x384" href={`/icons/icon-384.png?${v}`} />
      <link rel="icon" type="image/png" sizes="512x512" href={`/icons/icon-512.png?${v}`} />
      <meta name="theme-color" content="#1e293b" />
    </>
  )
}
