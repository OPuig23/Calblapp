// scripts/upsertUser.js
// Upsert (create/update) a user in Firestore `users` collection.
//
// Usage:
//   node scripts/upsertUser.js --name "ADA" --password "..." --role observer --department Delsys
//
// Requires Firebase Admin env vars in `.env.local`:
//   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

require('dotenv').config({ path: '.env.local' })

const admin = require('firebase-admin')

const toBool = (v) => String(v).toLowerCase().trim() === 'true'

const normalizeFold = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i]
    if (!token.startsWith('--')) continue
    const key = token.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args[key] = true
    } else {
      args[key] = next
      i++
    }
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv)

  const name = String(args.name ?? '').trim()
  const password = String(args.password ?? '').trim()
  const role = String(args.role ?? '').trim()
  const department = String(args.department ?? '').trim()
  const email = args.email ? String(args.email).trim() : ''
  const phone = args.phone ? String(args.phone).trim() : ''
  const opsEventsConfigurable = toBool(args.opsEventsConfigurable ?? false)
  const opsEventsEnabled = toBool(args.opsEventsEnabled ?? false)

  if (!name || !password || !role || !department) {
    console.log('Missing required args.')
    console.log('Example:')
    console.log(
      '  node scripts/upsertUser.js --name "ADA" --password "..." --role observer --department Delsys'
    )
    process.exit(1)
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Missing Firebase env vars in .env.local (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).')
    process.exit(1)
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    })
  }

  const db = admin.firestore()
  const usersCol = db.collection('users')

  const nameFold = normalizeFold(name)
  const departmentLower = normalizeFold(department)

  let existing = await usersCol.where('nameFold', '==', nameFold).limit(1).get()
  if (existing.empty) {
    existing = await usersCol.where('name', '==', name).limit(1).get()
  }

  const now = Date.now()
  const basePayload = {
    name,
    nameFold,
    password,
    role,
    department,
    departmentLower,
    email: email || null,
    phone: phone || null,
    opsEventsConfigurable: Boolean(opsEventsConfigurable),
    opsEventsEnabled: Boolean(opsEventsEnabled),
    updatedAt: now,
  }

  if (!existing.empty) {
    const doc = existing.docs[0]
    const prev = doc.data() || {}
    const createdAt = typeof prev.createdAt === 'number' ? prev.createdAt : now

    await doc.ref.set(
      {
        ...basePayload,
        createdAt,
        userId: doc.id,
      },
      { merge: true }
    )
    console.log('✅ Updated user:', doc.id, name)
    return
  }

  const ref = await usersCol.add({
    ...basePayload,
    createdAt: now,
  })
  await ref.set({ userId: ref.id }, { merge: true })
  console.log('✅ Created user:', ref.id, name)
}

main().catch((err) => {
  console.error('❌ upsertUser failed:', err)
  process.exit(1)
})

