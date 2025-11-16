// file: src/components/events/DocumentViewer.tsx
'use client'

import React from 'react'

interface Props {
  url: string
  title: string
}

export default function DocumentViewer({ url, title }: Props) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold mb-2">{title}</h3>

      {/* 🚫 Eliminat iframe (SharePoint no permet vista) */}

      <div className="p-4 text-center text-gray-500 border rounded-md bg-gray-50 mb-3">
        La previsualització no està disponible.
      </div>

      {/* ✔️ Obrir / Descarregar – funciona amb enllaços públics de SharePoint */}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
      >
        Obrir document
      </a>
    </div>
  )
}
