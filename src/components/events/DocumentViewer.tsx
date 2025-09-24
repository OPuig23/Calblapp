//file: src/components/events/DocumentViewer.tsx
'use client'

import React from 'react'
export default function DocumentViewer({url,title}:{url:string,title:string}){
  return <div className="mt-4">
    <h3 className="font-semibold mb-2">{title}</h3>
    <iframe src={url} width="100%" height="400" className="border"/>
    <a href={url} target="_blank" rel="noreferrer" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">Descarrega PDF</a>
  </div>
}