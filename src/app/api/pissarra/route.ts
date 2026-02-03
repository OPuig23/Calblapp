//filename: src/app/api/pissarra/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

const normalizeLabel = (value?: string | null) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const isPhaseActive = (status?: string | null) => {
  const normalized = normalizeLabel(status)
  if (!normalized) return true
  return ['confirmed', 'draft', 'pending', 'event'].includes(normalized)
}

const normalizeDay = (value?: string | null) => {
  if (!value) return null
  const cleaned = String(value).trim()
  const parsed = new Date(cleaned)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }
  const match = cleaned.match(/\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

/**
 * 🔹 API /api/pissarra
 * Retorna tots els esdeveniments amb codi ple (stage_verd)
 * dins del rang setmanal indicat (start–end)
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const start = url.searchParams.get('start')
    const end = url.searchParams.get('end')
    if (!start || !end)
      return NextResponse.json({ error: 'Falten paràmetres start i end' }, { status: 400 })

     const snap = await db.collection('stage_verd').get()
    const events: any[] = []

     for (const doc of snap.docs) {
       const d = doc.data() as any
       if (!d.code) continue

       // 🔹 Normalitzem la data d'inici
       const startDate =
         d.startDate ||
         d.date ||
         d.start ||
         d.DataInici || // ✅ camp real del teu Firestore
         d.dataInici ||
         d.DataInicio ||
         d.start_time ||
         null

      if (!startDate) continue


      // 🔹 Filtratge per rang setmanal
      if (startDate < start || startDate > end) continue

      // 🔹 Busquem responsable i fase a quadrantsServeis
      let responsableName: string | undefined
      let phaseLabel: string | undefined
      let phaseDate: string | undefined
      try {
        const quadrantsByEvent = await db
          .collection('quadrantsServeis')
          .where('eventId', '==', doc.id)
          .get()
        const quadrants =
          quadrantsByEvent.empty && d.code
            ? await db.collection('quadrantsServeis').where('code', '==', d.code).get()
            : quadrantsByEvent
        if (!quadrants.empty) {
          const candidates = quadrants.docs
            .map((doc) => doc.data() as any)
            .map((data) => {
              if (!isPhaseActive(data?.status)) return null
              const candidate =
                data?.phaseLabel ||
                data?.phaseType ||
                data?.phaseKey ||
                data?.phase ||
                data?.fase ||
                data?.phaseName ||
                data?.label ||
                ''

              const normalizedCandidate = normalizeLabel(candidate)
              if (!normalizedCandidate) return null

              const dateValue =
                data?.phaseDate ||
                data?.date ||
                data?.startDate ||
                data?.phaseStart ||
                data?.phase_day ||
                ''
              const phaseDay = normalizeDay(dateValue)

              return {
                normalizedCandidate,
                phaseLabel: String(candidate).trim(),
                phaseDate: phaseDay || (dateValue ? String(dateValue) : undefined),
                responsableName: data?.responsableName || data?.responsable?.name,
              }
            })
            .filter((info): info is { normalizedCandidate: string; phaseLabel: string; phaseDate?: string; responsableName?: string } => Boolean(info))
          const eventCandidate = candidates.find(
            (info) => info.normalizedCandidate === 'event'
          )
          const isMuntatge = (value: string) =>
            ['muntatge', 'montatge', 'montaje'].some((word) => value.includes(word))
          const muntatgeCandidate = candidates.find((info) =>
            isMuntatge(info.normalizedCandidate)
          )

          if (eventCandidate?.responsableName) {
            responsableName = eventCandidate.responsableName
          }
          if (muntatgeCandidate) {
            phaseLabel = muntatgeCandidate.phaseLabel
            phaseDate = muntatgeCandidate.phaseDate
          }
        }
      } catch {}

events.push({
  id: doc.id,
  code: d.code,
  LN: d.LN || d.ln || d.lineaNegoci || '',
  eventName: d.eventName || d.NomEvent || d.title || '',
  startDate,
  startTime: d.startTime || d.HoraInici || '',
  location: d.location || d.Ubicacio || '',
  pax: Number(d.pax || d.NumPax || 0),
  servei: d.servei || d.Servei || '',
  comercial: d.comercial || d.Comercial || '',
  responsableName,
  phaseLabel,
  phaseDate,
})

    }

    return NextResponse.json({ items: events }, { status: 200 })
  } catch (err) {
    console.error('❌ Error /api/pissarra', err)
    return NextResponse.json({ error: 'Error intern del servidor' }, { status: 500 })
  }
}
