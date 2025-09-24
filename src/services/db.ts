// src/services/db.ts
import { firestore as fb } from '@/lib/firebaseAdmin'
import { FieldValue } from 'firebase-admin/firestore'
import type { DocumentData } from 'firebase-admin/firestore'

// Re-exportem amb el nom que voleu usar a la resta del codi
export const firestore = fb

export interface QuadrantRecord {
  department: string
  weekStart: string
  weekEnd: string
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
  assignments: any[]
  codes: string[]
}

export async function saveQuadrant(record: QuadrantRecord): Promise<string> {
  const docRef = firestore.collection('quadrants').doc()
  await docRef.set({
    department: record.department,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    rows: record.rows,
    assignments: record.assignments,
    codes: Array.isArray(record.codes) ? record.codes : [],
    createdAt: FieldValue.serverTimestamp(),
  } as DocumentData)
  return docRef.id
}
