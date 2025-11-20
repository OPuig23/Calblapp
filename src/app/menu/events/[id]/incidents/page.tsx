// File: src/app/menu/events/[id]/incidents/page.tsx
import React from 'react'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

import Link from 'next/link'
import { format } from 'date-fns'
import { fetchGoogleEventById, GoogleEvent } from '@/services/googleCalendar'
import IncidentsFilter, { Incident } from './IncidentsFilter'

interface PageProps { params: { id: string } }

export default async function EventIncidentsPage({ params }: PageProps) {
  const eventId = params.id

  // 1) Obtenir dades de l'esdeveniment
  const ev: GoogleEvent | null = await fetchGoogleEventById(eventId)
  const summary = ev?.summary ?? ''
  const [beforeHash, codePart] = summary.split('#')
  const nameStr = beforeHash.trim()
  const code = codePart?.trim() || ''
  const rawDate = ev?.start.dateTime ?? ev?.start.date ?? ''
  const startDate = rawDate ? new Date(rawDate) : null
  const formattedDate = startDate && !isNaN(startDate.getTime())
    ? format(startDate, 'yyyy-MM-dd')
    : 'Data desconeguda'
  const location = ev?.location || ''

  // 2) Consulta Firestore al servidor
  const snap = await firestore
    .collection('incidents')
    .where('eventId', '==', eventId)
    .orderBy('createdAt', 'desc')
    .get()

  const incidents: Incident[] = snap.docs.map((doc) => {
  const d = doc.data() as Partial<Incident> & { createdAt?: any }
  const ts = d.createdAt
  const createdAt =
    ts && typeof ts.toDate === "function"
      ? ts.toDate().toISOString()
      : typeof ts === "string"
      ? ts
      : ""

  return {
    id: doc.id,
    department: d.department || "",
    importance: d.importance || "",
    description: d.description || "",
    createdBy: d.createdBy || "",
    createdAt,
    status: d.status || "",
  }
})


  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Submenu Títol i Botó tornar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidències</h1>
        <Link href="/menu/events" className="text-blue-600 hover:underline">
          ← Esdeveniments
        </Link>
      </div>

      {/* Info Esdeveniment */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 border-b">
        <h2 className="text-2xl font-semibold text-gray-800">{nameStr}</h2>

        <div className="mt-2 md:mt-0 flex flex-wrap items-center gap-2">
          <span className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-sm font-medium">
            {code}
          </span>
          <time
            dateTime={rawDate}
            className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-sm font-medium"
          >
            {formattedDate}
          </time>
          {location && (
            <span
              title={location}
              className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-sm font-medium truncate max-w-xs"
            >
              📍 {location}
            </span>
          )}
        </div>
      </div>

      {/* Filtre i llista */}
      <IncidentsFilter incidents={incidents} />
    </div>
  )
}
