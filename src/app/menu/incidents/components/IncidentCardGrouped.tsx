// filename: src/app/menu/incidents/components/IncidentCardGrouped.tsx
'use client'

import React from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { MapPin, AlertTriangle, AlertCircle, CheckCircle, Tag } from 'lucide-react'
import { Incident } from '@/hooks/useIncidents'
import { Badge } from '@/components/ui/badge'

interface Props {
  eventCode: string
  incidents: Incident[]
}

// 🔹 Neteja el nom de l’esdeveniment
function cleanEventTitle(title: string) {
  if (!title) return ''
  let t = title.replace(/^\s*[A-Z]\s*-\s*/i, '').trim()
  const stopIndex = t.search(/#|C\d+|E\d+/i)
  if (stopIndex > -1) t = t.substring(0, stopIndex).trim()
  return t
}

// 🔹 Retalla ubicació abans del primer "|" o limita a 50 caràcters
function shortLocation(s?: string) {
  if (!s) return ''
  let result = s.split('|')[0].trim()

  // Si no hi ha "|", limitem a 50 caràcters màxim
  if (!s.includes('|') && result.length > 50) {
    result = result.substring(0, 52) + '...'
  }

  return result
}


// 🔹 Icones segons importància
function importanceIcon(level: string) {
  switch (level) {
    case 'Alta':
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    case 'Mitjana':
    case 'Mitja':
      return <AlertCircle className="h-4 w-4 text-orange-500" />
    default:
      return <CheckCircle className="h-4 w-4 text-blue-600" />
  }
}

export default function IncidentCardGrouped({ eventCode, incidents }: Props) {
  if (!incidents.length) return null
  const first = incidents[0]
  const totalIncidencies = incidents.length

  const mapsUrl = first.eventLocation
    ? `https://www.google.com/maps?q=${encodeURIComponent(first.eventLocation)}`
    : null

  return (
    <Card className="mb-4 rounded-2xl shadow-md border border-gray-200">
      {/* 🔹 Capçalera */}
      <CardHeader className="flex flex-row items-start justify-between px-2 py-1">
        {/* Esquerra: nom + ubicació */}
        <div className="flex flex-col gap-0.5 truncate">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {cleanEventTitle(first.eventTitle || 'Esdeveniment')}
          </h3>
          {first.eventLocation && (
            <a
              href={mapsUrl || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-base text-gray-500 hover:text-blue-600 truncate"
              onClick={(e) => e.stopPropagation()}
            >
              <MapPin className="h-4 w-4 opacity-70 shrink-0" />
              <span className="truncate">{shortLocation(first.eventLocation)}</span>
            </a>
          )}
        </div>

        {/* Dreta: badge + codi */}
        <div className="flex flex-col items-end text-right gap-1 ml-auto">
          <Badge className="bg-pink-100 text-pink-700 text-[15px] px-2 py-0.5">
            {totalIncidencies} incidència{totalIncidencies > 1 ? 's' : ''}
          </Badge>
          {eventCode && (
            <span className="text-base text-blue-600 flex items-center gap-1">
              <Tag className="w-4 h-4" />
              {eventCode}
            </span>
          )}
        </div>
      </CardHeader>

      {/* 🔹 Separador subtil */}
      <hr className="border-t border-gray-200 mx-2 my-1" />

      {/* 🔹 Cos: taula d’incidències */}
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700">
                <th className="py-2 px-2 text-left">Departament</th>
                <th className="py-2 px-2 text-left">Importància</th>
                <th className="py-2 px-2 text-left">Autor</th>
                <th className="py-2 px-2 text-left">Categoria</th>
                <th className="py-2 px-2 text-left">Descripció</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
  <tr key={inc.id} className="border-b last:border-0">
    <td className="py-2 px-2">{inc.department}</td>
    <td className="py-2 px-2 flex items-center gap-2">
      {importanceIcon(inc.importance)}
      <span>{inc.importance}</span>
    </td>
    <td className="py-2 px-2">{inc.createdBy}</td>
    <td className="py-2 px-2">{inc.category?.label || '-'}</td>
    <td className="py-2 px-2 font-medium text-gray-900">
      {inc.description}
    </td>
  </tr>
))}

            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
} 
