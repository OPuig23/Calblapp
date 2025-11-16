// file: src/app/api/sharepoint/file/route.ts
import { NextResponse } from 'next/server'
import { getSiteAndDrive, getGraphToken } from '@/services/sharepoint/graph'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId required' }, { status: 400 })
    }

    // 1️⃣ Obtenim driveId
    const { driveId } = await getSiteAndDrive()
    const { access_token } = await getGraphToken()

    // 2️⃣ Recuperem el driveItem complet (per assegurar correct ID)
    const metaRes = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${itemId}`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    )

    if (!metaRes.ok) {
      const msg = await metaRes.text()
      console.error('❌ Meta error:', msg)
      return NextResponse.json(
        { error: 'File metadata not found', detail: msg },
        { status: 404 }
      )
    }

    const metaJson = await metaRes.json()

    // 3️⃣ Ara fem servir el driveItemId real
    const realId = metaJson.id

    // 4️⃣ Descarreguem el fitxer
    const fileRes = await fetch(
      `https://graph.microsoft.com/v1.0/drives/${driveId}/items/${realId}/content`,
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    )

    if (!fileRes.ok) {
      const msg = await fileRes.text()
      console.error('❌ Download error:', msg)
      return NextResponse.json(
        { error: 'Download failed', detail: msg },
        { status: 404 }
      )
    }

    const arrayBuffer = await fileRes.arrayBuffer()
    const contentType =
      fileRes.headers.get('content-type') || 'application/octet-stream'

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Content-Disposition': 'inline',
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
