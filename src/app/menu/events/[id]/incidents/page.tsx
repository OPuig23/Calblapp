// File: src/app/menu/events/[id]/incidents/page.tsx
import React from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'
import IncidentsFilter, { Incident } from './IncidentsFilter'

interface PageProps {
  params: { id: string }
}

// Petit helper per netejar ubicació igual que a /api/events/list
function cleanLocation(raw: string | undefined): string {
  const v = raw || ''
  return v
    .split('(')[0] // treu codi entre parèntesis
    .split('/')[0] // treu barres
    .replace(/^ZZRestaurant\s*/i, '') // elimina “ZZRestaurant” inicial
    .replace(/^ZZ\s*/i, '') // elimina “ZZ” sol
    .trim()
}

export default async function EventIncidentsPage({ params }: PageProps) {
  const eventId = params.id

  /* 1️⃣ Llegim l'esdeveniment de Firestore (stage_verd) */
  const eventDoc = await db.collection('stage_verd').doc(eventId).get()

  if (!eventDoc.exists) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Incidències</h1>
          <Link href="/menu/events" className="text-blue-600 hover:underline">
            ← Esdeveniments
          </Link>
        </div>

        <p className="mt-6 text-red-600">
          No s&apos;ha trobat l&apos;esdeveniment a la col·lecció
          {' '}
          <code>stage_verd</code>.
        </p>
      </div>
    )
  }

  const ev = eventDoc.data() as any

  // 🔹 Nom de l’esdeveniment: només fins al primer “/” (mateix criteri que events/list)
  const rawSummary: string = ev.NomEvent || '(Sense títol)'
  const nameStr: string = rawSummary.split('/')[0].trim()

  // 🔹 Codi de l’esdeveniment (mateix camp que uses a events/list)
  const code: string = (ev.C_digo || '').toString()

  // 🔹 Data inici
  const rawDate: string = ev.DataInici || ''
  const startDate = rawDate ? new Date(rawDate) : null
  const formattedDate =
    startDate && !isNaN(startDate.getTime())
      ? format(startDate, 'yyyy-MM-dd')
      : 'Data desconeguda'

  // 🔹 Ubicació (neteja igual que a /api/events/list)
  const location: string = cleanLocation(ev.Ubicacio)

  // 🔹 LN, Servei, Pax
  const ln: string = ev.LN || 'Altres'
  const serviceType: string = ev.Servei || ''
  const pax: number | string = ev.NumPax ?? '-'

  /* 2️⃣ Llegim les incidències relacionades (col·lecció incidents) */
  const snap = await db
    .collection('incidents')
    .where('eventId', '==', eventId)
    .orderBy('createdAt', 'desc')
    .get()

  const incidents: Incident[] = snap.docs.map((doc) => {
    const d = doc.data() as Partial<Incident> & { createdAt?: any }
    const ts = d.createdAt

    const createdAt: string =
      ts && typeof ts.toDate === 'function'
        ? ts.toDate().toISOString()
        : typeof ts === 'string'
        ? ts
        : ''

    return {
      id: doc.id,
      department: d.department || '',
      importance: d.importance || '',
      description: d.description || '',
      createdBy: d.createdBy || '',
      createdAt,
      status: d.status || '',
    }
  })

  /* 3️⃣ Vista */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Títol + tornar */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Incidències</h1>
        <Link href="/menu/events" className="text-blue-600 hover:underline">
          ← Esdeveniments
        </Link>
      </div>

      {/* Info Esdeveniment (coherent amb events/list) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 border-b gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-gray-800">
            {nameStr}
          </h2>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
            {ln && (
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                LN: {ln}
              </span>
            )}
            {serviceType && (
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                Servei: {serviceType}
              </span>
            )}
            <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
              Pax: {pax}
            </span>
            {location && (
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-lg">
                📍 {location}
              </span>
            )}
          </div>
        </div>

        <div className="mt-1 md:mt-0 flex flex-wrap items-center gap-2">
          {code && (
            <span className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-sm font-medium">
              {code}
            </span>
          )}

          <time
            dateTime={rawDate}
            className="bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-sm font-medium"
          >
            {formattedDate}
          </time>
        </div>
      </div>

      {/* Filtre + taula d'incidències d'aquest esdeveniment */}
      <IncidentsFilter incidents={incidents} />
    </div>
  )
}
