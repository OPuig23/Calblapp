//file:src\pages\api\personnel\available.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getFirestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';

// Helpers per comparar dates i hores
function combine(date: string, time: string) {
  return new Date(`${date}T${time || '00:00'}`);
}
function isOverlap(aStart, aEnd, bStart, bEnd) {
  return !(aEnd <= bStart || bEnd <= aStart);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getFirestore(getFirebaseAdmin());
  const { departament, startDate, endDate, startTime, endTime } = req.query as any;

  // Personal del departament
  const personnelSnap = await db.collection('personnel')
    .where('department', '==', departament)
    .get();
  const allPersonnel = personnelSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Quadrants solapats
  const quadrantsSnap = await db.collection('quadrants')
    .where('departament', '==', departament)
    .get();
  const allQuadrants = quadrantsSnap.docs.map(doc => doc.data());

  // Recull IDs ocupats per conflicte d’horari
  const unavailable = new Set<string>();
  const reqStart = combine(startDate, startTime);
  const reqEnd = combine(endDate, endTime);
  for (const q of allQuadrants) {
    const qStart = combine(q.startDate, q.startTime);
    const qEnd = combine(q.endDate, q.endTime);
    if (isOverlap(qStart, qEnd, reqStart, reqEnd)) {
      [q.responsable, q.conductor, ...(q.treballadors || [])]
        .filter(Boolean)
        .forEach(id => unavailable.add(id));
    }
  }

  // Filtra personal disponible
  const disponibles = allPersonnel.filter(p => !unavailable.has(p.id) && p.active !== false);

  // Classifica per rol/camps
  const responsables = disponibles.filter(p => (p.role === 'Responsable' || p.role === 'Cap Departament'));
  const conductors = disponibles.filter(p => !!p.isDriver);
  const treballadors = disponibles.filter(p => p.role === 'Treballador' || p.role === 'Personal');

  res.status(200).json({
    responsables,
    conductors,
    treballadors,
  });
}
