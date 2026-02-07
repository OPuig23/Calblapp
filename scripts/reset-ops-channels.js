const admin = require('firebase-admin')
const path = require('path')

const CONFIRM = String(process.env.RESET_OPS_CONFIRM || '').toUpperCase()
if (CONFIRM !== 'YES') {
  console.error('Refusing to run. Set RESET_OPS_CONFIRM=YES to proceed.')
  process.exit(1)
}

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const PILOT_LOCATIONS = [
  { source: 'finques', location: 'Clos la Plana' },
  { source: 'finques', location: 'Josep Massachs' },
  { source: 'finques', location: 'Mirador Events' },
  { source: 'finques', location: 'Font de la Canya' },
  { source: 'finques', location: 'La Masia' },
  { source: 'restaurants', location: 'Mirador' },
  { source: 'restaurants', location: 'Nautic' },
  { source: 'restaurants', location: 'La Masia' },
  { source: 'restaurants', location: 'Camp Nou' },
  { source: 'restaurants', location: 'Soliver' },
]

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

async function deleteCollection(name) {
  const col = db.collection(name)
  let total = 0
  // delete in batches
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(500).get()
    if (snap.empty) break
    const batch = db.batch()
    snap.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    total += snap.size
    console.log(`Deleted ${snap.size} from ${name} (total ${total})`)
  }
}

async function createChannels() {
  const now = Date.now()
  const batch = db.batch()
  for (const ch of PILOT_LOCATIONS) {
    const sourceLabel = ch.source === 'finques' ? 'Finques' : 'Restaurants'
    const name = `Ops · ${sourceLabel} · ${ch.location}`
    const docId = `${ch.source}_${slugify(ch.location)}`
    const docRef = db.collection('channels').doc(docId)
    batch.set(
      docRef,
      {
        type: 'manteniment',
        source: ch.source,
        location: ch.location,
        name,
        createdBy: 'system',
        createdAt: now,
        lastMessagePreview: '',
        lastMessageAt: 0,
        responsibleUserId: null,
        responsibleUserName: null,
      },
      { merge: true }
    )
  }
  await batch.commit()
  console.log('Seeded channels:', PILOT_LOCATIONS.length)
}

async function main() {
  console.log('Deleting messaging data...')
  await deleteCollection('messages')
  await deleteCollection('messageReads')
  await deleteCollection('channelMembers')
  await deleteCollection('channels')
  console.log('Seeding new channels...')
  await createChannels()
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
