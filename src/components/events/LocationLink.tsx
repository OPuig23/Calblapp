// File: src/app/menu/events/components/LocationLink.tsx
'use client'

import React from 'react'

interface Props {
  location: string
}

export default function LocationLink({ location }: Props) {
  // Generem l'URL de cerca a Google Maps
  const mapUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`

  return (
    <a
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:underline"
    >
      📍 {location}
    </a>
  )
}
