// src/lib/firestore/personnel.ts

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import serviceAccount from '@/data/service-account.json'

// Inicialització de Firebase Admin (només la primera vegada)
if (!initializeApp.length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

const db = getFirestore()

export interface Personnel {
  id: string
  name: string
  role: 'responsible' | 'driver' | 'soldier'
  driver?: {
    camioGran: boolean
    camioPetit: boolean
  }

  available: boolean
}

/**
 * Llegeix directament de Firestore la col·lecció 'personnel'
 * només els documents del departament i disponibles.
 */
export async function getPersonnelByDepartment(
  department: string
): Promise<Personnel[]> {
  const snap = await db
    .collection('personnel')
    .where('department', '==', department)
    .where('available', '==', true)
    .get()

  return snap.docs.map(doc => {
    const data = doc.data() as any
    // Normalitza el rol segons el camp Firestore
    let role: Personnel['role'] = data.role?.toLowerCase().startsWith('resp')
  ? 'responsible'
  : data.driver?.isDriver
    ? 'driver'
    : 'soldier'

return {
  id: doc.id,
  name: data.name || doc.id,
  role,
  driver: data.driver || { isDriver: false, camioGran: false, camioPetit: false },
  available: !!data.available,
}

  })
}
