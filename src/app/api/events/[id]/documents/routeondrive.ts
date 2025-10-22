//file: src/app/api/events/[id]/documents/routeondrive.ts
import { NextResponse } from 'next/server'
import { listEventFiles } from '@/services/onedrive'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const files = await listEventFiles(params.id)
    return NextResponse.json({ files })
  } catch (err: any) {
    console.error('❌ Error listant arxius:', err.message)
    return NextResponse.json({ error: 'Error carregant documents' }, { status: 500 })
  }
}

