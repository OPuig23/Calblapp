const admin = require('firebase-admin')
const path = require('path')

const CONFIRM = String(process.env.BACKFILL_EVENTS_CONFIRM || '').toUpperCase()
if (CONFIRM !== 'YES') {
  console.error('Refusing to run. Set BACKFILL_EVENTS_CONFIRM=YES to proceed.')
  process.exit(1)
}

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json')
const serviceAccount = require(serviceAccountPath)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const db = admin.firestore()

const unaccent = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const norm = (s) => unaccent(s).toLowerCase().trim()
const dayKey = (iso) => String(iso || '').slice(0, 10)

const normalizeCode = (raw) => String(raw || '').trim().toUpperCase()
const isValidEventCode = (code) => Boolean(normalizeCode(code))

const extractCommercialName = (data) =>
  data?.Comercial ||
  data?.comercial ||
  data?.Commercial ||
  data?.Sales ||
  data?.ResponsableComercial ||
  data?.ComercialName ||
  data?.ComercialNom ||
  ''

async function lookupUidByName(name) {
  const rawName = String(name || '').trim()
  if (!rawName) return null

  let q = await db.collection('users').where('name', '==', rawName).limit(1).get()
  if (!q.empty) return q.docs[0].id

  q = await db.collection('personnel').where('name', '==', rawName).limit(1).get()
  if (!q.empty) {
    const personId = q.docs[0].id
    const userDoc = await db.collection('users').doc(personId).get()
    if (userDoc.exists) return userDoc.id
  }

  return null
}

async function lookupUidByNameLoose(name) {
  const rawName = String(name || '').trim()
  if (!rawName) return null

  const exact = await lookupUidByName(rawName)
  if (exact) return exact

  const target = norm(rawName)
  if (!target) return null

  const usersSnap = await db.collection('users').get()
  for (const doc of usersSnap.docs) {
    const data = doc.data() || {}
    const candidates = [data.name, data.fullName, data.displayName]
    for (const c of candidates) {
      if (norm(c) === target) return doc.id
    }
  }

  const personnelSnap = await db.collection('personnel').get()
  for (const doc of personnelSnap.docs) {
    const data = doc.data() || {}
    if (norm(data.name) === target) {
      const userDoc = await db.collection('users').doc(doc.id).get()
      if (userDoc.exists) return userDoc.id
    }
  }

  return null
}

function extractAssignedUsers(q) {
  const out = []
  const push = (u) => {
    if (!u) return
    if (!u.id && !u.name) return
    out.push({ id: u.id, name: u.name })
  }
  const pushArr = (arr) => {
    if (!Array.isArray(arr)) return
    arr.forEach((item) => {
      if (typeof item === 'string') push({ name: item })
      else push({ id: item?.id || item?.userId, name: item?.name })
    })
  }

  if (q?.responsableName) push({ name: q.responsableName })
  if (q?.responsable?.name) push({ name: q.responsable.name })
  pushArr(q?.responsables)
  pushArr(q?.treballadors)
  pushArr(q?.workers)
  pushArr(q?.conductors)

  return out
}

function isConfirmedQuadrant(data) {
  const status = String(data?.status ?? '').toLowerCase()
  const confirmedAtVal = data?.confirmedAt
  const confirmedAt =
    typeof confirmedAtVal === 'object' && confirmedAtVal?.toDate
      ? confirmedAtVal.toDate()
      : confirmedAtVal
  return (
    status === 'confirmed' ||
    Boolean(confirmedAt) ||
    Boolean(data?.confirmada) ||
    Boolean(data?.confirmed)
  )
}

async function lookupUidForAssigned(user) {
  const rawId = String(user?.id || '').trim()
  if (!rawId) return null

  const direct = await db.collection('users').doc(rawId).get()
  if (direct.exists) return rawId

  const q = await db.collection('users').where('userId', '==', rawId).limit(1).get()
  if (!q.empty) return q.docs[0].id

  return null
}

async function resolveUid(user) {
  const byId = await lookupUidForAssigned(user)
  if (byId) return byId
  return lookupUidByName(user?.name)
}

async function resolveUids(users) {
  if (!users.length) return []
  const raw = await Promise.all(users.map((u) => resolveUid(u)))
  return Array.from(new Set(raw.filter(Boolean)))
}

async function collectQuadrantAssigned(eventId, eventCode, dateKeyValue) {
  const quadrantCollections = [
    'quadrantsServeis',
    'quadrantsLogistica',
    'quadrantsCuina',
    'quadrantsProduccio',
    'quadrantsComercial',
  ]

  const users = []

  for (const coll of quadrantCollections) {
    const ref = db.collection(coll)
    const byId = await ref.where('eventId', '==', eventId).get().catch(() => null)
    const byCode = eventCode
      ? await ref.where('code', '==', eventCode).get().catch(() => null)
      : null
    const byDate = dateKeyValue
      ? await ref.where('startDate', '==', dateKeyValue).get().catch(() => null)
      : null

    const pushDocs = (snap) => {
      if (!snap || snap.empty) return
      snap.forEach((doc) => {
        const data = doc.data()
        if (!isConfirmedQuadrant(data)) return
        users.push(...extractAssignedUsers(data))
      })
    }

    pushDocs(byId)
    pushDocs(byCode)
    pushDocs(byDate)
  }

  return users
}

