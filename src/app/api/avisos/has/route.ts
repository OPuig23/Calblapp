import { NextRequest, NextResponse } from 'next/server'
import { firestoreAdmin as db } from '@/lib/firebaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const eventCode = searchParams.get('eventCode')

  if (!eventCode) {
    return NextResponse.json({ hasAvisos: false })
  }

  const snap = await db
    .collection('avisos')
    .where('eventCode', '==', eventCode)
    .limit(1)
    .get()

  return NextResponse.json({
    hasAvisos: !snap.empty,
  })
}
