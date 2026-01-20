// src/app/api/personnel/available/route.ts
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

import {
  loadMinRestHours,
  hasMinRestByName,
  getBusyPersonnelIds,
  QuadrantDoc, // ✅ importem el tipus directament
} from '@/utils/personnelRest'

type AvailEntry = {
  id: string
  name: string
  role: string
  status: 'available' | 'conflict'
  reason: string
}

interface PersonnelDoc {
  name?: string
  role?: string
  department?: string
  isDriver?: boolean
  driver?: {
    isDriver?: boolean
    camioGran?: boolean
    camioPetit?: boolean
  }
  [key: string]: unknown
}

const RESPONSABLE_ROLES = new Set([
  'responsable',
  'cap departament',
  'capdepartament',
  'supervisor',
])
const TREBALLADOR_ROLES = new Set(['soldat', 'treballador', 'operari'])

const unaccent = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '')
const norm = (v?: string | null) => unaccent(String(v ?? '').trim().toLowerCase())

function uniqueById<T extends { id: string }>(arr: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of arr) {
    const nid = norm(item.id)
    if (!seen.has(nid)) {
      seen.add(nid)
      out.push(item)
    }
  }
  return out
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const deptParam = searchParams.get('department')
  const sd = searchParams.get('startDate')
  const st = searchParams.get('startTime')
  const ed = searchParams.get('endDate')
  const et = searchParams.get('endTime')

  if (!deptParam || !sd || !ed) {
    console.warn('[available] Missing params', { deptParam, sd, st, ed, et })
    return NextResponse.json(
      { responsables: [], conductors: [], treballadors: [], error: 'Missing parameters' },
      { status: 400 }
    )
  }

  try {
    const deptNorm = norm(deptParam)
    const newStart = new Date(`${sd}T${st || '00:00'}:00Z`)
    const newEnd = new Date(`${ed}T${et || '23:59'}:00Z`)
    const minRest = await loadMinRestHours(deptNorm)

    const busyIdsOrNames = await getBusyPersonnelIds(
      deptNorm, sd, ed, st || '00:00', et || '23:59'
    )
    const busySet = new Set(busyIdsOrNames.map(norm))

    console.log('[available] INPUT', {
      deptNorm, sd, st, ed, et,
      newStart: newStart.toISOString(),
      newEnd: newEnd.toISOString(),
      busyCount: busySet.size,
      minRest,
    })

// 🧩 Generem el nom correcte de la col·lecció segons el departament
function capitalizeDept(dept: string): string {
  const d = (dept || '').trim().toLowerCase()

  // Casos reconeguts a Cal Blay
  if (d.startsWith('serv')) return 'Serveis'
  if (d.startsWith('log')) return 'Logistica'
  if (d.startsWith('cui')) return 'Cuina'
  if (d.startsWith('prod')) return 'Produccio'

  // Si no encaixa amb cap, torna el valor capitalitzat
  return d.charAt(0).toUpperCase() + d.slice(1)
}

const colId = `quadrants${capitalizeDept(deptParam)}`
const allBusy: QuadrantDoc[] = []

try {
  // 🔹 Intentem llegir la col·lecció
  const snap = await db.collection(colId).where('startDate', '<=', ed).get()

  if (snap.empty) {
    console.warn(`[available] ⚠️ No s’han trobat documents a la col·lecció ${colId}`)
  } else {
    snap.docs.forEach((d) => allBusy.push(d.data() as QuadrantDoc))
    console.log(`[available] ✅ Trobats ${snap.docs.length} documents a ${colId}`)
  }
} catch (error) {
  console.error(`[available] ❌ Error accedint a la col·lecció ${colId}:`, error)
}


    const personnelSnap = await db.collection('personnel').get()
    const deptPersonnel = personnelSnap.docs.filter((doc) => {
      const d = doc.data() as PersonnelDoc
      return norm(d.department) === deptNorm
    })

    console.log('[available] Personnel found', deptPersonnel.length)

    const responsables: AvailEntry[] = []
    const soldats: AvailEntry[] = []
    const conductors: AvailEntry[] = []

    for (const doc of deptPersonnel) {
      const data = doc.data() as PersonnelDoc
      const roleNorm = norm(data.role)
      const pid = norm(doc.id)
      const pname = norm(data.name)

      const isBusy = busySet.has(pid) || busySet.has(pname)
      const availableByBusy = !isBusy
      if (isBusy) {
        console.log(`[available] SKIP busy: ${data.name} (id=${doc.id})`)
      }

      const availableByRest = hasMinRestByName(
        data.name || '',
        allBusy, // ✅ ahora coincide perfectamente con la firma
        newStart,
        newEnd,
        minRest
      )
      if (!availableByRest) {
        console.log(`[available] SKIP rest: ${data.name}`)
      }

      const isAvailable = availableByBusy && availableByRest
      const reason = isAvailable
        ? ''
        : !availableByBusy
        ? 'Ja assignat en aquest rang'
        : `No compleix descans mínim (${minRest}h)`

      const entry: AvailEntry = {
        id: doc.id,
        name: data.name || '',
        role: data.role || '',
        status: isAvailable ? 'available' : 'conflict',
        reason,
      }

      if (RESPONSABLE_ROLES.has(roleNorm)) {
        responsables.push(entry); soldats.push(entry)
      }
      if (TREBALLADOR_ROLES.has(roleNorm)) {
        soldats.push(entry)
      }
      const isDriver =
        data.isDriver === true ||
        data.driver?.isDriver === true ||
        data.driver?.camioGran === true ||
        data.driver?.camioPetit === true

      if (isDriver) {
        conductors.push(entry)
      }
    }

    const responsablesClean = uniqueById(responsables).sort((a, b) =>
      a.status === b.status ? a.name.localeCompare(b.name) :
      a.status === 'available' ? -1 : 1
    )
    const conductorsClean = uniqueById(conductors).sort((a, b) =>
      a.status === b.status ? a.name.localeCompare(b.name) :
      a.status === 'available' ? -1 : 1
    )
    const treballadors = uniqueById(soldats).sort((a, b) =>
      a.status === b.status ? a.name.localeCompare(b.name) :
      a.status === 'available' ? -1 : 1
    )

    console.log('[available] OUTPUT', {
      responsables: responsablesClean.length,
      conductors: conductorsClean.length,
      treballadors: treballadors.length,
    })

    console.log('[available] FINAL', {
      responsables: responsablesClean.map(p => `${p.name} (${p.status})`),
      conductors: conductorsClean.map(p => `${p.name} (${p.status})`),
      treballadors: treballadors.map(p => `${p.name} (${p.status})`),
    })

    // 🚫 Excloem els que estan en conflict
    return NextResponse.json({
      responsables: responsablesClean.filter(p => p.status === 'available'),
      conductors: conductorsClean.filter(p => p.status === 'available'),
      treballadors: treballadors.filter(p => p.status === 'available'),
    })

  } catch (err: unknown) {
    console.error('Error GET /api/personnel/available:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
