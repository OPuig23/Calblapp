// file: src/components/events/DocumentViewer.tsx
'use client'

import React from 'react'

interface Props {
  url: string
  title: string
}

export default function DocumentViewer({ url, title }: Props) {
  const isSharePoint = url.includes('calblayrest.sharepoint.com')
  const iframeSrc = isSharePoint
    ? `/api/sharepoint/proxy?fileUrl=${encodeURIComponent(url)}`
    : url

  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">{title}</h3>

      <div className="border rounded-md overflow-hidden mb-3">
        <iframe
          src={iframeSrc}
          width="100%"
          height={500}
          className="w-full"
        />
      </div>

      {/* 👇 Per descàrrega, podem mantenir la URL original de SharePoint */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
      >
        Descarrega PDF
      </a>
    </div>
  )
}
