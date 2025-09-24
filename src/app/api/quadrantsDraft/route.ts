// file: src/app/api/quadrantsDraft/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// ⚠️ Ja no importem cap JSON, fem servir variables d’entorn
const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount as any) })
}
const db = getFirestore()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const dept = searchParams.get('department')

  if (!from || !to) {
    return NextResponse.json(
      { error: '"from" i "to" són obligatoris' },
      { status: 400 }
    )
  }

  let q = db.collection('quadrantsDraft')
  if (dept) {
    q = q.where('department', '==', dept)
  }

  const snap = await q.get()

  const drafts = snap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
    .filter(d => {
      if (d.startDate < from) return false
      if (d.endDate > to) return false
      return true
    })
    .map(d => ({
      id: d.id,
      eventId: d.eventId,
      code: d.code,
      eventName: d.eventName,
      location: d.location,
      department: d.department,
      startDate: d.startDate,
      startTime: d.startTime,
      endDate: d.endDate,
      endTime: d.endTime,
      totalWorkers: d.totalWorkers,
      numDrivers: d.numDrivers,
      responsableId: d.responsableId || null,
      conductors: d.conductors || [],
      treballadors: d.treballadors || [],
      status: d.status || 'draft',
      updatedAt: d.updatedAt?.toDate?.().toISOString() || null,
    }))

  return NextResponse.json(drafts)
}
