// scripts/seedUsers.js
// Càrrega inicial d'usuaris des de src/data/users.csv a Cloud Firestore
// Executa: node scripts/seedUsers.js

require('dotenv').config({ path: '.env.local' })

const fs    = require('fs')
const path  = require('path')
const Papa  = require('papaparse')
const admin = require('firebase-admin')

// 1) Inicialitza Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
})
const db = admin.firestore()

async function main() {
  // 2) Llegeix i neteja el CSV (elimina comentaris inline)
  const csvPath = path.join(process.cwd(), 'src', 'data', 'users.csv')
  const raw     = fs.readFileSync(csvPath, 'utf8')
  const cleaned = raw
    .split(/\r?\n/)
    .map(line => line.replace(/\/\/.*$/g, '').trim())
    .filter(line => line)
    .join('\n')

  const { data, errors } = Papa.parse(cleaned, {
    header: true,
    delimiter: ',',
    skipEmptyLines: 'greedy',
  })

  if (errors.length) {
    console.error('Errors parsing CSV:', errors)
    process.exit(1)
  }

  // 3) Prepara batch per Firestore
  const col   = db.collection('users')
  const batch = db.batch()
  console.log(`🌱 Sembrant ${data.length} usuaris a Firestore...`)

  data.forEach(row => {
    const ref = col.doc() // ID automàtica
    batch.set(ref, {
      name:       row.Nom,
      password:   row.Contrasenya,
      role:       row.Nivell,
      department: row.Departament,
    })
  })

  // 4) Executa batch
  await batch.commit()
  console.log('✅ Sembrat completat.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
