//file: src/app/api/quadrantsDraft/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '@/data/service-account.json.json';

if (!getApps().length) {
  initializeApp({ credential: cert(serviceAccount as any) });
}
const db = getFirestore();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to   = searchParams.get('to');
  const dept = searchParams.get('department');

  // must have from & to
  if (!from || !to) {
    return NextResponse.json({ error: '"from" i "to" són obligatoris' }, { status: 400 });
  }

  // 1) Base query
  let q = db.collection('quadrantsDraft');
  // 2) Optional department filter
  if (dept) {
    q = q.where('department', '==', dept);
  }
  // 3) Fetch all
  const snap = await q.get();

  // 4) In-memory date filter
  const drafts = snap.docs
    .map(doc => ({ id: doc.id, ...(doc.data() as any) }))
    .filter(d => {
      if (d.startDate < from) return false;
      if (d.endDate   > to)   return false;
      return true;
    })
    .map(d => ({
      id:             d.id,
      eventId:        d.eventId,
      code:           d.code,
      eventName:      d.eventName,
      location:       d.location,
      department:     d.department,
      startDate:      d.startDate,
      startTime:      d.startTime,
      endDate:        d.endDate,
      endTime:        d.endTime,
      totalWorkers:   d.totalWorkers,
      numDrivers:     d.numDrivers,
      responsableId:  d.responsableId || null,
      conductors:     d.conductors || [],
      treballadors:   d.treballadors || [],
      status:         d.status || 'draft',
      updatedAt:      d.updatedAt?.toDate?.().toISOString() || null
    }));

  return NextResponse.json(drafts);
}
