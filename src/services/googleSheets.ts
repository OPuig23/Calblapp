// File: src/services/googleSheets.ts

import { google } from 'googleapis'

// ─────────────────────────────────────────────────────────────────────────────
// 1) Configuració d’autenticació JWT a partir de les variables d’entorn
const auth = new google.auth.JWT(
  process.env.FIREBASE_CLIENT_EMAIL!,
  undefined,
  process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
)

// ─────────────────────────────────────────────────────────────────────────────
// 2) Prova d’autorització immediata
auth.authorize((err, tokens) => {
  if (err) {
    console.error('[googleSheets] AUTH ERROR →', err)
  } else {
    console.log('[googleSheets] AUTH TOKENS →', {
      access_token: tokens?.access_token?.slice(0, 10) + '…',
      scope: tokens?.scope
    })
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 3) Cliente de Sheets
const sheets = google.sheets({ version: 'v4', auth })

// ─────────────────────────────────────────────────────────────────────────────
// 4) Llegim i comprovem l’ID de la fulla
const SPREADSHEET_ID = process.env.PERSONNEL_SPREADSHEET_ID!
if (!SPREADSHEET_ID) {
  throw new Error('La variable d’entorn PERSONNEL_SPREADSHEET_ID no està definida')
}
console.log('[googleSheets] USANT FULLA →', SPREADSHEET_ID)

const SHEET_NAME = 'APPersonal'

// ─────────────────────────────────────────────────────────────────────────────
// Opcional: prova d’accés a la metadata de la fulla
async function checkSheetMetadata() {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
    console.log('[googleSheets] SHEET METADATA →', meta.data.properties?.title)
  } catch (err) {
    console.error('[googleSheets] METADATA ERROR →', err)
  }
}
checkSheetMetadata()

// ─────────────────────────────────────────────────────────────────────────────
// 1) Llegeix i retorna totes les files de A:G amb cache per 60 s
let cache: { data: string[][]; ts: number } | null = null

export async function readPersonnelSheet(): Promise<string[][]> {
  const now = Date.now()
  if (cache && now - cache.ts < 60_000) {
    console.log('[googleSheets] Usant cache de personnelSheet')
    return cache.data
  }

  console.log('[googleSheets] Llegint directament de Google Sheets')
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`
  })
  const rows = resp.data.values ?? []

  cache = { data: rows, ts: now }
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Afegeix una nova fila al full (invalidem cache abans d’afegir)
export async function appendPersonnelRow(row: string[]) {
  console.log('[googleSheets] Append row →', row)
  // Invalida cache per forçar lectura fresca
  cache = null

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Actualitza una fila identificada per Id (invalidem cache abans d’actualitzar)
export async function updatePersonnelRow(
  id: string,
  updates: Partial<Record<'Id'|'Rol'|'Departament'|'Conductor'|'e-mail'|'Telefon'|'disponible', string>>
) {
  console.log('[googleSheets] Update row Id →', id, updates)
  cache = null

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:G`
  })
  const all = resp.data.values ?? []
  const headers = all[0]
  const rows = all.slice(1)

  const idx = rows.findIndex(r => r[0] === id)
  if (idx < 0) throw new Error(`Id "${id}" no trobat`)

  const original = rows[idx]
  const newRow = headers.map((col, i) => {
    const key = col as keyof typeof updates
    return updates[key] ?? original[i] ?? ''
  })

  const range = `${SHEET_NAME}!A${idx+2}:G${idx+2}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [newRow] }
  })

  const result: Record<string,string> = {}
  headers.forEach((col, i) => result[col] = newRow[i])
  return {
    id:          result.Id,
    role:        result.Rol,
    department:  result.Departament,
    isDriver:    result.Conductor.toLowerCase() === 'si',
    email:       result['e-mail'],
    phone:       result.Telefon,
    available:   result.disponible.toLowerCase() === 'si'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Esborra una fila identificada per Id (invalidem cache abans d’esborrar)
export async function deletePersonnelRow(id: string) {
  console.log('[googleSheets] Delete row Id →', id)
  cache = null

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:A`
  })
  const vals = resp.data.values ?? []
  const rowIdx = vals.findIndex((r,i) => i>0 && r[0] === id)
  if (rowIdx < 1) throw new Error(`Id ${id} no trobat`)

  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID })
  const sid = meta.data.sheets?.find(s => s.properties?.title === SHEET_NAME)?.properties?.sheetId
  if (sid == null) throw new Error(`No sheetId per ${SHEET_NAME}`)

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId: sid, dimension: 'ROWS', startIndex: rowIdx, endIndex: rowIdx+1 }
        }
      }]
    }
  })
}
