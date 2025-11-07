// ✅ file: src/app/api/sync/sap/route.ts
import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { firestoreAdmin } from '@/lib/firebaseAdmin'


/** 🔹 Converteix dates Excel a format ISO (aaaa-mm-dd) */
function excelDateToISO(serial: string | number): string {
  const num = Number(serial)
  if (isNaN(num)) return ''
  const utcDays = Math.floor(num - 25569)
  const utcValue = utcDays * 86400
  const dateInfo = new Date(utcValue * 1000)
  return dateInfo.toISOString().split('T')[0]
}

/** 🔹 Extreu la primera paraula del nom (fins al primer espai) */
function firstWord(str: string) {
  return (str || '').trim().split(/\s+/)[0].replace(/^"|"$/g, '')
}

/** 🔹 Neteja valors generals */
function cleanString(str: string) {
  return (str || '').replace(/^"|"$/g, '').trim()
}

/** 🔹 Llegeix i parseja un Excel (.xlsx) */
async function readXlsxFromUrl(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Error llegint XLSX (${res.status} ${res.statusText})`)
  const buffer = await res.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  return data as Record<string, any>[]
}

export async function POST() {
  try {
    const fileUrl = process.env.SHAREPOINT_PUBLIC_XLSX_URL
    if (!fileUrl) throw new Error('Falta SHAREPOINT_PUBLIC_XLSX_URL al .env.local')

    // 1️⃣ Llegeix i parseja l’Excel
    const rows = await readXlsxFromUrl(fileUrl)

    // 2️⃣ Simplifica les dades del fitxer
    const parsed = rows.map(r => ({
      NomEvent: firstWord(r['Nombre IC'] || ''),
      Comercial: cleanString(r['Último empl.dpto.ventas'] || '').toUpperCase(),
      DataInici: excelDateToISO(r['Fecha Inicio'] || ''),
      Projecte: cleanString(r['Proyecto'] || ''),
    }))

    // 3️⃣ Carreguem dades de Firestore
    const snap = await firestoreAdmin.collection('stage_verd').get()
    const allDocs = snap.docs.map(doc => ({
      id: doc.id,
      NomEvent: (doc.data().NomEvent || '').toString().trim().split(/\s+/)[0].toUpperCase(),
      Comercial: (doc.data().Comercial || '').toString().trim().toUpperCase(),
      DataInici: (doc.data().DataInici || '').toString().trim(),
    }))

    let updatedCount = 0
    const updatedDocs: string[] = []

    // 4️⃣ Recorrem l'Excel i busquem coincidències exactes 3/3
    for (const row of parsed) {
      const match = allDocs.find(d =>
        d.NomEvent === row.NomEvent &&
        d.Comercial === row.Comercial &&
        d.DataInici === row.DataInici
      )

      if (match && match.id) {
        await firestoreAdmin.collection('stage_verd').doc(match.id).update({
          Code: row.Projecte || ''
        })
        updatedCount++
        updatedDocs.push(match.id)
      }
    }

    // 5️⃣ Retornem resultat
    return NextResponse.json({
      ok: true,
      total: parsed.length,
      updated: updatedCount,
      updatedDocs: updatedDocs.slice(0, 10),
      message: `Actualitzats ${updatedCount} codis correctament.`,
    })
  } catch (err: any) {
    console.error('❌ Error sincronitzant SAP:', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}
