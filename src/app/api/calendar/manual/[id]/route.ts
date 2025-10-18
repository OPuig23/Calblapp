import { NextResponse } from 'next/server'
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, doc, updateDoc, deleteDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
  authDomain: 'cal-blay-webapp.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID,
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0]
const db = getFirestore(app)

export async function PUT(req: Request, { params }: any) {
  const { id } = params
  const data = await req.json()
  try {
    await updateDoc(doc(db, 'manualEvents', id), { ...data, updatedAt: new Date().toISOString() })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Error actualitzant:', err)
    return NextResponse.json({ error: 'Error actualitzant' }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: any) {
  const { id } = params
  try {
    await deleteDoc(doc(db, 'manualEvents', id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('❌ Error eliminant:', err)
    return NextResponse.json({ error: 'Error eliminant' }, { status: 500 })
  }
}
