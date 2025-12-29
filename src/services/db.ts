// src/services/db.ts
import { firestoreAdmin as fb } from '@/lib/firebaseAdmin'
import { FieldValue, type DocumentData } from 'firebase-admin/firestore'

// Export dual: compatibilidad total
export const firestore = fb
export const db = fb

// Personal asignado dentro de un assignment
export interface AssignedStaff {
  role?: string
  name?: string
  isResponsible?: boolean
  isResponsable?: boolean // compatibilidad
}

// Tipus d’una assignació dins un quadrant (ampliado para reports)
export interface Assignment {
  workerId?: string
  name?: string
  role?: 'responsable' | 'conductor' | 'treballador' | string
  meetingPoint?: string
  vehicleId?: string
  code?: string
  businessLine?: string
  assignedStaff?: AssignedStaff[]
}

// Estructura principal del document “quadrants”
export interface QuadrantRecord {
  department: string
  weekStart: string | Date
  weekEnd: string | Date
  rows: Array<{
    id: string
    date: string
    name: string
    location: string
    startTime: string
    endTime: string
    staffCount: number
    driversCount: number
    responsableManual: string
  }>
  assignments: Assignment[]
  codes: string[]
}

// Guardar quadrant (ejemplo ya existente)
export async function saveQuadrant(record: QuadrantRecord): Promise<string> {
  const docRef = db.collection('quadrants').doc()

  const data: DocumentData = {
    department: record.department,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    rows: record.rows,
    assignments: record.assignments,
    codes: Array.isArray(record.codes) ? record.codes : [],
    createdAt: FieldValue.serverTimestamp(),
  }

  await docRef.set(data)
  return docRef.id
}
