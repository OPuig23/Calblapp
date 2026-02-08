import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'
import * as XLSX from 'xlsx'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TemplateSection = {
  location: string
  items: { label: string }[]
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'FUITES - Preventiu.xlsx')
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ templates: [] })
    }

    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.readFile(filePath, { cellDates: false })
    } catch {
      const buffer = fs.readFileSync(filePath)
      workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
    }
    const sheetName = workbook.SheetNames.includes('Hoja1')
      ? 'Hoja1'
      : workbook.SheetNames[0]
    const ws = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][]

    let currentLocation = ''
    const sectionsMap = new Map<string, TemplateSection>()

    rows.forEach((row, idx) => {
      if (idx < 3) return
      const rawLocation = String(row[0] || '').trim()
      const rawTask = String(row[3] || '').trim()
      if (rawLocation.toUpperCase().startsWith('OBSERV')) return
      if (rawLocation) currentLocation = rawLocation
      if (!currentLocation || !rawTask) return

      const section = sectionsMap.get(currentLocation) || {
        location: currentLocation,
        items: [],
      }
      section.items.push({ label: rawTask })
      sectionsMap.set(currentLocation, section)
    })

    const template = {
      id: 'template-fuites-gas',
      name: 'PREVENTIU FUITES DE GAS',
      source: 'FUITES - Preventiu.xlsx',
      periodicity: 'monthly',
      lastDone: null,
      location: 'Central alta temperatura',
      primaryOperator: 'Javi',
      backupOperator: 'Dani',
      sections: Array.from(sectionsMap.values()),
    }

    return NextResponse.json({ templates: [template] })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ templates: [], error: message }, { status: 500 })
  }
}
