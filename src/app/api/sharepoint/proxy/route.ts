// file: src/app/api/sharepoint/file/route.ts
import { NextResponse } from 'next/server'
import { downloadFileContent } from '@/services/sharepoint/graph'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    }

    // 🔽 Demanem el contingut real del fitxer a SharePoint
    const fileRes = await downloadFileContent(itemId)

    const arrayBuffer = await fileRes.arrayBuffer()
    const contentType =
      fileRes.headers.get('content-type') || 'application/octet-stream'
    const contentDisposition =
      fileRes.headers.get('content-disposition') || 'inline'

    // 🔥 RETURN → Obrim el fitxer públicament (com Google Drive)
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err: any) {
    console.error('❌ Error GET /api/sharepoint/file:', err)
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
