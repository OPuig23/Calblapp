// File: scripts/migratePersonnel.js
/**
 * Migració de Google Sheets ("APPersonal") → Firestore "personnel"
 * Executa: node scripts/migratePersonnel.js
 */

const path = require('path')

// 1) Load .env and .env.local from project root
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

console.log('→ PERSONNEL_SPREADSHEET_ID =', process.env.PERSONNEL_SPREADSHEET_ID)

const { google } = require('googleapis')
const admin      = require('firebase-admin')

// 2) Importa credencials de servei
// Assegura’t que tens serviceAccountKey.json a l’arrel
const serviceAccount = require('../serviceAccountKey.json')

// 3) Inicialitza Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})
const firestore = admin.firestore()

// 4) Inicialitza Google Sheets API
const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth: sheetsAuth })

async function main() {
  // 5) Recull l’ID del full
  const spreadsheetId = process.env.PERSONNEL_SPREADSHEET_ID
  if (!spreadsheetId) {
    console.error('💥 Defineix PERSONNEL_SPREADSHEET_ID a .env o .env.local')
    process.exit(1)
  }

  console.log('🔄 Llegint dades de Google Sheets…')
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: process.env.PERSONNEL_SHEET_NAME || 'APPersonal',
  })
  const rows = res.data.values
  if (!rows || rows.length < 2) {
    console.warn('⚠️ No hi ha dades al full de personal.')
    return
  }

  const [headers, ...dataRows] = rows
  const idx = headers.reduce((map, col, i) => {
    map[col.trim().toLowerCase()] = i
    return map
  }, {})

  console.log(`📦 Migrant ${dataRows.length} registres a Firestore…`)
  const batch = firestore.batch()
  const colRef = firestoreAdmin.collection('personnel')

  for (const r of dataRows) {
    const idRaw = r[idx['id']]?.trim()
    if (!idRaw) continue

    batch.set(
      colRef.doc(idRaw),
      {
        name:       r[idx['nom']]?.trim()       || '',
        role:       r[idx['rol']]?.trim()       || 'soldier',
        department: r[idx['departament']]?.trim()|| '',
        isDriver:   r[idx['conductor']]?.trim().toLowerCase() === 'si',
        email:      r[idx['e-mail']]?.trim()    || '',
        phone:      r[idx['telefon']]?.trim()   || '',
        available:  r[idx['disponible']]?.trim().toLowerCase() === 'si',
      },
      { merge: true }
    )
    console.log(`  • Migrat: ${idRaw}`)
  }

  await batch.commit()
  console.log('✅ Migració completada amb èxit!')
}

main().catch(err => {
  console.error('💥 Error durant la migració:', err)
  process.exit(1)
})