async function collectProductionUids() {
  const snap = await db.collection('users').get()
  const out = []
  snap.forEach((doc) => {
    const data = doc.data() || {}
    const dept = norm(data.department || data.departmentLower)
    if (dept === 'produccio') out.push(doc.id)
  })
  return out
}

async function ensureEventChatChannel(info) {
  const code = normalizeCode(info.code)
  if (!code) return null

  const commercialName = String(info.commercialName || '').trim()
  if (!commercialName) return null

  const channelId = `event_${info.id}`
  const channelRef = db.collection('channels').doc(channelId)
  const channelSnap = await channelRef.get()

  const endDateKey = dayKey(info.endDate || info.startDate)
  const endDate = endDateKey ? new Date(`${endDateKey}T00:00:00.000Z`) : null
  const visibleUntil = endDate ? endDate.getTime() + 24 * 60 * 60 * 1000 : null
  const status = visibleUntil && Date.now() > visibleUntil ? 'archived' : 'active'

  const commercialUid = await lookupUidByNameLoose(commercialName)
  const name = `Event - ${code} - ${info.name || info.id}`

  const baseData = {
    type: 'event',
    source: 'events',
    name,
    location: info.location || '',
    eventId: String(info.id),
    eventCode: code,
    eventTitle: info.name || '',
    eventStart: info.startDate || null,
    eventEnd: info.endDate || null,
    visibleUntil,
    status,
    responsibleUserId: commercialUid || null,
    responsibleUserName: commercialName || null,
  }

  const newOnlyData = channelSnap.exists
    ? {}
    : {
        lastMessagePreview: '',
        lastMessageAt: 0,
        createdAt: Date.now(),
        createdBy: 'system',
      }

  await channelRef.set({ ...baseData, ...newOnlyData }, { merge: true })

  const assigned = await collectQuadrantAssigned(info.id, code, endDateKey)
  const assignedUids = await resolveUids(assigned)
  const productionUids = await collectProductionUids()
  const allUids = new Set([...assignedUids, ...productionUids])
  if (commercialUid) allUids.add(commercialUid)

  if (allUids.size === 0) return { channelId }

  const existingSnap = await db
    .collection('channelMembers')
    .where('channelId', '==', channelId)
    .get()
  const existing = new Set(
    existingSnap.docs.map((d) => (d.data() || {}).userId).filter(Boolean)
  )

  const usersSnap = await db.collection('users').get()
  const userNameMap = new Map()
  usersSnap.forEach((doc) => {
    const data = doc.data() || {}
    if (data?.name) userNameMap.set(doc.id, String(data.name))
  })

  const batch = db.batch()
  const now = Date.now()
  for (const uid of allUids) {
    if (existing.has(uid)) continue
    const ref = db.collection('channelMembers').doc(`${channelId}_${uid}`)
    batch.set(ref, {
      channelId,
      userId: uid,
      userName: userNameMap.get(uid) || '',
      createdAt: now,
      updatedAt: now,
    })
  }
  await batch.commit()

  return { channelId }
}

async function fetchEventInfo(eventId) {
  const snap = await db.collection('stage_verd').doc(String(eventId)).get()
  if (!snap.exists) return null
  const data = snap.data() || {}

  const code =
    data.code ||
    data.C_digo ||
    data.codi ||
    data.Codi ||
    ''
  if (!isValidEventCode(code)) return null

  const name = data.NomEvent || data.eventName || data.name || ''
  const startDate = data.DataInici || data.startDate || ''
  const endDate = data.DataFi || data.endDate || startDate
  const location = data.Ubicacio || data.location || ''
  const commercialName = extractCommercialName(data)

  return {
    id: String(eventId),
    code: String(code),
    name: String(name),
    startDate: String(startDate),
    endDate: String(endDate),
    location: String(location),
    commercialName: String(commercialName || ''),
  }
}

async function main() {
  const pageSize = 300
  let lastDoc = null
  let scanned = 0
  let ensured = 0
  let skipped = 0

  while (true) {
    let query = db.collection('stage_verd').orderBy('__name__').limit(pageSize)
    if (lastDoc) query = query.startAfter(lastDoc)

    const snap = await query.get()
    if (snap.empty) break

    for (const doc of snap.docs) {
      scanned += 1
      const info = await fetchEventInfo(doc.id)
      if (!info) {
        skipped += 1
        continue
      }
      if (!String(info.commercialName || '').trim()) {
        skipped += 1
        continue
      }
      const result = await ensureEventChatChannel(info)
      if (result?.channelId) ensured += 1
      else skipped += 1
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    console.log(`Scanned ${scanned}... ensured ${ensured}, skipped ${skipped}`)
  }

  console.log(`Done. Scanned ${scanned}. Ensured ${ensured}. Skipped ${skipped}.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
